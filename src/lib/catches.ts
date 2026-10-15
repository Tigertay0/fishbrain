import SunCalc from 'suncalc'
import { DAY, fetchJson, HOUR } from './cache'
import { db, newId, nowIso, type Catch, type Conditions, type Privacy } from './db'
import { cellKey, coarsen, type LngLat } from './geo'
import { getSettings } from './settings'
import { GAUGE_CELL_DEG, loadGaugeCell, loadGaugeName, nearestGauges } from './usgs'
import { forecastUrl, hourAt, loadForecast, parseForecast, pressureTrend, type Forecast } from './weather'

export type CatchDraft = Omit<Catch, 'id' | 'createdAt' | 'updatedAt' | 'conditions' | 'lat' | 'lon'> & {
  point?: LngLat
}

/**
 * Applies the privacy level to a point. "hidden" stores no coordinates at all;
 * "water" keeps a point rounded to about 1 km so the logbook map still works
 * without pinning the exact run.
 */
export function applyPrivacy(point: LngLat | undefined, privacy: Privacy): LngLat | undefined {
  if (!point || privacy === 'hidden') return undefined
  if (privacy === 'water') return coarsen(point, 1)
  return { lat: round6(point.lat), lon: round6(point.lon) }
}

/** Saves immediately (works offline), then attaches conditions in the background. */
export async function saveCatch(draft: CatchDraft, existing?: Catch): Promise<string> {
  const { point, ...rest } = draft
  const stored = applyPrivacy(point, draft.privacy)
  const now = nowIso()
  const id = existing?.id ?? newId()
  const caughtMs = Date.parse(draft.caughtAt)
  const moon = SunCalc.getMoonIllumination(new Date(caughtMs))
  const record: Catch = {
    ...rest,
    id,
    lat: stored?.lat,
    lon: stored?.lon,
    // Keep conditions on edit unless the time or place moved.
    conditions:
      existing && existing.caughtAt === draft.caughtAt && sameish(existing, stored)
        ? existing.conditions
        : { moonPhase: round2(moon.phase), moonFraction: round2(moon.fraction), pending: point != null },
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  await db.catches.put(record)
  if (record.conditions?.pending && point) {
    // The exact point is used for the lookup even when it isn't stored.
    void attachConditions(id, point, caughtMs)
  }
  void requestPersistence()
  return id
}

export async function deleteCatch(c: Catch): Promise<void> {
  await db.transaction('rw', db.catches, db.photos, async () => {
    await db.catches.delete(c.id)
    if (c.photoId) await db.photos.delete(c.photoId)
  })
}

async function attachConditions(id: string, point: LngLat, at: number): Promise<void> {
  try {
    const cond = await lookupConditions(point, at)
    await db.catches.update(id, (c) => {
      c.conditions = { ...c.conditions, ...cond, pending: false }
    })
  } catch {
    // Offline or rate limited: stays pending; backfillPending() retries later.
  }
}

/** The forecast has no hour near the catch: unlike a network error, trying again won't help. */
class NoWeatherError extends Error {}

export async function lookupConditions(point: LngLat, at: number, forecast?: Forecast): Promise<Conditions> {
  const out: Conditions = {}
  const f = forecast ?? (Date.now() - at < DAY ? (await loadForecast(point.lat, point.lon)).data : undefined)
  const h = f && hourAt(f, at)
  if (!h) throw new NoWeatherError('No weather for that time')
  out.airTempC = h.tempC
  out.pressureHpa = Math.round(h.pressure * 10) / 10
  out.cloudPct = h.cloud
  out.windKmh = h.windKmh
  out.weatherCode = h.code
  const p = pressureTrend(f, at)
  if (p) {
    out.pressureTrend = p.trend
    out.pressureDelta3h = p.delta3h
  }
  // Live gauge readings only describe the catch if it happened in the last few hours.
  if (Date.now() - at < 6 * HOUR) {
    try {
      const { usgsApiKey } = await getSettings()
      const cell = await loadGaugeCell(cellKey(point.lat, point.lon, GAUGE_CELL_DEG), usgsApiKey)
      const near = nearestGauges(point, cell.data, 15, 1)[0]
      if (near) {
        out.gaugeId = near.gauge.id
        out.gaugeKm = Math.round(near.km * 10) / 10
        out.flowCfs = near.gauge.flowCfs
        out.waterTempC = near.gauge.tempC
        out.gaugeName = await loadGaugeName(near.gauge.id, usgsApiKey).catch(() => undefined)
      }
    } catch {
      // gauges are a bonus; weather alone is fine
    }
  }
  return out
}

/** Retries catches saved offline. Weather up to 7 days back comes from Open-Meteo's past_days. */
export async function backfillPending(): Promise<number> {
  if (!navigator.onLine) return 0
  const pending = await db.catches.filter((c) => c.conditions?.pending === true).toArray()
  let done = 0
  for (const c of pending) {
    const at = Date.parse(c.caughtAt)
    if (c.lat == null || c.lon == null || Date.now() - at > 7 * DAY) {
      await db.catches.update(c.id, (x) => {
        if (x.conditions) x.conditions.pending = false
      })
      continue
    }
    try {
      const raw = await fetchJson<Parameters<typeof parseForecast>[0]>(
        forecastUrl(c.lat, c.lon).replace('past_days=1', 'past_days=7').replace('forecast_days=7', 'forecast_days=1'),
      )
      const cond = await lookupConditions({ lat: c.lat, lon: c.lon }, at, parseForecast(raw))
      await db.catches.update(c.id, (x) => {
        x.conditions = { ...x.conditions, ...cond, pending: false }
      })
      done++
    } catch (e) {
      if (!(e instanceof NoWeatherError)) break // still offline or limited; try again next time
      // Retrying can't add an hour the forecast doesn't have, and it would hold up every catch behind it.
      await db.catches.update(c.id, (x) => {
        if (x.conditions) x.conditions.pending = false
      })
    }
  }
  return done
}

/** Asks the browser not to evict our IndexedDB under storage pressure. */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

function sameish(c: Catch, p: LngLat | undefined): boolean {
  if (!p) return c.lat == null
  return c.lat != null && c.lon != null && Math.abs(c.lat - p.lat) < 1e-4 && Math.abs(c.lon - p.lon) < 1e-4
}
const round6 = (n: number) => Math.round(n * 1e6) / 1e6
const round2 = (n: number) => Math.round(n * 100) / 100
