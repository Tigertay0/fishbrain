// State fish-stocking reports. Each agency publishes differently, so each one
// gets a small adapter. Coverage is listed in the UI so nobody assumes a gap
// means "never stocked". Endpoints checked 2026-10-14.
import { cachedFetch, DAY, fetchJson } from './cache'
import type { BBox } from './geo'

export type StockingEvent = {
  water: string
  species: string
  count?: number
  sizeIn?: number
  date: string // YYYY-MM-DD or YYYY-MM
  source: string
}

type Adapter = {
  state: string
  box: BBox
  source: string
  /** coordinates: query by area; name: match the water's name */
  by: 'area' | 'name'
  load: (q: { lat: number; lon: number; radiusKm: number; name?: string }) => Promise<StockingEvent[]>
}

const yearsAgo = (n: number) => {
  const d = new Date()
  d.setUTCFullYear(d.getUTCFullYear() - n)
  return d
}
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10)

/** Safe for SoQL and ArcGIS `LIKE` filters: letters, digits, spaces and a few punctuation marks only. */
export function likeTerm(name: string): string | undefined {
  const core = name
    .replace(/\b(lake|pond|reservoir|river|creek|brook|stream|run)\b/gi, '')
    .replace(/[^A-Za-z0-9 .-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return core.length >= 3 ? core.toUpperCase() : undefined
}

export const ADAPTERS: Adapter[] = [
  {
    state: 'Montana',
    box: { west: -116.1, south: 44.3, east: -104.0, north: 49.0 },
    source: 'Montana FWP fish plants',
    by: 'area',
    async load({ lat, lon, radiusKm }) {
      const d = radiusKm / 111
      const dl = d / Math.cos((lat * Math.PI) / 180)
      const env = [lon - dl, lat - d, lon + dl, lat + d].map((n) => n.toFixed(4)).join(',')
      const url =
        'https://services3.arcgis.com/Cdxz8r11hT0MGzg1/arcgis/rest/services/FISH_PLANTS/FeatureServer/0/query' +
        `?where=${encodeURIComponent(`PLANTDATE >= DATE '${iso(yearsAgo(3).getTime())}'`)}` +
        `&geometry=${env}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects` +
        '&outFields=WATERBODY,SPECIES,NUMFISH,FISHSIZE,PLANTDATE&orderByFields=PLANTDATE%20DESC&resultRecordCount=40&returnGeometry=false&f=json'
      const r = await fetchJson<{ features?: { attributes: Record<string, unknown> }[] }>(url)
      return (r.features ?? []).map(({ attributes: a }) => ({
        water: String(a.WATERBODY ?? ''),
        species: String(a.SPECIES ?? ''),
        count: num(a.NUMFISH),
        sizeIn: num(a.FISHSIZE),
        date: typeof a.PLANTDATE === 'number' ? iso(a.PLANTDATE) : '',
        source: 'Montana FWP',
      }))
    },
  },
  {
    state: 'Washington',
    box: { west: -124.9, south: 45.5, east: -116.9, north: 49.0 },
    source: 'WDFW fish plants',
    by: 'name',
    async load({ name }) {
      const term = name && likeTerm(name)
      if (!term) return []
      const where = `upper(release_location) like '%${term}%' AND release_start_date >= '${yearsAgo(3).toISOString().slice(0, 10)}'`
      const url = `https://data.wa.gov/resource/6fex-3r7d.json?$where=${encodeURIComponent(where)}&$order=release_start_date%20DESC&$limit=40`
      const rows = await fetchJson<Record<string, string>[]>(url)
      return rows.map((r) => ({
        water: r.release_location,
        species: r.species,
        count: num(r.number_released),
        date: (r.release_start_date ?? '').slice(0, 10),
        source: 'WDFW',
      }))
    },
  },
  {
    state: 'New York',
    box: { west: -79.8, south: 40.4, east: -71.8, north: 45.1 },
    source: 'NYSDEC fish stocking lists',
    by: 'name',
    async load({ name }) {
      const term = name && likeTerm(name)
      if (!term) return []
      const where = `upper(waterbody) like '%${term}%' AND year >= '${yearsAgo(3).getUTCFullYear()}'`
      const url = `https://data.ny.gov/resource/e52k-ymww.json?$where=${encodeURIComponent(where)}&$order=year%20DESC&$limit=40`
      const rows = await fetchJson<Record<string, string>[]>(url)
      return rows.map((r) => ({
        water: r.waterbody,
        species: r.species,
        count: num(r.number),
        sizeIn: num(r.size_inches),
        date: r.month ? `${r.year}-${monthNum(r.month)}` : String(r.year ?? ''),
        source: 'NYSDEC',
      }))
    },
  },
  {
    state: 'Massachusetts',
    box: { west: -73.6, south: 41.2, east: -69.9, north: 42.9 },
    source: 'MassWildlife trout stocking',
    by: 'name',
    async load({ name }) {
      const term = name && likeTerm(name)
      if (!term) return []
      const url =
        'https://services1.arcgis.com/7iJyYTjCtKsZS1LR/arcgis/rest/services/StockedFish_View/FeatureServer/0/query' +
        `?where=${encodeURIComponent(`UPPER(Waterbody) LIKE '%${term}%'`)}` +
        '&outFields=Waterbody,Town,Species,Stocked_Date&orderByFields=Stocked_Date%20DESC&resultRecordCount=40&f=geojson'
      const r = await fetchJson<{ features?: { properties: Record<string, unknown> }[] }>(url)
      return (r.features ?? []).map(({ properties: p }) => ({
        water: `${p.Waterbody ?? ''}${p.Town ? `, ${p.Town}` : ''}`,
        species: MA_SPECIES[String(p.Species)] ?? String(p.Species ?? ''),
        date: typeof p.Stocked_Date === 'number' ? iso(p.Stocked_Date) : '',
        source: 'MassWildlife',
      }))
    },
  },
]

const MA_SPECIES: Record<string, string> = { RT: 'Rainbow trout', BT: 'Brown trout', BKT: 'Brook trout', BK: 'Brook trout', TT: 'Tiger trout' }

export const STOCKING_COVERAGE = ADAPTERS.map((a) => a.state)

export function adapterFor(lat: number, lon: number): Adapter | undefined {
  return ADAPTERS.find((a) => lat >= a.box.south && lat <= a.box.north && lon >= a.box.west && lon <= a.box.east)
}

/** Recent stocking at or near this water, if its state publishes it. `undefined` means not covered. */
export async function loadStocking(lat: number, lon: number, radiusKm: number, name?: string) {
  const a = adapterFor(lat, lon)
  if (!a) return undefined
  if (a.by === 'name' && !(name && likeTerm(name))) return { state: a.state, source: a.source, by: a.by, events: [] as StockingEvent[] }
  const key = `stock:${a.state}:${a.by === 'area' ? `${lat.toFixed(2)}:${lon.toFixed(2)}:${radiusKm}` : likeTerm(name!)}`
  const r = await cachedFetch(key, 2 * DAY, () => a.load({ lat, lon, radiusKm, name }))
  return { state: a.state, source: a.source, by: a.by, events: r.data }
}

/** Stocked species names that also count as evidence of fish present. */
export function stockedLatin(species: string): string | undefined {
  const s = species.toLowerCase()
  if (/rainbow|steelhead/.test(s)) return 'Oncorhynchus mykiss'
  if (/brown/.test(s)) return 'Salmo trutta'
  if (/brook/.test(s)) return 'Salvelinus fontinalis'
  if (/cutthroat/.test(s)) return 'Oncorhynchus clarkii'
  if (/lake trout/.test(s)) return 'Salvelinus namaycush'
  if (/walleye/.test(s)) return 'Sander vitreus'
  if (/largemouth/.test(s)) return 'Micropterus nigricans'
  if (/smallmouth/.test(s)) return 'Micropterus dolomieu'
  if (/channel cat/.test(s)) return 'Ictalurus punctatus'
  if (/pike/.test(s)) return 'Esox lucius'
  if (/muskellunge|tiger musk/.test(s)) return 'Esox masquinongy'
  if (/crappie/.test(s)) return 'Pomoxis'
  if (/perch/.test(s)) return 'Perca flavescens'
  if (/grayling/.test(s)) return 'Thymallus arcticus'
  return undefined
}

const num = (v: unknown) => {
  const n = Number(v)
  return Number.isFinite(n) && v !== null && v !== '' ? n : undefined
}
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
function monthNum(m: string): string {
  const i = MONTHS.indexOf(m.trim().slice(0, 3).toLowerCase())
  return i < 0 ? '01' : String(i + 1).padStart(2, '0')
}
