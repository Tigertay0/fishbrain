import { useRef, useState } from 'react'
import type { Map as MlMap } from 'maplibre-gl'
import { Download } from 'lucide-react'
import { Button, Segmented, Sheet } from '../components/ui'
import { useToast } from '../components/Toast'
import { db, newId, type Basemap, type LayerKey } from '../lib/db'
import { updateSettings, useSettings } from '../lib/settings'
import { vectorTileTemplate } from '../lib/mapStyle'
import { downloadTiles, MAX_AREA_TILES, planArea, type Progress } from '../lib/offline'
import type { BBox } from '../lib/geo'

const LAYERS: { key: LayerKey; label: string; hint: string }[] = [
  { key: 'streams', label: 'Streams and rivers', hint: 'Tap one for gauges and your notes' },
  { key: 'gauges', label: 'USGS gauges', hint: 'Live flow and water temp, colour = trout temp' },
  { key: 'catches', label: 'My catches', hint: 'Only on this device' },
  { key: 'markers', label: 'My markers', hint: 'Access, parking, runs' },
  { key: 'amenities', label: 'Shops, ramps and access', hint: 'From OpenStreetMap, unverified' },
]

export function LayersSheet({ map, onClose }: { map: MlMap | null; onClose: () => void }) {
  const s = useSettings()
  const toast = useToast()
  const [progress, setProgress] = useState<Progress>()
  const abort = useRef<AbortController>(null)

  const toggle = (key: LayerKey) => void updateSettings({ layers: { ...s.layers, [key]: !s.layers[key] } })

  const template = map ? vectorTileTemplate(map) : undefined
  const bounds = map?.getBounds()
  const bbox: BBox | undefined = bounds ? { west: bounds.getWest(), south: bounds.getSouth(), east: bounds.getEast(), north: bounds.getNorth() } : undefined
  const plan = bbox && map ? planArea(bbox, map.getZoom()) : undefined

  const saveArea = async () => {
    if (!template || !bbox || !plan || 'tooBig' in plan) return
    const ctrl = new AbortController()
    abort.current = ctrl
    setProgress({ done: 0, failed: 0, total: plan.tiles })
    const result = await downloadTiles(template, bbox, plan.zooms, setProgress, ctrl.signal)
    abort.current = null
    if (ctrl.signal.aborted) {
      toast('Download stopped')
      setProgress(undefined)
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
    setProgress(undefined)
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
                <Button size="sm" variant="ghost" onClick={() => abort.current?.abort()}>
                  Stop
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted">
                Saves the map you're looking at, zoom {plan.zooms[0]}–{plan.zooms[plan.zooms.length - 1]}: {plan.tiles.toLocaleString()} tiles (limit{' '}
                {MAX_AREA_TILES.toLocaleString()} per area, no limit on areas). Your catches, markers and the last gauge readings work offline anyway.
              </p>
              <Button variant="primary" onClick={() => void saveArea()}>
                <Download size={18} /> Save this area
              </Button>
            </>
          )}
        </section>
        <p className="text-xs text-muted">
          Map © OpenFreeMap, OpenMapTiles, OpenStreetMap contributors. Topo and imagery: USGS The National Map. Gauges: USGS. Weather: Open-Meteo.
        </p>
      </div>
    </Sheet>
  )
}
