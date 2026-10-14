// Sea surface temperature from the Open-Meteo Marine API (keyless, CORS-enabled,
// worldwide). It's a model value for the open water nearby: shallow flats and
// bays run warmer in summer and colder in winter.
import { cachedFetch, fetchJson, HOUR } from './cache'

const MARINE = 'https://marine-api.open-meteo.com/v1/marine'

type Raw = { hourly?: { time?: string[]; sea_surface_temperature?: (number | null)[] }; utc_offset_seconds?: number }

/** The reading for the current hour (times come back in the place's local time, hence the offset). */
export function parseSeaTemp(raw: Raw, now: number): number | undefined {
  const times = raw.hourly?.time ?? []
  const temps = raw.hourly?.sea_surface_temperature ?? []
  const off = (raw.utc_offset_seconds ?? 0) * 1000
  let best: number | undefined
  let bestGap = Infinity
  times.forEach((t, i) => {
    const v = temps[i]
    if (v == null) return
    const gap = Math.abs(Date.parse(`${t}Z`) - off - now)
    if (gap < bestGap) {
      bestGap = gap
      best = v
    }
  })
  return bestGap <= 3 * HOUR ? best : undefined
}

export function loadSeaTemp(lat: number, lon: number) {
  const rl = Math.round(lat * 10) / 10
  const ro = Math.round(lon * 10) / 10
  return cachedFetch(`sst:${rl}:${ro}:${new Date().toISOString().slice(0, 13)}`, 3 * HOUR, async () => {
    const raw = await fetchJson<Raw>(`${MARINE}?latitude=${rl}&longitude=${ro}&hourly=sea_surface_temperature&past_days=1&forecast_days=1&timezone=auto`)
    return parseSeaTemp(raw, Date.now()) ?? null
  })
}
