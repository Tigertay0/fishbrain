// Open-Meteo forecast API (keyless). Free for non-commercial use; see architecture.md before selling.
import { cachedFetch, fetchJson, MINUTE } from './cache'

export type Hour = {
  t: number // epoch ms
  tempC: number
  precipProb: number
  precipMm: number
  code: number
  cloud: number
  pressure: number
  windKmh: number
  gustKmh: number
}

export type Day = {
  date: string // YYYY-MM-DD, local to the place
  start: number // epoch ms of local midnight
  code: number
  maxC: number
  minC: number
  precipMm: number
  precipProb: number
  windMaxKmh: number
}

export type Forecast = { lat: number; lon: number; timezone: string; utcOffsetSec: number; hours: Hour[]; days: Day[] }

type Raw = {
  latitude: number
  longitude: number
  timezone: string
  utc_offset_seconds: number
  hourly: Block
  daily: Block
}
type Block = { time: string[]; [variable: string]: (number | null)[] | string[] | undefined }

const HOURLY = 'temperature_2m,precipitation_probability,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_gusts_10m'
const DAILY = 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max'

export function forecastUrl(lat: number, lon: number): string {
  return (
    `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}` +
    `&hourly=${HOURLY}&daily=${DAILY}&timezone=auto&past_days=1&forecast_days=7&wind_speed_unit=kmh`
  )
}

/** Open-Meteo gives local wall-clock strings; turn them into real instants with the offset. */
export function localToEpoch(local: string, offsetSec: number): number {
  const [d, t = '00:00'] = local.split('T')
  const [y, m, day] = d.split('-').map(Number)
  const [hh, mm] = t.split(':').map(Number)
  return Date.UTC(y, m - 1, day, hh, mm) - offsetSec * 1000
}

export function parseForecast(raw: Raw): Forecast {
  const off = raw.utc_offset_seconds
  const h = raw.hourly
  const num = (a: Block[string], i: number) => (a && a[i] != null ? Number(a[i]) : NaN)
  const hours: Hour[] = h.time.map((time, i) => ({
    t: localToEpoch(time, off),
    tempC: num(h.temperature_2m, i),
    precipProb: num(h.precipitation_probability, i),
    precipMm: num(h.precipitation, i),
    code: num(h.weather_code, i),
    cloud: num(h.cloud_cover, i),
    pressure: num(h.pressure_msl, i), // sea-level, like a barometer reading
    windKmh: num(h.wind_speed_10m, i),
    gustKmh: num(h.wind_gusts_10m, i),
  }))
  const d = raw.daily
  const days: Day[] = d.time.map((date, i) => ({
    date,
    start: localToEpoch(date, off),
    code: num(d.weather_code, i),
    maxC: num(d.temperature_2m_max, i),
    minC: num(d.temperature_2m_min, i),
    precipMm: num(d.precipitation_sum, i),
    precipProb: num(d.precipitation_probability_max, i),
    windMaxKmh: num(d.wind_speed_10m_max, i),
  }))
  return { lat: raw.latitude, lon: raw.longitude, timezone: raw.timezone, utcOffsetSec: off, hours, days }
}

/** Forecast for a point, cached by 0.1° (about 10 km) for an hour. */
export function loadForecast(lat: number, lon: number) {
  const rl = Math.round(lat * 10) / 10
  const ro = Math.round(lon * 10) / 10
  return cachedFetch(`wx:${rl}:${ro}`, 60 * MINUTE, async () => parseForecast(await fetchJson<Raw>(forecastUrl(rl, ro))))
}

export function hourAt(f: Forecast, t: number): Hour | undefined {
  let best: Hour | undefined
  for (const h of f.hours) if (!best || Math.abs(h.t - t) < Math.abs(best.t - t)) best = h
  return best && Math.abs(best.t - t) <= 90 * MINUTE ? best : undefined
}

export type PressureTrend = { delta3h: number; trend: 'rising' | 'falling' | 'steady' }

/** Change in surface pressure over the 3 hours before t. ±1 hPa counts as a move. */
export function pressureTrend(f: Forecast, t: number): PressureTrend | undefined {
  const now = hourAt(f, t)
  const before = hourAt(f, t - 3 * 60 * MINUTE)
  if (!now || !before || !Number.isFinite(now.pressure) || !Number.isFinite(before.pressure)) return undefined
  const delta3h = Math.round((now.pressure - before.pressure) * 10) / 10
  return { delta3h, trend: delta3h >= 1 ? 'rising' : delta3h <= -1 ? 'falling' : 'steady' }
}

// WMO weather interpretation codes, as Open-Meteo documents them.
export function weatherLabel(code: number): string {
  if (code === 0) return 'Clear'
  if (code === 1) return 'Mostly clear'
  if (code === 2) return 'Partly cloudy'
  if (code === 3) return 'Overcast'
  if (code === 45 || code === 48) return 'Fog'
  if (code >= 51 && code <= 57) return 'Drizzle'
  if (code >= 61 && code <= 67) return 'Rain'
  if (code >= 71 && code <= 77) return 'Snow'
  if (code >= 80 && code <= 82) return 'Showers'
  if (code === 85 || code === 86) return 'Snow showers'
  if (code >= 95) return 'Thunderstorms'
  return '—'
}

export const isStormy = (code: number) => code >= 95
export const isHeavyRain = (code: number) => code === 65 || code === 67 || code === 82
