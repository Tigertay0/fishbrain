// "Save this area": prefetches basemap vector tiles so the service worker has
// them for a trip with no signal. Capped so it stays polite to the free tile host.
import { countTiles, tilesForBBox, type BBox } from './geo'

export const MAX_AREA_TILES = 2500
/** The basemap's vector tiles stop at 14; MapLibre overzooms past that. */
const MAX_TILE_ZOOM = 14

export type AreaPlan = { zooms: number[]; tiles: number } | { tooBig: true; tiles: number }

/** Below this the saved map can't show small streams and trails, so it isn't worth saving. */
const MIN_USEFUL_ZOOM = 12

/** Every zoom from a regional overview down to street level, dropping the deepest zooms until it fits. */
export function planArea(b: BBox, viewZoom: number): AreaPlan {
  // Zoomed in past the tiles (15+ at a stream), the view is still saved from zoom 14 tiles.
  const view = Math.min(MAX_TILE_ZOOM, Math.floor(viewZoom))
  const lo = Math.max(5, view - 4)
  let hi = MAX_TILE_ZOOM
  const range = (a: number, z: number) => Array.from({ length: z - a + 1 }, (_, i) => a + i)
  while (hi >= Math.max(lo, view, MIN_USEFUL_ZOOM)) {
    const zooms = range(lo, hi)
    const tiles = countTiles(b, zooms)
    if (tiles <= MAX_AREA_TILES) return { zooms, tiles }
    hi--
  }
  return { tooBig: true, tiles: countTiles(b, range(lo, Math.max(lo, view))) }
}

export type Progress = { done: number; failed: number; total: number }

/** A tile layer to save: its URL template and the zooms worth having. */
export type TileSource = { template: string; zooms: number[] }

/** Every tile URL for the area, across sources ({z}/{x}/{y} placeholders in any order). */
export function tileUrls(sources: TileSource[], b: BBox): string[] {
  return sources.flatMap((s) =>
    tilesForBBox(b, s.zooms).map((t) => s.template.replace('{z}', String(t.z)).replace('{x}', String(t.x)).replace('{y}', String(t.y))),
  )
}

export async function downloadTiles(sources: TileSource[], b: BBox, onProgress: (p: Progress) => void, signal: AbortSignal): Promise<Progress> {
  const urls = tileUrls(sources, b)
  const p: Progress = { done: 0, failed: 0, total: urls.length }
  let next = 0
  const worker = async () => {
    while (next < urls.length && !signal.aborted) {
      const url = urls[next++]
      try {
        const res = await fetch(url, { signal })
        // 404 is an empty tile (open ocean, no public land there): nothing to save, nothing missing.
        if (!res.ok && res.status !== 404) p.failed++
        else if (res.ok) await res.arrayBuffer() // let the service worker finish caching it
      } catch {
        if (!signal.aborted) p.failed++
      }
      p.done++
      onProgress({ ...p })
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker))
  return p
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | undefined> {
  try {
    const e = await navigator.storage?.estimate?.()
    return e?.usage != null && e.quota != null ? { usage: e.usage, quota: e.quota } : undefined
  } catch {
    return undefined
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`
  return `${(n / 1024 ** 3).toFixed(1)} GB`
}
