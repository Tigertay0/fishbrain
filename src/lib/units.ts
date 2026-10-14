// Everything is stored metric. These convert for display and parse user input back.
export type Units = 'imperial' | 'metric'

const CM_PER_IN = 2.54
const G_PER_LB = 453.59237
const M3S_PER_CFS = 0.0283168466
const INHG_PER_HPA = 0.0295299831
const MPH_PER_KMH = 0.621371
const M_PER_FT = 0.3048

export const cToF = (c: number) => (c * 9) / 5 + 32
export const fToC = (f: number) => ((f - 32) * 5) / 9

function trim(n: number, digits: number): string {
  return n.toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
}

export function formatLength(cm: number | undefined, units: Units): string {
  if (cm == null) return '—'
  return units === 'imperial' ? `${trim(cm / CM_PER_IN, 1)} in` : `${trim(cm, 1)} cm`
}

export function formatWeight(g: number | undefined, units: Units): string {
  if (g == null) return '—'
  if (units === 'imperial') return `${trim(g / G_PER_LB, 2)} lb`
  return g >= 1000 ? `${trim(g / 1000, 2)} kg` : `${Math.round(g)} g`
}

export function formatTemp(c: number | undefined, units: Units): string {
  if (c == null) return '—'
  return units === 'imperial' ? `${Math.round(cToF(c))}°F` : `${trim(c, 1)}°C`
}

export function formatFlow(cfs: number | undefined, units: Units): string {
  if (cfs == null) return '—'
  if (units === 'imperial') return `${cfs >= 100 ? Math.round(cfs).toLocaleString('en-US') : trim(cfs, 1)} cfs`
  const m3 = cfs * M3S_PER_CFS
  return `${m3 >= 10 ? Math.round(m3) : trim(m3, 2)} m³/s`
}

export function formatStage(ft: number | undefined, units: Units): string {
  if (ft == null) return '—'
  return units === 'imperial' ? `${trim(ft, 2)} ft` : `${trim(ft * M_PER_FT, 2)} m`
}

export function formatPressure(hpa: number | undefined, units: Units): string {
  if (hpa == null) return '—'
  return units === 'imperial' ? `${(hpa * INHG_PER_HPA).toFixed(2)} inHg` : `${Math.round(hpa)} hPa`
}

export function formatWind(kmh: number | undefined, units: Units): string {
  if (kmh == null) return '—'
  return units === 'imperial' ? `${Math.round(kmh * MPH_PER_KMH)} mph` : `${Math.round(kmh)} km/h`
}

export function formatDistance(km: number, units: Units): string {
  if (units === 'imperial') {
    const mi = km * MPH_PER_KMH
    return mi < 0.2 ? `${Math.round(mi * 5280)} ft` : `${trim(mi, 1)} mi`
  }
  return km < 1 ? `${Math.round(km * 1000)} m` : `${trim(km, 1)} km`
}

export const lengthUnit = (u: Units) => (u === 'imperial' ? 'in' : 'cm')
export const weightUnit = (u: Units) => (u === 'imperial' ? 'lb' : 'kg')

/** Parses a length typed in the user's units into cm. Empty or invalid gives undefined. */
export function parseLength(input: string, units: Units): number | undefined {
  const n = parsePositive(input)
  if (n == null) return undefined
  return round1(units === 'imperial' ? n * CM_PER_IN : n)
}

/** Parses a weight typed in lb or kg into grams. */
export function parseWeight(input: string, units: Units): number | undefined {
  const n = parsePositive(input)
  if (n == null) return undefined
  return Math.round(units === 'imperial' ? n * G_PER_LB : n * 1000)
}

/** The inverse of parseLength, for filling an edit form. */
export function lengthInputValue(cm: number | undefined, units: Units): string {
  if (cm == null) return ''
  return trim(units === 'imperial' ? cm / CM_PER_IN : cm, 1)
}

export function weightInputValue(g: number | undefined, units: Units): string {
  if (g == null) return ''
  return trim(units === 'imperial' ? g / G_PER_LB : g / 1000, 2)
}

function parsePositive(input: string): number | undefined {
  const s = input.trim().replace(',', '.')
  if (!s) return undefined
  const n = Number(s)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

const round1 = (n: number) => Math.round(n * 10) / 10
