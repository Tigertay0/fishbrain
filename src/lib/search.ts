// Place search through Nominatim. Its policy allows search on submit (no
// as-you-type autocomplete) at most once a second, with attribution.
import { fetchJson, rateGate } from './cache'

export type SearchResult = { id: string; name: string; detail: string; lat: number; lon: number; zoom: number }

type Raw = { place_id: number; lat: string; lon: string; display_name: string; name?: string; type?: string; class?: string }

const nominatimSlot = rateGate(1000)

export async function searchPlaces(q: string): Promise<SearchResult[]> {
  const query = q.trim()
  if (!query) return []
  await nominatimSlot()
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&q=${encodeURIComponent(query)}`
  const rows = await fetchJson<Raw[]>(url)
  return rows.map((r) => {
    const parts = r.display_name.split(', ')
    const isWater = r.class === 'waterway' || r.class === 'natural'
    return {
      id: String(r.place_id),
      name: r.name || parts[0],
      detail: parts.slice(1, 4).join(', '),
      lat: Number(r.lat),
      lon: Number(r.lon),
      zoom: isWater ? 12 : r.type === 'city' || r.type === 'town' ? 11 : 13,
    }
  })
}
