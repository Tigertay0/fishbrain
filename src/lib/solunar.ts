// Sun and moon timing for one local day, computed in the browser with suncalc.
// The moon is sampled every 10 minutes from the place's own midnight, so the
// device's time zone never matters.
import SunCalc from 'suncalc'
import { MINUTE } from './cache'

export type Window = { start: number; end: number; center: number; kind: 'major' | 'minor'; why: string }

export type Solunar = {
  sunrise?: number
  sunset?: number
  moonrise?: number
  moonset?: number
  transit?: number // moon overhead
  underfoot?: number // moon opposite
  windows: Window[]
  phase: number // 0 new … 0.5 full … 1 new
  illumination: number // 0–1
  phaseName: string
}

const STEP = 10 * MINUTE
const DAY_MS = 24 * 60 * MINUTE

export function solunarDay(dayStart: number, lat: number, lon: number): Solunar {
  const sun = SunCalc.getTimes(new Date(dayStart + 12 * 60 * MINUTE), lat, lon)
  const valid = (d: Date) => (Number.isFinite(d.getTime()) ? d.getTime() : undefined)

  let moonrise: number | undefined
  let moonset: number | undefined
  let transit: number | undefined
  let underfoot: number | undefined
  let maxAlt = -Infinity
  let minAlt = Infinity
  let prevAlt = SunCalc.getMoonPosition(new Date(dayStart - STEP), lat, lon).altitude
  for (let t = dayStart; t <= dayStart + DAY_MS; t += STEP) {
    const alt = SunCalc.getMoonPosition(new Date(t), lat, lon).altitude
    if (prevAlt < 0 && alt >= 0 && moonrise == null) moonrise = interpolateZero(t - STEP, prevAlt, t, alt)
    if (prevAlt >= 0 && alt < 0 && moonset == null) moonset = interpolateZero(t - STEP, prevAlt, t, alt)
    if (alt > maxAlt) {
      maxAlt = alt
      transit = t
    }
    if (alt < minAlt) {
      minAlt = alt
      underfoot = t
    }
    prevAlt = alt
  }
  // An extreme at the very edge of the day is the tail of yesterday's or tomorrow's, not a transit.
  const edge = (t?: number) => t != null && (t - dayStart < STEP * 2 || dayStart + DAY_MS - t < STEP * 2)
  if (edge(transit)) transit = undefined
  if (edge(underfoot)) underfoot = undefined

  const windows: Window[] = []
  const add = (center: number | undefined, half: number, kind: Window['kind'], why: string) => {
    if (center != null) windows.push({ start: center - half, end: center + half, center, kind, why })
  }
  add(transit, 60 * MINUTE, 'major', 'Moon overhead')
  add(underfoot, 60 * MINUTE, 'major', 'Moon underfoot')
  add(moonrise, 30 * MINUTE, 'minor', 'Moonrise')
  add(moonset, 30 * MINUTE, 'minor', 'Moonset')
  windows.sort((a, b) => a.start - b.start)

  const ill = SunCalc.getMoonIllumination(new Date(dayStart + 12 * 60 * MINUTE))
  return {
    sunrise: valid(sun.sunrise),
    sunset: valid(sun.sunset),
    moonrise,
    moonset,
    transit,
    underfoot,
    windows,
    phase: ill.phase,
    illumination: ill.fraction,
    phaseName: phaseName(ill.phase),
  }
}

function interpolateZero(t0: number, a0: number, t1: number, a1: number): number {
  return Math.round(t0 + ((t1 - t0) * -a0) / (a1 - a0))
}

export function phaseName(p: number): string {
  if (p < 0.03 || p > 0.97) return 'New moon'
  if (p < 0.22) return 'Waxing crescent'
  if (p < 0.28) return 'First quarter'
  if (p < 0.47) return 'Waxing gibbous'
  if (p < 0.53) return 'Full moon'
  if (p < 0.72) return 'Waning gibbous'
  if (p < 0.78) return 'Last quarter'
  return 'Waning crescent'
}

/** Distance in phase from new or full moon, 0–0.25. Solunar tradition rates days near either higher. */
export const phaseDistanceFromNewOrFull = (p: number) => Math.min(p, Math.abs(p - 0.5), 1 - p)
