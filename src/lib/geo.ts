export type LngLat = { lat: number; lon: number }
export type BBox = { west: number; south: number; east: number; north: number }

const R_KM = 6371.0088

export function distanceKm(a: LngLat, b: LngLat): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** A fixed grid cell id, so the same area always hits the same cache key. */
export function cellKey(lat: number, lon: number, size: number): string {
  return `${size}:${Math.floor(lat / size)}:${Math.floor(lon / size)}`
}

export function cellBBox(key: string): BBox {
  const [size, i, j] = key.split(':').map(Number)
  const r = (n: number) => Math.round(n * 1e6) / 1e6
  return { south: r(i * size), north: r((i + 1) * size), west: r(j * size), east: r((j + 1) * size) }
}

/** Cells covering a bbox, or null when there would be more than `max` (zoomed out too far). */
export function cellsForBBox(b: BBox, size: number, max: number): string[] | null {
  const i0 = Math.floor(b.south / size)
  const i1 = Math.floor(b.north / size)
  const j0 = Math.floor(b.west / size)
  const j1 = Math.floor(b.east / size)
  const count = (i1 - i0 + 1) * (j1 - j0 + 1)
  if (count > max) return null
  const keys: string[] = []
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) keys.push(`${size}:${i}:${j}`)
  return keys
}

export const bboxParam = (b: BBox) => [b.west, b.south, b.east, b.north].join(',')

/** Rounds a point to a grid of about `km` kilometres, for "water only" privacy. */
export function coarsen(p: LngLat, km: number): LngLat {
  const latStep = km / 111.32
  const lat = Math.round(Math.round(p.lat / latStep) * latStep * 1e5) / 1e5
  // The longitude step comes from the snapped latitude, so coarsening twice
  // (editing a "water only" catch) lands on the same point instead of drifting.
  const lonStep = km / (111.32 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)))
  return { lat, lon: Math.round(Math.round(p.lon / lonStep) * lonStep * 1e5) / 1e5 }
}

// Slippy-map tile math, for offline area downloads.
export function lonToTileX(lon: number, z: number): number {
  return Math.floor(((lon + 180) / 360) * 2 ** z)
}
export function latToTileY(lat: number, z: number): number {
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat))
  const rad = (clamped * Math.PI) / 180
  return Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z)
}

export type TileXYZ = { z: number; x: number; y: number }

export function tilesForBBox(b: BBox, zooms: number[]): TileXYZ[] {
  const out: TileXYZ[] = []
  for (const z of zooms) {
    const x0 = lonToTileX(b.west, z)
    const x1 = lonToTileX(b.east, z)
    const y0 = latToTileY(b.north, z)
    const y1 = latToTileY(b.south, z)
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) out.push({ z, x, y })
  }
  return out
}

export function countTiles(b: BBox, zooms: number[]): number {
  let n = 0
  for (const z of zooms) {
    n += (lonToTileX(b.east, z) - lonToTileX(b.west, z) + 1) * (latToTileY(b.south, z) - latToTileY(b.north, z) + 1)
  }
  return n
}

export function formatCoords(p: LngLat): string {
  const ns = p.lat >= 0 ? 'N' : 'S'
  const ew = p.lon >= 0 ? 'E' : 'W'
  return `${Math.abs(p.lat).toFixed(5)}° ${ns}, ${Math.abs(p.lon).toFixed(5)}° ${ew}`
}

/** A maps link the phone hands to its own navigation app. */
export function directionsUrl(p: LngLat): string {
  const isApple = typeof navigator !== 'undefined' && /iPhone|iPad|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document
  return isApple
    ? `https://maps.apple.com/?daddr=${p.lat},${p.lon}`
    : `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`
}
