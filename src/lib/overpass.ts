// OpenStreetMap places near streams, from the public Overpass API, on demand.
// None of this is verified public access: the UI says so on every place.
import { cachedFetch, DAY, fetchJson } from './cache'
import { cellBBox } from './geo'

export const AMENITY_CELL_DEG = 0.1
export const AMENITY_MIN_ZOOM = 12
const ENDPOINT = 'https://overpass-api.de/api/interpreter'

export type PlaceKind = 'shop' | 'slipway' | 'fishing' | 'camp' | 'parking' | 'bridge'
export type Place = { id: string; kind: PlaceKind; name?: string; lat: number; lon: number; osmUrl: string }

export const PLACE_LABEL: Record<PlaceKind, string> = {
  shop: 'Fishing shop',
  slipway: 'Boat ramp',
  fishing: 'Fishing spot',
  camp: 'Campsite',
  parking: 'Parking near a stream',
  bridge: 'Bridge over water',
}

export function amenityQuery(cell: string): string {
  const b = cellBBox(cell)
  const box = `${b.south},${b.west},${b.north},${b.east}`
  return `[out:json][timeout:25];
way["waterway"~"^(river|stream)$"](${box})->.w;
(
  nwr["shop"="fishing"](${box});
  nwr["leisure"="slipway"](${box});
  nwr["leisure"="fishing"](${box});
  nwr["tourism"="camp_site"](${box});
  nwr["amenity"="parking"]["access"!~"^(private|no|customers)$"](around.w:150);
  way["bridge"="yes"]["highway"]["highway"!~"^(motorway|motorway_link|trunk|trunk_link)$"](around.w:5);
);
out center tags 400;`
}

type Element = {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

export function parsePlaces(json: { elements?: Element[] }): Place[] {
  const out: Place[] = []
  const seen = new Set<string>()
  for (const el of json.elements ?? []) {
    const t = el.tags ?? {}
    const lat = el.lat ?? el.center?.lat
    const lon = el.lon ?? el.center?.lon
    if (lat == null || lon == null) continue
    const kind: PlaceKind | undefined =
      t.shop === 'fishing'
        ? 'shop'
        : t.leisure === 'slipway'
          ? 'slipway'
          : t.leisure === 'fishing'
            ? 'fishing'
            : t.tourism === 'camp_site'
              ? 'camp'
              : t.amenity === 'parking'
                ? 'parking'
                : t.bridge === 'yes'
                  ? 'bridge'
                  : undefined
    if (!kind) continue
    const id = `${el.type}/${el.id}`
    if (seen.has(id)) continue
    seen.add(id)
    out.push({ id, kind, name: t.name ?? (kind === 'bridge' ? t.ref : undefined), lat, lon, osmUrl: `https://www.openstreetmap.org/${id}` })
  }
  return out
}

export function loadPlacesCell(cell: string) {
  return cachedFetch(`osm:places:${cell}`, 14 * DAY, async () => {
    const json = await fetchJson<{ elements?: Element[] }>(ENDPOINT, {
      method: 'POST',
      // A form body keeps this a "simple" CORS request: no preflight.
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(amenityQuery(cell))}`,
      timeoutMs: 30000,
    })
    return parsePlaces(json)
  })
}
