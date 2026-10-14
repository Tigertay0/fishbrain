// Tides from NOAA CO-OPS: the nearest prediction station and its highs and lows.
// Keyless, CORS-enabled, US coasts only. Times are requested in GMT so they
// never depend on the station's or the phone's time zone.
import { cachedFetch, DAY, fetchJson, HOUR } from './cache'
import { distanceKm } from './geo'

const STATIONS = 'https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/tidepredstations.json'
const DATA = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter'
/** Stations further than this tell you little about the water in front of you. */
export const STATION_RADIUS_MI = 25
const MINUTE = 60_000

export type TideStation = { id: string; name: string; lat: number; lon: number; km: number }
export type TideEvent = { t: number; type: 'high' | 'low'; ft: number }

type RawStation = { stationId?: string; name?: string; commonName?: string; etidesStnName?: string; lat?: number; lon?: number }

export function parseStations(json: { stationList?: RawStation[] | null }, lat: number, lon: number): TideStation[] {
  return (json.stationList ?? [])
    .filter((s): s is RawStation & { stationId: string; lat: number; lon: number } => !!s.stationId && Number.isFinite(s.lat) && Number.isFinite(s.lon))
    .map((s) => ({
      id: s.stationId,
      name: titleCaseStation(s.etidesStnName || s.commonName || s.name || s.stationId),
      lat: s.lat,
      lon: s.lon,
      km: Math.round(distanceKm({ lat, lon }, { lat: s.lat, lon: s.lon }) * 10) / 10,
    }))
    .sort((a, b) => a.km - b.km)
}

/** NOAA names are often SHOUTED: "FORT DAWES, BOSTON HARBOR" → "Fort Dawes, Boston Harbor". */
function titleCaseStation(s: string): string {
  return s === s.toUpperCase() ? s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()) : s
}

/** The closest tide station within 25 miles, or null inland. Cached for 90 days per ~5 km cell. */
export function nearestTideStation(lat: number, lon: number) {
  const rl = Math.round(lat * 20) / 20
  const ro = Math.round(lon * 20) / 20
  return cachedFetch(`tide:stn:${rl}:${ro}`, 90 * DAY, async () => {
    const json = await fetchJson<{ stationList?: RawStation[] | null }>(`${STATIONS}?lat=${rl}&lon=${ro}&radius=${STATION_RADIUS_MI}`)
    // "No station here" is only an answer when NOAA says so ({"stationList": null}); anything else is an error, not cached.
    if (!('stationList' in json)) throw new Error('Unexpected tide station response')
    return parseStations(json, lat, lon)[0] ?? null
  })
}

type RawPrediction = { t?: string; v?: string; type?: string }

export function parsePredictions(json: { predictions?: RawPrediction[]; error?: { message?: string } }): TideEvent[] {
  if (json.error) throw new Error(json.error.message ?? 'No tide predictions for this station')
  return (json.predictions ?? [])
    .map((p) => {
      const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(p.t ?? '')
      if (!m || (p.type !== 'H' && p.type !== 'L')) return undefined
      const t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5])
      return { t, type: p.type === 'H' ? 'high' : 'low', ft: Math.round(Number(p.v) * 10) / 10 } as TideEvent
    })
    .filter((e): e is TideEvent => !!e)
    .sort((a, b) => a.t - b.t)
}

const ymd = (ms: number) => new Date(ms).toISOString().slice(0, 10).replace(/-/g, '')

/** Highs and lows from yesterday to two days ahead (so "the last turn" is always known). Cached for 12 hours. */
export function loadTides(stationId: string, now: number = Date.now()) {
  const begin = ymd(now - DAY)
  return cachedFetch(`tide:pred:${stationId}:${begin}`, 12 * HOUR, async () => {
    const q = new URLSearchParams({
      product: 'predictions',
      application: 'tailout',
      begin_date: begin,
      range: '96',
      datum: 'MLLW',
      station: stationId,
      time_zone: 'gmt',
      interval: 'hilo',
      units: 'english',
      format: 'json',
    })
    return parsePredictions(await fetchJson(`${DATA}?${q}`))
  })
}

export type TideStage = 'rising' | 'falling' | 'high-slack' | 'low-slack'
export type TideNow = { stage: TideStage; prev: TideEvent; next: TideEvent; minutesToNext: number }

/** Within this of a turn, the water is close to still. */
const SLACK_MIN = 45

export function tideNow(events: TideEvent[], now: number): TideNow | undefined {
  const i = events.findIndex((e) => e.t > now)
  if (i <= 0) return undefined
  const prev = events[i - 1]
  const next = events[i]
  const sincePrev = (now - prev.t) / MINUTE
  const toNext = (next.t - now) / MINUTE
  const nearTurn = sincePrev <= SLACK_MIN ? prev : toNext <= SLACK_MIN ? next : undefined
  const stage: TideStage = nearTurn ? (nearTurn.type === 'high' ? 'high-slack' : 'low-slack') : next.type === 'high' ? 'rising' : 'falling'
  return { stage, prev, next, minutesToNext: Math.round(toNext) }
}

export type TidePref = 'rising' | 'falling' | 'moving' | 'slack'
export type Window = { start: number; end: number }

/** Windows of the tide a fish likes, between `from` and `to`. */
export function tideWindows(events: TideEvent[], pref: TidePref, from: number, to: number): Window[] {
  const out: Window[] = []
  const pad = SLACK_MIN * MINUTE
  for (let i = 0; i < events.length; i++) {
    const a = events[i]
    const b = events[i + 1]
    if (pref === 'slack') out.push({ start: a.t - pad, end: a.t + pad })
    if (!b) continue
    const rising = b.type === 'high'
    if (pref === 'moving' || (pref === 'rising' && rising) || (pref === 'falling' && !rising)) out.push({ start: a.t + pad, end: b.t - pad })
  }
  return out
    .map((w) => ({ start: Math.max(w.start, from), end: Math.min(w.end, to) }))
    .filter((w) => w.end - w.start >= 30 * MINUTE)
}

export const STAGE_TEXT: Record<TideStage, string> = {
  rising: 'Rising (incoming)',
  falling: 'Falling (outgoing)',
  'high-slack': 'Slack at high tide',
  'low-slack': 'Slack at low tide',
}

export const PREF_TEXT: Record<TidePref, string> = {
  rising: 'incoming tide',
  falling: 'outgoing tide',
  moving: 'moving water',
  slack: 'around slack tide',
}

/** Does the tide right now suit this preference? */
export function stageFits(stage: TideStage, pref: TidePref): boolean {
  if (pref === 'slack') return stage === 'high-slack' || stage === 'low-slack'
  if (pref === 'moving') return stage === 'rising' || stage === 'falling'
  return stage === pref
}
