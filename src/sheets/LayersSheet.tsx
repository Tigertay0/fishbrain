import { useSyncExternalStore } from 'react'
import type { Map as MlMap } from 'maplibre-gl'
import { Download } from 'lucide-react'
import { Button, Segmented, Sheet } from '../components/ui'
import { useToast } from '../components/Toast'
import { db, newId, type Basemap, type LayerKey } from '../lib/db'
import { updateSettings, useSettings } from '../lib/settings'
import { vectorTileTemplate } from '../lib/mapStyle'
import { downloadTiles, MAX_AREA_TILES, planArea, type Progress, type TileSource } from '../lib/offline'
import { LAND_MAX_TILE_ZOOM, LAND_MIN_ZOOM, LAND_TILES, LEGEND, MANAGER_COLOR } from '../lib/publicland'
import { countTiles, type BBox } from '../lib/geo'

const LAYERS: { key: LayerKey; label: string; hint: string }[] = [
  { key: 'publicLand', label: 'Public land', hint: 'Who manages it; tap for the name and whether you can get in (USGS PAD-US)' },
  { key: 'streams', label: 'Streams and rivers', hint: 'Tap one for gauges and your notes' },
  { key: 'gauges', label: 'USGS gauges', hint: 'Live flow and water temp, colour = trout temp' },
  { key: 'catches', label: 'My catches', hint: 'Only on this device' },
  { key: 'markers', label: 'My markers', hint: 'Access, parking, runs' },
  { key: 'sightings', label: 'Fish sightings', hint: 'Where fish were recorded (iNaturalist, last 10 years)' },
  { key: 'amenities', label: 'Shops, ramps and access', hint: 'From OpenStreetMap, unverified' },
]

// The area download outlives the sheet: closing it to look at the map must not stop it,
// and reopening must show it (with Stop) instead of offering a second, parallel download.
type Download = { ctrl: AbortController; progress: Progress }
let download: Download | undefined
const downloadListeners = new Set<() => void>()
function setDownload(d: Download | undefined) {
  download = d
  downloadListeners.forEach((l) => l())
}
function subscribeDownload(l: () => void) {
  downloadListeners.add(l)
  return () => downloadListeners.delete(l)
}

export function LayersSheet({ map, onClose }: { map: MlMap | null; onClose: () => void }) {
  const s = useSettings()
  const toast = useToast()
  const active = useSyncExternalStore(subscribeDownload, () => download)
  const progress = active?.progress

  const toggle = (key: LayerKey) => void updateSettings({ layers: { ...s.layers, [key]: !s.layers[key] } })

  const template = map ? vectorTileTemplate(map) : undefined
  const bounds = map?.getBounds()
  const bbox: BBox | undefined = bounds ? { west: bounds.getWest(), south: bounds.getSouth(), east: bounds.getEast(), north: bounds.getNorth() } : undefined
  const plan = bbox && map ? planArea(bbox, map.getZoom()) : undefined
  // Public land comes along when it's switched on, so boundaries still show with no signal.
  const landZooms = plan && !('tooBig' in plan) && s.layers.publicLand ? plan.zooms.filter((z) => z >= LAND_MIN_ZOOM && z <= LAND_MAX_TILE_ZOOM) : []
  const landTiles = bbox && landZooms.length ? countTiles(bbox, landZooms) : 0

  const saveArea = async () => {
    if (!template || !bbox || !plan || 'tooBig' in plan || download) return
    const ctrl = new AbortController()
    const sources: TileSource[] = [{ template, zooms: plan.zooms }]
    if (landZooms.length) sources.push({ template: LAND_TILES, zooms: landZooms })
    setDownload({ ctrl, progress: { done: 0, failed: 0, total: plan.tiles + landTiles } })
    const result = await downloadTiles(sources, bbox, (p) => setDownload({ ctrl, progress: p }), ctrl.signal)
    setDownload(undefined)
    if (ctrl.signal.aborted) {
      toast('Download stopped')
      return
    }
    const c = map!.getCenter()
    await db.offlineAreas.put({
      id: newId(),
      name: `Area near ${c.lat.toFixed(2)}, ${c.lng.toFixed(2)}`,
      bbox,
      zooms: plan.zooms,
      tiles: result.total - result.failed,
      savedAt: new Date().toISOString(),
    })
    toast(result.failed ? `Saved with ${result.failed} tiles missing. Try again on better signal.` : 'Area saved for offline use')
  }

  return (
    <Sheet title="Map layers" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Segmented<Basemap>
          label="Basemap"
          value={s.basemap}
          onChange={(basemap) => void updateSettings({ basemap })}
          options={[
            { value: 'streets', label: 'Streets' },
            { value: 'topo', label: 'Topo' },
            { value: 'imagery', label: 'Satellite' },
          ]}
        />
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-sm font-semibold">Show on map</legend>
          {LAYERS.map((l) => (
            <label key={l.key} className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-md px-1 hover:bg-surface">
              <span className="flex flex-col">
                <span className="text-sm font-semibold">{l.label}</span>
                <span className="text-xs text-muted">{l.hint}</span>
              </span>
              <input type="checkbox" className="size-5 accent-[var(--tl-accent)]" checked={s.layers[l.key]} onChange={() => toggle(l.key)} />
            </label>
          ))}
        </fieldset>

        {s.layers.publicLand ? (
          <div className="flex flex-col gap-1.5 text-xs">
            <ul className="flex flex-wrap gap-x-3 gap-y-1" role="list" aria-label="Public land colours">
              {LEGEND.map((l) => (
                <li key={l.kind} className="flex items-center gap-1.5">
                  <span aria-hidden className="size-3 rounded-sm border" style={{ background: `${MANAGER_COLOR[l.kind]}55`, borderColor: MANAGER_COLOR[l.kind] }} />
                  {l.label}
                </li>
              ))}
            </ul>
            <p className="text-muted">Shows from zoom {LAND_MIN_ZOOM}. Unshaded land is private or unknown. Boundaries are approximate: obey posted signs.</p>
          </div>
        ) : null}

        <section className="flex flex-col gap-2 rounded-md bg-surface p-3" aria-label="Offline">
          <h3 className="text-sm font-semibold">Use this area offline</h3>
          {!template ? (
            <p className="text-sm text-muted">The basemap isn't loaded, so there's nothing to save yet.</p>
          ) : !plan ? null : 'tooBig' in plan ? (
            <p className="text-sm text-muted">This view is too large ({plan.tiles.toLocaleString()} tiles). Zoom in to a valley or river and try again.</p>
          ) : progress ? (
            <div className="flex flex-col gap-2">
              <progress className="w-full accent-[var(--tl-accent)]" max={progress.total} value={progress.done} aria-label="Download progress" />
              <div className="flex items-center justify-between text-sm">
                <span>
                  {progress.done.toLocaleString()} of {progress.total.toLocaleString()} tiles
                </span>
                <Button size="sm" variant="ghost" onClick={() => active?.ctrl.abort()}>
                  Stop
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted">
                Saves the map you're looking at, zoom {plan.zooms[0]}–{plan.zooms[plan.zooms.length - 1]}: {plan.tiles.toLocaleString()} tiles (limit{' '}
                {MAX_AREA_TILES.toLocaleString()} per area, no limit on areas){landTiles ? `, plus ${landTiles.toLocaleString()} small public land tiles` : ''}. Your catches, markers and the last
                gauge readings work offline anyway.
              </p>
              <Button variant="primary" onClick={() => void saveArea()}>
                <Download size={18} /> Save this area
              </Button>
            </>
          )}
        </section>
        <p className="text-xs text-muted">
          Map © OpenFreeMap, OpenMapTiles, OpenStreetMap contributors. Topo and imagery: USGS The National Map. Public land: USGS PAD-US. Gauges: USGS. Weather:
          Open-Meteo.
        </p>
      </div>
    </Sheet>
  )
}
