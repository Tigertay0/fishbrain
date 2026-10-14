// What body of water is here? OpenStreetMap through Overpass: the lake you're
// standing beside (or floating on), or the river within a stone's throw.
import { cachedFetch, DAY, fetchJson } from './cache'
import { distanceKm } from './geo'
import type { WaterKind } from './advisor'
import { forecastUrl } from './weather'

const OVERPASS = 'https://overpass-api.de/api/interpreter'

export type WaterBody = {
  name?: string
  type: WaterKind
  osmUrl?: string
  /** rough size from the bounding box, km² */
  areaKm2?: number
}

type El = {
  type: string
  id: number
  tags?: Record<string, string>
  bounds?: { minlat: number; minlon: number; maxlat: number; maxlon: number }
}

export function waterQuery(lat: number, lon: number): string {
  const p = `${lat.toFixed(5)},${lon.toFixed(5)}`
  // The "sep" marker splits water containing the point from water merely nearby.
  return `[out:json][timeout:20];
is_in(${p})->.a;
(way(pivot.a)["natural"="water"];relation(pivot.a)["natural"="water"];way(pivot.a)["landuse"="reservoir"];relation(pivot.a)["landuse"="reservoir"];)->.inside;
.inside out tags bb;
make sep kind="near";
out;
(
  way(around:250,${p})["natural"="water"];
  relation(around:250,${p})["natural"="water"];
  way(around:250,${p})["landuse"="reservoir"];
  way(around:120,${p})["waterway"~"^(river|stream|canal)$"];
  way(around:400,${p})["natural"="coastline"];
);
out tags bb 25;`
}

export function classify(tags: Record<string, string>, bounds?: El['bounds']): { type: WaterKind; areaKm2?: number } {
  const areaKm2 = bounds ? bboxAreaKm2(bounds) : undefined
  if (tags.natural === 'coastline' || tags.natural === 'bay' || tags.water === 'lagoon') return { type: 'coast', areaKm2 }
  if (tags.waterway === 'stream') return { type: 'stream' }
  if (tags.waterway === 'river' || tags.waterway === 'canal') return { type: 'river' }
  if (tags.water === 'river' || tags.water === 'canal' || tags.water === 'oxbow') return { type: 'river', areaKm2 }
  if (tags.water === 'reservoir' || tags.landuse === 'reservoir') return { type: 'reservoir', areaKm2 }
  if (tags.water === 'pond' || (areaKm2 != null && areaKm2 < 0.05)) return { type: 'pond', areaKm2 }
  return { type: 'lake', areaKm2 }
}

/** Area of a lat/lon box in km², times 0.6 because lakes don't fill their boxes. */
function bboxAreaKm2(b: NonNullable<El['bounds']>): number {
  const h = distanceKm({ lat: b.minlat, lon: b.minlon }, { lat: b.maxlat, lon: b.minlon })
  const w = distanceKm({ lat: b.minlat, lon: b.minlon }, { lat: b.minlat, lon: b.maxlon })
  return Math.round(h * w * 0.6 * 1000) / 1000
}

export function pickWater(elements: El[]): WaterBody {
  const sep = elements.findIndex((e) => e.type === 'sep')
  const inside = sep < 0 ? [] : elements.slice(0, sep)
  const near = sep < 0 ? elements : elements.slice(sep + 1)
  const toBody = (e: El): WaterBody => ({
    name: e.tags?.name,
    ...classify(e.tags ?? {}, e.bounds),
    osmUrl: `https://www.openstreetmap.org/${e.type}/${e.id}`,
  })
  // Standing in (or on) water wins; then a named river beside you; then a named lake nearby.
  const firstNamed = (xs: El[]) => xs.find((e) => e.tags?.name) ?? xs[0]
  if (inside.length) return toBody(firstNamed(inside))
  if (near.some((e) => e.tags?.natural === 'coastline')) return { type: 'coast' }
  const flowing = near.filter((e) => e.tags?.waterway)
  if (flowing.length) return toBody(firstNamed(flowing))
  const still = near.filter((e) => !e.tags?.waterway)
  if (still.length) return toBody(firstNamed(still))
  return { type: 'unknown' }
}

export function lookupWater(lat: number, lon: number) {
  return cachedFetch(`osm:water:${lat.toFixed(4)}:${lon.toFixed(4)}`, 30 * DAY, async () => {
    const json = await fetchJson<{ elements?: El[] }>(OVERPASS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(waterQuery(lat, lon))}`,
      timeoutMs: 25000,
    })
    return pickWater(json.elements ?? [])
  })
}

export type AirHistory = { mean7C: number; mean14C: number; warming: boolean; rain48hMm: number }

/** The last two weeks of air temperature and rain, for a water-temperature estimate and a clarity guess. */
export function loadAirHistory(lat: number, lon: number) {
  const rl = Math.round(lat * 10) / 10
  const ro = Math.round(lon * 10) / 10
  return cachedFetch(`wx:hist:${rl}:${ro}`, 6 * 60 * 60_000, async () => {
    const url =
      forecastUrl(rl, ro).split('&hourly=')[0] + '&daily=temperature_2m_mean,precipitation_sum&timezone=auto&past_days=14&forecast_days=1'
    const raw = await fetchJson<{ daily: { time: string[]; temperature_2m_mean: (number | null)[]; precipitation_sum: (number | null)[] } }>(url)
    return parseAirHistory(raw.daily)
  })
}

export function parseAirHistory(d: { time: string[]; temperature_2m_mean: (number | null)[]; precipitation_sum: (number | null)[] }): AirHistory {
  // The last entry is today (partial); use the full days before it.
  const temps = d.temperature_2m_mean.slice(0, -1).filter((x): x is number => x != null)
  const rain = d.precipitation_sum.slice(0, -1)
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN)
  const mean7 = mean(temps.slice(-7))
  const mean14 = mean(temps.slice(-14))
  const prev7 = mean(temps.slice(-14, -7))
  return {
    mean7C: Math.round(mean7 * 10) / 10,
    mean14C: Math.round(mean14 * 10) / 10,
    warming: mean7 >= prev7,
    rain48hMm: Math.round(((rain.at(-1) ?? 0) + (rain.at(-2) ?? 0)) * 10) / 10,
  }
}

/** Search radius for public records: bigger water, wider net. */
export function searchRadiusKm(w: WaterBody): number {
  if (w.type === 'pond') return 1
  if (w.type === 'stream') return 2
  if (w.type === 'river') return 3
  if (w.areaKm2) return Math.min(10, Math.max(2, Math.round(Math.sqrt(w.areaKm2) * 1.2)))
  return 3
}
