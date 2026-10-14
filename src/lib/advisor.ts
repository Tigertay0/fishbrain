// The "what do I use here" engine. Pure functions: water + species evidence +
// conditions in, ranked recommendations with their reasons out.
import { RIG_BY_ID, type Method, type Rig } from './rigs'
import { forageFor, PROFILE_BY_ID, PROFILES, profileForLatin, type Phase, type Profile, type Region, type Tactic, type WaterType } from './species'
import { coastFor, defaultSaltTargets } from './saltwater'
import { PREF_TEXT, STAGE_TEXT, stageFits, type TideNow } from './tides'
import { cToF } from './units'

export type Clarity = 'clear' | 'stained' | 'muddy'
export type WaterKind = WaterType | 'unknown'

export type Presence = {
  latin: string
  common: string
  /** public observations nearby */
  count: number
}

export type PlanInput = {
  water: { type: WaterKind; name?: string }
  lat: number
  lon: number
  date: Date
  waterTempC?: number
  /** true warming, false cooling, undefined unknown (falls back to the calendar) */
  warming?: boolean
  clarity: Clarity
  method: Method | 'any'
  presence: Presence[]
  lowLight?: boolean
  windKmh?: number
  pressureTrend?: 'rising' | 'falling' | 'steady'
  /** salt water: the tide at the nearest station right now, when known */
  tide?: TideNow
}

export type Activity = 'high' | 'medium' | 'low'

export type Recommendation = {
  profile: Profile
  phase: Phase
  phaseLabel: string
  activity: Activity
  score: number
  evidence: string
  where: string
  how: string
  rigs: Rig[]
  baits: string[]
  lures: string[]
  flies: string[]
  colors: string
  tackle: Profile['tackle']
  why: string[]
  warnings: string[]
  /** bait, lures and flies picked for this season (listed first, marked "best now") */
  seasonal: string[]
}

export type Plan = {
  recs: Recommendation[]
  /** fish seen nearby that aren't targets (or aren't in the guide) */
  otherFish: Presence[]
  forage: string[]
  notes: string[]
  fromDefaults: boolean
  unsupported?: string
}

export const region = (_lat: number, lon: number): Region => (lon < -25 ? 'na' : 'eu')
const moving = (t: WaterKind) => t === 'stream' || t === 'river'

export const PHASE_LABEL: Record<Phase, string> = {
  cold: 'Cold-water pattern',
  prespawn: 'Pre-spawn',
  spawn: 'Spawning',
  summer: 'Open-water pattern',
  fall: 'Fall feed',
  hot: 'Hot-water pattern',
}

/** Is the season warming? Water trend if known, otherwise the calendar for this hemisphere. */
export function isWarming(date: Date, lat: number, trend?: boolean): boolean {
  if (trend != null) return trend
  const m = date.getUTCMonth() // 0 = Jan
  const north = lat >= 0
  const springHalf = m <= 5 // Jan–Jun
  return north ? springHalf : !springHalf
}

/**
 * `warming` is the water's trend; `springHalf` is the calendar. Spawning needs
 * both to agree, so a warm week in October never reads as the spring spawn.
 */
export function phaseFor(p: Profile, tempF: number | undefined, warming: boolean, springHalf: boolean = warming): Phase {
  if (tempF == null) return warming ? 'summer' : 'fall'
  const { active, spawn, spawnSeason } = p.tempF
  if (tempF < active[0]) return 'cold'
  if (tempF > active[1]) return 'hot'
  if (spawn) {
    const spawning = tempF >= spawn[0] && tempF <= spawn[1]
    if (spawnSeason === 'spring' && warming && springHalf) {
      if (spawning) return 'spawn'
      if (tempF < spawn[0]) return 'prespawn'
    }
    if (spawnSeason === 'fall' && !warming && !springHalf && spawning) return 'spawn'
  }
  return warming ? 'summer' : 'fall'
}

export function activityFor(p: Profile, tempF: number | undefined, phase: Phase): Activity {
  if (tempF == null) return 'medium'
  if (phase === 'spawn') return 'medium'
  const { best, active } = p.tempF
  if (tempF >= best[0] && tempF <= best[1]) return 'high'
  if (tempF >= active[0] && tempF <= active[1]) return 'medium'
  return 'low'
}

/** Season picks first, then the rest of the all-season list, each once. */
const withSeason = (season: string[] | undefined, all: string[]) => [...new Set([...(season ?? []), ...all])]

/**
 * Merges a phase onto the species' default tactic. Where, how and rigs are
 * replaced; bait, lures and flies keep the full list with the season's picks
 * in front, so a season reorders the options without hiding the rest.
 */
export function tacticFor(p: Profile, phase: Phase): Tactic {
  const d = p.tactics.default
  const s = p.tactics[phase] ?? {}
  return { ...d, ...s, baits: withSeason(s.baits, d.baits), lures: withSeason(s.lures, d.lures), flies: withSeason(s.flies, d.flies) }
}

/** The bait, lures and flies this phase singles out (shown as "best now"). */
export function seasonalPicks(p: Profile, phase: Phase): string[] {
  const s = p.tactics[phase]
  return [...(s?.baits ?? []), ...(s?.lures ?? []), ...(s?.flies ?? [])]
}

export type Pack = { baits: string[]; lures: string[]; flies: string[] }

/**
 * One tackle list for the trip: the best bets' bait, lures and flies, taken
 * round-robin so every fish's top picks come first, without repeats.
 */
export function packList(recs: Recommendation[], top = 3, max = 12): Pack {
  const pick = (lists: string[][]) => {
    const out = new Set<string>()
    const longest = Math.max(0, ...lists.map((l) => l.length))
    for (let i = 0; i < longest && out.size < max; i++) for (const l of lists) if (i < l.length && out.size < max) out.add(l[i])
    return [...out]
  }
  const best = recs.slice(0, top)
  return { baits: pick(best.map((r) => r.baits)), lures: pick(best.map((r) => r.lures)), flies: pick(best.map((r) => r.flies)) }
}

export function colorsFor(clarity: Clarity, forage: string[]): string {
  const base =
    clarity === 'clear'
      ? 'Natural and subtle: green pumpkin, smoke, translucent; silver or white for baitfish.'
      : clarity === 'stained'
        ? 'Easier to see: chartreuse, white, firetiger, gold; add flash or rattles.'
        : 'Dark and loud: black and blue, solid colours, big vibration (Colorado blades, rattles), plus scent on bait.'
  const match = forage.length ? ` Match the local baitfish: ${forage.slice(0, 3).join(', ')}.` : ''
  return base + match
}

/** Guesses when nothing has been recorded nearby: what usually lives in this kind of water. */
export function defaultTargets(type: WaterKind, reg: Region, lat: number, tempF?: number): string[] {
  const cold = tempF != null && tempF < 65
  if (reg === 'eu') {
    if (type === 'stream') return ['brown', 'chub', 'grayling']
    if (type === 'river') return ['chub', 'perch', 'pike', 'zander', 'coarse', 'wels']
    if (type === 'pond') return ['carp', 'coarse', 'perch', 'pike']
    return ['pike', 'perch', 'zander', 'carp', 'coarse']
  }
  const north = Math.abs(lat) >= 40
  if (type === 'stream') return cold || tempF == null ? ['rainbow', 'brown', 'brook', 'smallmouth'] : ['smallmouth', 'sunfish', 'rainbow']
  if (type === 'river') return ['smallmouth', 'catfish', 'walleye', 'largemouth', 'brown']
  if (type === 'pond') return ['sunfish', 'largemouth', 'catfish', 'crappie']
  if (type === 'reservoir') return ['largemouth', 'crappie', 'whitebass', 'catfish', 'walleye']
  return north ? ['largemouth', 'sunfish', 'perch', 'pike', 'walleye', 'crappie'] : ['largemouth', 'sunfish', 'crappie', 'catfish']
}

export function plan(input: PlanInput): Plan {
  const reg = region(input.lat, input.lon)
  const tempF = input.waterTempC != null ? cToF(input.waterTempC) : undefined
  const warming = isWarming(input.date, input.lat, input.warming)
  const type = input.water.type
  const salt = type === 'coast'

  // Evidence: public observations grouped by profile, from the right pool of fish.
  const byProfile = new Map<string, { count: number; names: Set<string> }>()
  const otherFish: Presence[] = []
  const forage = new Set<string>()
  for (const p of input.presence) {
    const prof = profileForLatin(p.latin, salt ? 'salt' : 'fresh')
    const f = forageFor(p.latin)
    if (f) forage.add(f)
    if (!prof) {
      otherFish.push(p)
      continue
    }
    const e = byProfile.get(prof.id) ?? { count: 0, names: new Set<string>() }
    e.count += p.count
    e.names.add(p.common)
    byProfile.set(prof.id, e)
  }
  const fromDefaults = byProfile.size === 0
  const defaults = salt ? defaultSaltTargets(coastFor(input.lat, input.lon), input.lat) : defaultTargets(type, reg, input.lat, tempF)
  const candidates = fromDefaults ? defaults.map((id) => PROFILE_BY_ID[id]).filter(Boolean) : [...byProfile.keys()].map((id) => PROFILE_BY_ID[id])

  if (salt && !candidates.length) {
    return {
      recs: [],
      otherFish,
      forage: [...forage],
      notes: [],
      fromDefaults,
      unsupported: 'The saltwater guide covers US and European coasts, and nothing recorded near here matches it yet. Fish the moving water between the turns of the tide.',
    }
  }

  const recs = candidates.map((p) => recommend(p, input, tempF, warming, byProfile.get(p.id), [...forage], fromDefaults))
  recs.sort((a, b) => b.score - a.score)

  const notes: string[] = []
  if (tempF == null) notes.push('No water temperature, so season and activity are guesses from the calendar. Add a reading for sharper advice.')
  if (input.pressureTrend === 'falling') notes.push('Pressure is falling: fish often feed hard before a front. Good time to be out.')
  if (input.pressureTrend === 'rising') notes.push('Pressure is rising after a front: slow down and downsize.')
  if (salt) {
    if (!input.tide) notes.push('No tide station data here, so tide timing isn’t in the advice. Most inshore fish feed best in moving water, the hours between the turns.')
    notes.push('Salt water usually needs its own licence or registry, and size, bag and season limits are strict and change often. Check them before you keep a fish.')
  } else {
    if (!moving(type) && (input.windKmh ?? 0) >= 15) notes.push('Windy: fish the shore the wind is blowing into. Waves push baitfish there, and predators follow.')
    notes.push('Moving live bait between waters spreads disease and invasive species, and is illegal in many places. Buy bait locally.')
  }

  return { recs: recs.slice(0, 5), otherFish, forage: [...forage], notes, fromDefaults }
}

function recommend(
  p: Profile,
  input: PlanInput,
  tempF: number | undefined,
  warming: boolean,
  evidence: { count: number; names: Set<string> } | undefined,
  forage: string[],
  fromDefaults: boolean,
): Recommendation {
  const type = input.water.type
  const phase = phaseFor(p, tempF, warming, isWarming(input.date, input.lat))
  const activity = activityFor(p, tempF, phase)
  const t = tacticFor(p, phase)
  const why: string[] = []
  const warnings: string[] = [...(p.notes ?? [])]

  // Score: evidence × activity × suits this kind of water × (salt water) the tide right now.
  const evidenceW = evidence ? 1 + Math.log10(evidence.count + 1) : 0.6
  const activityW = activity === 'high' ? 1 : activity === 'medium' ? 0.7 : 0.4
  const waterW = type === 'unknown' || p.waters.includes(type as WaterType) ? 1 : 0.5
  const tideFits = p.tide && input.tide ? stageFits(input.tide.stage, p.tide.pref) : undefined
  const tideW = tideFits == null ? 1 : tideFits ? 1.15 : 0.9
  const score = Math.round(evidenceW * activityW * waterW * tideW * 100) / 100

  const evidenceText = evidence
    ? `${evidence.count} public record${evidence.count === 1 ? '' : 's'} nearby (${[...evidence.names].slice(0, 2).join(', ')})`
    : fromDefaults
      ? `No public records nearby: typical for this kind of water`
      : 'No records nearby'

  if (tempF != null) {
    const [b0, b1] = p.tempF.best
    why.push(
      activity === 'high'
        ? `Water around ${Math.round(tempF)}°F is in their best range (${b0}–${b1}°F).`
        : activity === 'medium'
          ? `Water around ${Math.round(tempF)}°F: active, but outside their best ${b0}–${b1}°F.`
          : `Water around ${Math.round(tempF)}°F is outside their comfort range: slow and patient.`,
    )
  }
  why.push(`${PHASE_LABEL[phase]}${phase === 'spawn' ? '' : warming ? ', season warming' : ', season cooling'}.`)
  if (input.lowLight) why.push('Low light right now: fish move shallower and chase more.')
  if (p.tide && input.tide) {
    const now = STAGE_TEXT[input.tide.stage].toLowerCase()
    why.push(tideFits ? `Tide is ${now}: that suits them (${PREF_TEXT[p.tide.pref]}).` : `Tide is ${now}; they do best in ${PREF_TEXT[p.tide.pref]}.`)
  }

  // Method filter: keep rigs and lists that fit how the angler wants to fish.
  const m = input.method
  const rigs = t.rigs
    .map((id) => RIG_BY_ID[id])
    .filter((r) => r && (m === 'any' || r.methods.includes(m)))
    .filter((r) => moving(type) || r.id !== 'split-shot' || p.group !== 'trout')
    .filter((r) => !moving(type) || r.id !== 'floating-bait')
  const usable = (xs: string[]) => xs.filter((x) => !/^Not usual/.test(x))

  if (p.group === 'trout' && tempF != null && tempF >= 68) warnings.unshift('Water is 68°F or warmer: hard on trout. Fish at first light or choose colder water.')
  if (p.group === 'trout' && tempF == null) warnings.push('If the water is above 68°F (20°C), trout often die after release: check with a thermometer.')
  if (phase === 'spawn' && p.tempF.spawnSeason) warnings.unshift('Spawning season: check closed seasons, and release spawning fish quickly where you caught them.')

  return {
    profile: p,
    phase,
    phaseLabel: PHASE_LABEL[phase],
    activity,
    score,
    evidence: evidenceText,
    where: (moving(type) ? t.moving ?? t.still : t.still ?? t.moving) ?? '',
    how: t.how,
    rigs: rigs.length ? rigs : t.rigs.map((id) => RIG_BY_ID[id]).filter(Boolean).slice(0, 2),
    baits: m === 'any' || m === 'bait' ? usable(t.baits) : [],
    lures: m === 'any' || m === 'lure' ? usable(t.lures) : [],
    flies: m === 'any' || m === 'fly' ? usable(t.flies) : [],
    colors: colorsFor(input.clarity, forage),
    tackle: p.tackle,
    why,
    warnings,
    seasonal: seasonalPicks(p, phase),
  }
}

/**
 * Surface water temperature from recent air temperature, when nothing measures
 * it. Rough by design (±3°C): small ponds track the air within days, big lakes
 * lag, and streams are buffered by groundwater.
 */
export function estimateWaterTempC(type: WaterKind, airMean7C: number, airMean14C: number): number {
  const clamp = (v: number, lo: number, hi: number) => Math.round(Math.min(hi, Math.max(lo, v)) * 10) / 10
  if (type === 'pond') return clamp(airMean7C + 1.5, 1, 33)
  if (type === 'stream') return clamp(0.75 * airMean7C + 3, 0.5, 26)
  if (type === 'river') return clamp(0.85 * airMean7C + 2, 0.5, 30)
  return clamp(airMean14C + 1, 1, 31)
}

export const ALL_PROFILES = PROFILES
