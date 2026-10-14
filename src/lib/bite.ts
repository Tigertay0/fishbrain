// The bite score is a transparent heuristic, not a prediction model. Every
// point it adds or takes away comes with a reason the UI shows the angler.
import { MINUTE } from './cache'
import { phaseDistanceFromNewOrFull, type Solunar } from './solunar'
import { troutTempBand, type TempBand } from './usgs'
import { isHeavyRain, isStormy, pressureTrend, type Forecast, type Hour } from './weather'

export type Factor = { label: string; points: number }
export type HourScore = { t: number; score: number; factors: Factor[]; window?: 'major' | 'minor' }

const TEMP_MULT: Record<TempBand, number> = { cold: 0.55, cool: 0.8, prime: 1, warm: 0.8, stress: 0.4 }

export function scoreHour(t: number, sol: Solunar, f: Forecast | undefined, waterTempC?: number): HourScore {
  const factors: Factor[] = [{ label: 'Baseline', points: 25 }]
  const mid = t + 30 * MINUTE // score the middle of the hour
  let window: HourScore['window']

  for (const w of sol.windows) {
    if (mid < w.start || mid > w.end) continue
    const half = (w.end - w.start) / 2
    const closeness = 1 - (Math.abs(mid - w.center) / half) * 0.5 // 1 at the center, 0.5 at the edges
    const pts = Math.round((w.kind === 'major' ? 30 : 15) * closeness)
    factors.push({ label: `${w.why} (${w.kind} period)`, points: pts })
    if (w.kind === 'major' || !window) window = w.kind
  }

  const nearLight = (x?: number) => x != null && Math.abs(mid - x) <= 75 * MINUTE
  const isNight = sol.sunrise != null && sol.sunset != null && (mid < sol.sunrise - 75 * MINUTE || mid > sol.sunset + 75 * MINUTE)
  if (nearLight(sol.sunrise) || nearLight(sol.sunset)) factors.push({ label: 'Low light at dawn or dusk', points: 20 })
  else if (isNight) factors.push({ label: 'Night', points: -10 })

  if (phaseDistanceFromNewOrFull(sol.phase) <= 0.1) factors.push({ label: `${sol.phaseName}`, points: 8 })

  const h: Hour | undefined = f?.hours.find((x) => x.t <= t && t < x.t + 60 * MINUTE)
  if (f && h) {
    const p = pressureTrend(f, t)
    if (p?.trend === 'falling') factors.push({ label: 'Pressure falling', points: 10 })
    else if (p && p.delta3h >= 2) factors.push({ label: 'Pressure rising fast', points: -8 })
    if (h.cloud >= 70 && !isNight && !nearLight(sol.sunrise) && !nearLight(sol.sunset))
      factors.push({ label: 'Overcast, fish less light-shy', points: 6 })
    if (isStormy(h.code)) factors.push({ label: 'Thunderstorms: get off the water', points: -30 })
    else if (isHeavyRain(h.code)) factors.push({ label: 'Heavy rain', points: -10 })
    if (h.gustKmh >= 45) factors.push({ label: 'Strong gusts', points: -10 })
  }

  let score = factors.reduce((s, x) => s + x.points, 0)
  if (waterTempC != null) {
    const band = troutTempBand(waterTempC)
    const mult = TEMP_MULT[band]
    if (mult !== 1) {
      const pts = Math.round(score * mult) - score
      factors.push({ label: `Water ${band === 'stress' ? 'too warm' : band} for trout`, points: pts })
      score += pts
    }
  }
  return { t, score: clamp(Math.round(score)), factors, window }
}

export function scoreDay(dayStart: number, sol: Solunar, f: Forecast | undefined, waterTempC?: number): HourScore[] {
  const out: HourScore[] = []
  for (let i = 0; i < 24; i++) out.push(scoreHour(dayStart + i * 60 * MINUTE, sol, f, waterTempC))
  return out
}

/** A day's rating: the mean of its six best hours, because nobody fishes all 24. */
export function dayRating(hours: HourScore[]): number {
  const top = [...hours].sort((a, b) => b.score - a.score).slice(0, 6)
  return top.length ? Math.round(top.reduce((s, h) => s + h.score, 0) / top.length) : 0
}

export function ratingLabel(score: number): { label: string; tone: 'bad' | 'neutral' | 'good' | 'great' } {
  if (score >= 75) return { label: 'Excellent', tone: 'great' }
  if (score >= 55) return { label: 'Good', tone: 'good' }
  if (score >= 35) return { label: 'Fair', tone: 'neutral' }
  return { label: 'Slow', tone: 'bad' }
}

/** Contiguous runs of hours scoring at least `min`, for "best windows today". */
export function bestWindows(hours: HourScore[], min = 55): { start: number; end: number; peak: number }[] {
  const out: { start: number; end: number; peak: number }[] = []
  let cur: { start: number; end: number; peak: number } | undefined
  for (const h of hours) {
    if (h.score >= min) {
      if (!cur) cur = { start: h.t, end: h.t + 60 * MINUTE, peak: h.score }
      else {
        cur.end = h.t + 60 * MINUTE
        cur.peak = Math.max(cur.peak, h.score)
      }
    } else if (cur) {
      out.push(cur)
      cur = undefined
    }
  }
  if (cur) out.push(cur)
  return out.sort((a, b) => b.peak - a.peak)
}

const clamp = (n: number) => Math.max(0, Math.min(100, n))
