// Public fish records from iNaturalist: research-grade observations (identity
// confirmed by the community), many of them anglers' catch photos. This is the
// "where are fish actually caught" signal. Every record keeps its observer,
// licence and link, and is shown with attribution.
// API: https://api.inaturalist.org (asks for ≤1 request/second; we cache hard).
import { cachedFetch, DAY, fetchJson, rateGate } from './cache'
import { cellBBox } from './geo'
import { safeHttpUrl } from './format'
import type { Presence } from './advisor'
import { stockedLatin, type StockingEvent } from './stocking'

const V1 = 'https://api.inaturalist.org/v1'
const V2 = 'https://api.inaturalist.org/v2'
export const SIGHTING_CELL_DEG = 0.2
export const SIGHTING_MIN_ZOOM = 10
/** Older records say less about today's fishery. */
export const YEARS_BACK = 10

export type Sighting = {
  id: string
  latin: string
  common: string
  lat: number
  lon: number
  date?: string
  observer?: string
  license?: string
  url: string
}

const since = (now = new Date()) => `${now.getUTCFullYear() - YEARS_BACK}-01-01`

const inatSlot = rateGate(1000)
async function polite<T>(url: string): Promise<T> {
  await inatSlot()
  return fetchJson<T>(url)
}

type CountsRaw = { results: { count: number; taxon: { name: string; preferred_common_name?: string; rank: string } }[] }

/** Fish species recorded within `radiusKm` of a point, most-recorded first. */
export function loadSpeciesNear(lat: number, lon: number, radiusKm: number) {
  const key = `inat:counts:${lat.toFixed(3)}:${lon.toFixed(3)}:${radiusKm}`
  return cachedFetch(key, 7 * DAY, async () => {
    const url =
      `${V1}/observations/species_counts?lat=${lat.toFixed(5)}&lng=${lon.toFixed(5)}&radius=${radiusKm}` +
      `&iconic_taxa=Actinopterygii&quality_grade=research&captive=false&d1=${since()}&per_page=50`
    return parseCounts(await polite<CountsRaw>(url))
  })
}

export function parseCounts(raw: CountsRaw): Presence[] {
  return raw.results
    .filter((r) => r.taxon && (r.taxon.rank === 'species' || r.taxon.rank === 'subspecies' || r.taxon.rank === 'hybrid'))
    .map((r) => ({ latin: r.taxon.name, common: r.taxon.preferred_common_name ?? r.taxon.name, count: r.count }))
}

type ObsRaw = {
  results: {
    id: number
    uri?: string
    observed_on?: string
    obscured?: boolean
    geojson?: { coordinates: [number, number] }
    license_code?: string | null
    taxon?: { name: string; preferred_common_name?: string }
    user?: { login?: string }
  }[]
}

/** Recent fish observations in a map cell, for the "Fish sightings" layer. */
export function loadSightingsCell(cell: string) {
  return cachedFetch(`inat:obs:${cell}`, 3 * DAY, async () => {
    const b = cellBBox(cell)
    const url =
      `${V2}/observations?swlat=${b.south}&swlng=${b.west}&nelat=${b.north}&nelng=${b.east}` +
      `&iconic_taxa=Actinopterygii&quality_grade=research&captive=false&d1=${since()}&per_page=200&order_by=observed_on` +
      `&fields=id,uri,observed_on,obscured,geojson,license_code,taxon.name,taxon.preferred_common_name,user.login`
    return parseSightings(await polite<ObsRaw>(url))
  })
}

export function parseSightings(raw: ObsRaw): Sighting[] {
  const out: Sighting[] = []
  for (const r of raw.results) {
    // Obscured records are shifted up to ~20 km on purpose; they'd put pins in the wrong place.
    if (r.obscured || !r.geojson || !r.taxon) continue
    const [lon, lat] = r.geojson.coordinates
    out.push({
      id: `inat-${r.id}`,
      latin: r.taxon.name,
      common: r.taxon.preferred_common_name ?? r.taxon.name,
      lat,
      lon,
      date: r.observed_on,
      observer: r.user?.login,
      license: r.license_code ?? undefined,
      url: safeHttpUrl(r.uri) ?? `https://www.inaturalist.org/observations/${r.id}`,
    })
  }
  return out
}

export function licenseLabel(code?: string): string {
  if (!code) return 'all rights reserved'
  return code.toUpperCase().replace(/^CC0$/, 'CC0').replace(/^CC-/, 'CC ')
}

// France: national electrofishing surveys (OFB, via Hub'Eau). These are
// scientists' counts, so they show what lives in a river even where nobody
// posts photos. https://hubeau.eaufrance.fr/page/api-poisson
export const FRANCE: { south: number; north: number; west: number; east: number } = { south: 41.3, north: 51.2, west: -5.2, east: 9.6 }
export const inFrance = (lat: number, lon: number) => lat >= FRANCE.south && lat <= FRANCE.north && lon >= FRANCE.west && lon <= FRANCE.east

type HubEauRaw = { data?: { nom_latin_taxon?: string; nom_commun_taxon?: string; effectif_lot?: number }[] }

export function loadFrenchSurveys(lat: number, lon: number, radiusKm: number) {
  return cachedFetch(`hubeau:fish:${lat.toFixed(3)}:${lon.toFixed(3)}:${radiusKm}`, 30 * DAY, async () => {
    const url =
      `https://hubeau.eaufrance.fr/api/v1/etat_piscicole/observations?latitude=${lat.toFixed(5)}&longitude=${lon.toFixed(5)}` +
      `&distance=${radiusKm}&date_operation_min=${since()}&size=2000&format=json&fields=nom_latin_taxon,nom_commun_taxon,effectif_lot`
    return parseHubEau(await fetchJson<HubEauRaw>(url))
  })
}

/** Sums the fish caught per species across survey lots. */
export function parseHubEau(raw: HubEauRaw): Presence[] {
  const by = new Map<string, Presence>()
  for (const r of raw.data ?? []) {
    if (!r.nom_latin_taxon) continue
    const p = by.get(r.nom_latin_taxon) ?? { latin: r.nom_latin_taxon, common: r.nom_commun_taxon ?? r.nom_latin_taxon, count: 0 }
    p.count += Math.max(1, r.effectif_lot ?? 1)
    by.set(r.nom_latin_taxon, p)
  }
  return [...by.values()].sort((a, b) => b.count - a.count)
}

export type Sources = { inat?: Presence[]; surveys?: Presence[]; stocking?: { state: string; source: string; by: string; events: StockingEvent[] } | null }

/** One evidence list for the engine: public sightings, official surveys and stocking all count. */
export function mergePresence(s: Sources): Presence[] {
  const by = new Map<string, Presence>()
  const add = (p: Presence) => {
    const e = by.get(p.latin)
    if (e) e.count += p.count
    else by.set(p.latin, { ...p })
  }
  s.inat?.forEach(add)
  s.surveys?.forEach(add)
  for (const e of s.stocking?.events ?? []) {
    const latin = stockedLatin(e.species)
    if (latin) add({ latin, common: e.species, count: 10 })
  }
  return [...by.values()]
}
