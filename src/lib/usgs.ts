// USGS Water Data OGC API v1. Keyless: 50 requests/hour/IP, so everything is cached hard.
// https://api.waterdata.usgs.gov/docs/ogcapi/
import { cachedFetch, DAY, fetchJson, MINUTE } from './cache'
import { bboxParam, cellBBox, distanceKm, type LngLat } from './geo'

export const USGS_BASE = 'https://api.waterdata.usgs.gov/ogcapi/v1/collections'
export const GAUGE_CELL_DEG = 1
/** Gauges load at this zoom and closer. */
export const GAUGE_MIN_ZOOM = 8
/** A series with nothing newer than this is a retired or broken gauge. */
export const STALE_MS = 3 * DAY

const P_FLOW = '00060' // discharge, ft³/s
const P_STAGE = '00065' // gage height, ft
const P_TEMP = '00010' // water temperature, °C

export type Gauge = {
  id: string // e.g. USGS-05386050
  lat: number
  lon: number
  flowCfs?: number
  stageFt?: number
  tempC?: number
  observedAt?: string // newest reading among the series
}

type Feature = {
  geometry: { coordinates: [number, number] } | null
  properties: Record<string, unknown>
}
type FeatureCollection = { features: Feature[]; links?: { rel: string; href: string }[] }

const withKey = (url: string, apiKey: string) => (apiKey ? `${url}&api_key=${encodeURIComponent(apiKey)}` : url)

/** Turns latest-continuous features into one Gauge per site, dropping dead and empty series. */
export function parseLatest(fc: FeatureCollection, now = Date.now()): Gauge[] {
  const sites = new Map<string, Gauge & { _t: Record<string, number> }>()
  for (const f of fc.features) {
    const p = f.properties
    const id = String(p.monitoring_location_id ?? '')
    const code = String(p.parameter_code ?? '')
    const time = typeof p.time === 'string' ? Date.parse(p.time) : NaN
    const value = p.value == null ? NaN : Number(p.value)
    if (!id || !f.geometry || !Number.isFinite(value) || !Number.isFinite(time)) continue
    if (now - time > STALE_MS) continue
    if (value <= -999) continue // sentinel for "no data"
    let g = sites.get(id)
    if (!g) {
      const [lon, lat] = f.geometry.coordinates
      g = { id, lat, lon, _t: {} }
      sites.set(id, g)
    }
    // A site can have several series per parameter (two sensors); keep the newest.
    if ((g._t[code] ?? -Infinity) >= time) continue
    g._t[code] = time
    if (code === P_FLOW) g.flowCfs = value
    else if (code === P_STAGE) g.stageFt = value
    else if (code === P_TEMP) g.tempC = value
    else continue
    if (!g.observedAt || Date.parse(g.observedAt) < time) g.observedAt = new Date(time).toISOString()
  }
  return [...sites.values()]
    .filter((g) => g.flowCfs != null || g.stageFt != null || g.tempC != null)
    .map(({ _t, ...g }) => g)
}

async function fetchAllPages(url: string, maxPages: number): Promise<FeatureCollection> {
  const features: Feature[] = []
  let next: string | undefined = url
  for (let i = 0; next && i < maxPages; i++) {
    const page: FeatureCollection = await fetchJson<FeatureCollection>(next)
    features.push(...page.features)
    next = page.links?.find((l) => l.rel === 'next')?.href
  }
  return { features }
}

/** Latest readings for every active gauge in a 1° cell. One request per cell per 20 minutes. */
export function loadGaugeCell(cell: string, apiKey: string) {
  return cachedFetch(`usgs:cell:${cell}`, 20 * MINUTE, async () => {
    const url =
      `${USGS_BASE}/latest-continuous/items?f=json&bbox=${bboxParam(cellBBox(cell))}` +
      `&parameter_code=${P_FLOW},${P_STAGE},${P_TEMP}` +
      `&properties=monitoring_location_id,parameter_code,time,value&limit=5000`
    return parseLatest(await fetchAllPages(withKey(url, apiKey), 2))
  })
}

/** A gauge's name. Fetched only when someone opens it, then kept for 60 days. */
export async function loadGaugeName(id: string, apiKey: string): Promise<string | undefined> {
  const r = await cachedFetch(`usgs:name:${id}`, 60 * DAY, async () => {
    const url = `${USGS_BASE}/monitoring-locations/items/${encodeURIComponent(id)}?f=json`
    const f = await fetchJson<Feature>(withKey(url, apiKey))
    return typeof f.properties.monitoring_location_name === 'string' ? titleCase(f.properties.monitoring_location_name) : undefined
  })
  return r.data
}

export type Series = { t: number; v: number }[]
export type GaugeHistory = { flow: Series; temp: Series; stage: Series }

/** Seven days of readings for one gauge, for the chart and the trend arrow. */
export function loadGaugeHistory(id: string, apiKey: string) {
  return cachedFetch(`usgs:hist:${id}`, 30 * MINUTE, async () => {
    const url =
      `${USGS_BASE}/continuous/items?f=json&monitoring_location_id=${encodeURIComponent(id)}` +
      `&parameter_code=${P_FLOW},${P_STAGE},${P_TEMP}&time=P7D&properties=parameter_code,time,value&limit=5000`
    return parseHistory(await fetchAllPages(withKey(url, apiKey), 2))
  })
}

export function parseHistory(fc: FeatureCollection): GaugeHistory {
  const out: GaugeHistory = { flow: [], temp: [], stage: [] }
  for (const f of fc.features) {
    const p = f.properties
    const t = typeof p.time === 'string' ? Date.parse(p.time) : NaN
    const v = p.value == null ? NaN : Number(p.value)
    if (!Number.isFinite(t) || !Number.isFinite(v) || v <= -999) continue
    if (p.parameter_code === P_FLOW) out.flow.push({ t, v })
    else if (p.parameter_code === P_TEMP) out.temp.push({ t, v })
    else if (p.parameter_code === P_STAGE) out.stage.push({ t, v })
  }
  for (const s of Object.values(out)) s.sort((a, b) => a.t - b.t)
  return out
}

export type Trend = 'rising' | 'falling' | 'steady'

/** Compares the latest value with the one about 24 hours earlier. ±10% counts as a change. */
export function trend24h(s: Series): Trend | undefined {
  if (s.length < 2) return undefined
  const last = s[s.length - 1]
  const target = last.t - DAY
  let prev = s[0]
  for (const p of s) {
    if (p.t > target) break
    prev = p
  }
  if (last.t - prev.t < 12 * 60 * MINUTE || prev.v <= 0) return undefined
  const change = (last.v - prev.v) / prev.v
  return change > 0.1 ? 'rising' : change < -0.1 ? 'falling' : 'steady'
}

export type TempBand = 'cold' | 'cool' | 'prime' | 'warm' | 'stress'

/**
 * Trout water-temperature bands, the rule of thumb most US anglers and
 * Trout Unlimited's "keep 'em wet" guidance use: feeding is best roughly
 * 50–65°F, and above 68°F (20°C) catch-and-release mortality climbs.
 */
export function troutTempBand(c: number): TempBand {
  if (c < 4.4) return 'cold' // < 40°F
  if (c < 10) return 'cool' // 40–50°F
  if (c < 18.3) return 'prime' // 50–65°F
  if (c < 20) return 'warm' // 65–68°F
  return 'stress' // ≥ 68°F
}

export const TEMP_BAND_TEXT: Record<TempBand, { label: string; advice: string }> = {
  cold: { label: 'Very cold', advice: 'Trout are sluggish. Fish slow and deep, midday is best.' },
  cool: { label: 'Cool', advice: 'Activity picks up in the afternoon as water warms.' },
  prime: { label: 'Prime', advice: 'Trout are feeding comfortably.' },
  warm: { label: 'Warm', advice: 'Fish early, land fish fast, keep them wet.' },
  stress: { label: 'Too warm', advice: 'Trout are stressed. Consider fishing another day or a colder stream.' },
}

export function nearestGauges(p: LngLat, gauges: Gauge[], maxKm: number, n: number) {
  return gauges
    .map((g) => ({ gauge: g, km: distanceKm(p, g) }))
    .filter((x) => x.km <= maxKm)
    .sort((a, b) => a.km - b.km)
    .slice(0, n)
}

export const usgsPageUrl = (id: string) => `https://waterdata.usgs.gov/monitoring-location/${encodeURIComponent(id)}/`

const SMALL = new Set(['at', 'near', 'nr', 'of', 'the', 'and', 'above', 'below', 'blw', 'abv', 'in', 'on'])
export function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/(\s+|-|\/)/)
    .map((w, i) => {
      if (/^[a-z]{2}$/.test(w) && i > 0 && s.toLowerCase().endsWith(w)) return w.toUpperCase() // state code
      if (/^([a-z]\.)+,?$/.test(w)) return w.toUpperCase() // U.S.
      if (i > 0 && SMALL.has(w)) return w
      return w.charAt(0).toUpperCase() + w.slice(1)
    })
    .join('')
}
