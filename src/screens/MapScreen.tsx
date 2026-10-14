import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import maplibregl, { type GeoJSONSource, type MapGeoJSONFeature } from 'maplibre-gl'
import { useLiveQuery } from 'dexie-react-hooks'
import { Layers, MapPinPlus, Search, X } from 'lucide-react'
import { db, type Marker } from '../lib/db'
import { getSettings, updateSettings, useSettings } from '../lib/settings'
import { addOverlays, FALLBACK_STYLE, HIT_LAYERS, setBasemap, setLayerVisibility, STYLE_URL, waterNameLayers } from '../lib/mapStyle'
import { cellsForBBox, type BBox, type LngLat } from '../lib/geo'
import { GAUGE_CELL_DEG, GAUGE_MIN_ZOOM, loadGaugeCell, troutTempBand, type Gauge } from '../lib/usgs'
import { AMENITY_CELL_DEG, AMENITY_MIN_ZOOM, loadPlacesCell, type Place } from '../lib/overpass'
import { gaugeStore, placeStore, sightingStore, useGauges, usePlaces, useSightings } from '../lib/store'
import { loadSightingsCell, SIGHTING_CELL_DEG, SIGHTING_MIN_ZOOM, type Sighting } from '../lib/publicdata'
import { formatFlow, formatTemp } from '../lib/units'
import { searchPlaces, type SearchResult } from '../lib/search'
import { FetchError } from '../lib/cache'
import { shouldLocateOnOpen } from '../lib/locate'
import type { StreamHit } from '../lib/streams'
import { IconButton } from '../components/ui'
import { useToast } from '../components/Toast'
import { GaugeSheet } from '../sheets/GaugeSheet'
import { StreamSheet } from '../sheets/StreamSheet'
import { MarkerSheet } from '../sheets/MarkerSheet'
import { PlaceSheet } from '../sheets/PlaceSheet'
import { LayersSheet } from '../sheets/LayersSheet'
import { SightingSheet } from '../sheets/SightingSheet'
import { WaterSheet, type WaterHit } from '../sheets/WaterSheet'
import { LandSheet, type LandHit } from '../sheets/LandSheet'
import { managerForSymbol } from '../lib/publicland'

export type Selection =
  | { type: 'gauge'; gauge: Gauge }
  | { type: 'stream'; hit: StreamHit }
  | { type: 'marker'; marker?: Marker; point: LngLat; preset?: Partial<Marker> }
  | { type: 'place'; place: Place }
  | { type: 'layers' }
  | { type: 'sighting'; sighting: Sighting }
  | { type: 'water'; hit: WaterHit }
  | { type: 'land'; hit: LandHit }

const US_CENTER: [number, number] = [-98.35, 39.5]

export function MapScreen({ active }: { active: boolean }) {
  const settings = useSettings()
  const toast = useToast()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [ready, setReady] = useState(0) // bumps on every style load
  const [basemapDown, setBasemapDown] = useState(false)
  const [sel, setSel] = useState<Selection | null>(null)
  const [hints, setHints] = useState<{ gauges?: string; places?: string; sightings?: string }>({})
  const gauges = useGauges()
  const places = usePlaces()
  const sightings = useSightings()
  const catches = useLiveQuery(() => db.catches.toArray(), [])
  const markers = useLiveQuery(() => db.markers.toArray(), [])
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const cancelAutoLocate = useRef<() => void>(() => {})

  // Create the map once; it stays mounted while other tabs are open.
  useEffect(() => {
    let cancelled = false
    let fellBack = false
    let styleLoaded = false
    let longPress: ReturnType<typeof setTimeout> | undefined
    // Read now: the ?focus= link is cleared from the address bar before the map finishes loading.
    const openedWith = window.location.search
    void getSettings().then((s) => {
      if (cancelled || !container.current) return
      const map = new maplibregl.Map({
        container: container.current,
        style: STYLE_URL,
        center: s.lastView ? [s.lastView.lon, s.lastView.lat] : US_CENTER,
        zoom: s.lastView?.zoom ?? 3.5,
        attributionControl: { compact: true },
        maxPitch: 0,
      })
      mapRef.current = map
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'top-right')
      const geo = new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        fitBoundsOptions: { maxZoom: 13 },
      })
      map.addControl(geo, 'top-right')
      // The launch-time locate waits for a GPS fix; if the angler pans or searches first,
      // the fix would yank the map back to them. Turn that pending locate off instead.
      let autoLocating = false
      cancelAutoLocate.current = () => {
        if (!autoLocating) return
        autoLocating = false
        geo.trigger() // waiting → off
      }
      geo.on('geolocate', (e: GeolocationPosition) => {
        autoLocating = false
        void updateSettings({ lastFix: { lat: e.coords.latitude, lon: e.coords.longitude, at: Date.now() } })
      })
      // Errors, or the angler tapping the locate button themselves, end the launch-time locate.
      for (const ev of ['error', 'trackuserlocationend'] as const) {
        geo.on(ev, () => {
          autoLocating = false
        })
      }
      let movedByHand = false
      map.on('movestart', (e) => {
        if (!e.originalEvent) return
        movedByHand = true
        cancelAutoLocate.current()
      })
      map.addControl(new maplibregl.ScaleControl({ unit: s.units === 'metric' ? 'metric' : 'imperial' }), 'bottom-left')

      map.on('style.load', () => {
        styleLoaded = true
        addOverlays(map, settingsRef.current.basemap)
        setLayerVisibility(map, settingsRef.current.layers)
        setReady((n) => n + 1)
      })
      map.on('error', (e) => {
        // The basemap style couldn't load (offline on first run, host down): keep the app usable.
        const url = (e.error as { url?: string } | undefined)?.url
        if (!fellBack && !styleLoaded && (url === STYLE_URL || /styles\/liberty/.test(String(e.error?.message)))) {
          fellBack = true
          setBasemapDown(true)
          map.setStyle(FALLBACK_STYLE)
        } else if (import.meta.env.DEV) console.warn(e.error)
      })
      map.on('moveend', () => {
        const c = map.getCenter()
        void updateSettings({ lastView: { lat: round(c.lat), lon: round(c.lng), zoom: round(map.getZoom()) } })
        void loadVisible()
      })
      map.on('click', (e) => onMapClick(map, e.point, e.lngLat))
      map.on('contextmenu', (e) => setSel({ type: 'marker', point: { lat: e.lngLat.lat, lon: e.lngLat.lng } }))
      map.on('touchstart', (e) => {
        clearTimeout(longPress)
        if (e.points.length !== 1) return
        const at = e.lngLat
        longPress = setTimeout(() => setSel({ type: 'marker', point: { lat: at.lat, lon: at.lng } }), 600)
      })
      for (const ev of ['touchend', 'touchmove', 'movestart', 'touchcancel'] as const) map.on(ev, () => clearTimeout(longPress))
      map.on('load', () => {
        void loadVisible()
        // Open on the angler, zoomed in far enough that gauges, fish records and access points load around them.
        void shouldLocateOnOpen(navigator, openedWith).then((go) => {
          if (!go || cancelled || movedByHand) return
          geo.trigger()
          autoLocating = true
        })
      })
    })
    return () => {
      cancelled = true
      clearTimeout(longPress)
      mapRef.current?.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onMapClick = (map: maplibregl.Map, point: maplibregl.Point, lngLat: maplibregl.LngLat) => {
    const layers = HIT_LAYERS.filter((id) => map.getLayer(id) && map.getLayoutProperty(id, 'visibility') !== 'none')
    const box: [maplibregl.PointLike, maplibregl.PointLike] = [
      [point.x - 10, point.y - 10],
      [point.x + 10, point.y + 10],
    ]
    const hits = layers.length ? map.queryRenderedFeatures(box, { layers }) : []
    const pick = (layer: string): MapGeoJSONFeature | undefined => hits.find((h) => h.layer.id === layer)
    const m = pick('markers-circle')
    if (m) {
      void db.markers.get(String(m.properties.id)).then((marker) => marker && setSel({ type: 'marker', marker, point: { lat: marker.lat, lon: marker.lon } }))
      return
    }
    const c = pick('catches-circle')
    if (c) return nav(`/catch/${c.properties.id}`)
    const g = pick('gauges-circle')
    const gauge = g && gaugeStore.get(String(g.properties.id))
    if (gauge) return setSel({ type: 'gauge', gauge })
    const fs = pick('sightings-circle')
    const sighting = fs && sightingStore.get(String(fs.properties.id))
    if (sighting) return setSel({ type: 'sighting', sighting })
    const p = pick('places-circle')
    const place = p && placeStore.get(String(p.properties.id))
    if (place) return setSel({ type: 'place', place })
    const s = pick('streams-hit')
    if (s) {
      const props = s.properties
      const name = (props['name:en'] || props.name_en || props.name || undefined) as string | undefined
      return setSel({
        type: 'stream',
        hit: { name, kind: String(props.class ?? 'stream'), intermittent: props.intermittent === 1, lat: lngLat.lat, lon: lngLat.lng },
      })
    }
    const w = pick('water-hit')
    if (w) {
      // Water polygons carry no names; the label layer near the tap usually does.
      const nameLayers = waterNameLayers(map)
      const labels = nameLayers.length
        ? map.queryRenderedFeatures(
            [
              [point.x - 80, point.y - 60],
              [point.x + 80, point.y + 60],
            ],
            { layers: nameLayers },
          )
        : []
      const name = labels.map((l) => (l.properties['name:en'] || l.properties.name_en || l.properties.name) as string | undefined).find(Boolean)
      return setSel({ type: 'water', hit: { name, kind: String(w.properties.class ?? 'lake'), lat: lngLat.lat, lon: lngLat.lng } })
    }
    const land = pick('land-fill')
    if (land) return setSel({ type: 'land', hit: { lat: lngLat.lat, lon: lngLat.lng, manager: managerForSymbol(land.properties._symbol) } })
    setSel(null)
  }

  const loadVisible = useCallback(async () => {
    const map = mapRef.current
    if (!map) return
    const s = settingsRef.current
    const z = map.getZoom()
    const b = map.getBounds()
    const bbox: BBox = { west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() }

    if (s.layers.gauges) {
      const cells = z >= GAUGE_MIN_ZOOM ? cellsForBBox(bbox, GAUGE_CELL_DEG, 6) : null
      if (!cells) setHints((h) => ({ ...h, gauges: 'Zoom in to see river gauges' }))
      else {
        setHints((h) => ({ ...h, gauges: undefined }))
        for (const cell of cells) {
          try {
            const r = await loadGaugeCell(cell, s.usgsApiKey)
            gaugeStore.upsert(r.data)
            if (r.stale) setHints((h) => ({ ...h, gauges: 'Showing saved gauge readings' }))
          } catch (e) {
            const limited = e instanceof FetchError && e.status === 429
            setHints((h) => ({
              ...h,
              gauges: limited ? 'USGS hourly limit reached. A free API key in Settings raises it.' : 'Gauges unavailable right now',
            }))
            if (limited) break
          }
        }
      }
    } else setHints((h) => ({ ...h, gauges: undefined }))

    if (s.layers.sightings) {
      const cells = z >= SIGHTING_MIN_ZOOM ? cellsForBBox(bbox, SIGHTING_CELL_DEG, 6) : null
      if (!cells) setHints((h) => ({ ...h, sightings: 'Zoom in to see where fish have been recorded' }))
      else {
        setHints((h) => ({ ...h, sightings: undefined }))
        for (const cell of cells) {
          try {
            sightingStore.upsert((await loadSightingsCell(cell)).data)
          } catch {
            setHints((h) => ({ ...h, sightings: 'Fish sightings unavailable right now' }))
            break
          }
        }
      }
    } else setHints((h) => ({ ...h, sightings: undefined }))

    if (s.layers.amenities) {
      const cells = z >= AMENITY_MIN_ZOOM ? cellsForBBox(bbox, AMENITY_CELL_DEG, 6) : null
      if (!cells) setHints((h) => ({ ...h, places: 'Zoom in to see shops, ramps and access' }))
      else {
        setHints((h) => ({ ...h, places: undefined }))
        for (const cell of cells) {
          try {
            placeStore.upsert((await loadPlacesCell(cell)).data)
          } catch {
            setHints((h) => ({ ...h, places: 'Places unavailable right now' }))
            break
          }
        }
      }
    } else setHints((h) => ({ ...h, places: undefined }))
  }, [])

  // Push data into the map sources whenever it changes.
  useEffect(() => {
    const src = mapRef.current?.getSource('gauges') as GeoJSONSource | undefined
    src?.setData({
      type: 'FeatureCollection',
      features: gauges.map((g) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [g.lon, g.lat] },
        properties: {
          id: g.id,
          band: g.tempC != null ? troutTempBand(g.tempC) : 'none',
          label: [g.flowCfs != null ? formatFlow(g.flowCfs, settings.units) : null, g.tempC != null ? formatTemp(g.tempC, settings.units) : null]
            .filter(Boolean)
            .join(' · '),
        },
      })),
    })
  }, [gauges, ready, settings.units])

  useEffect(() => {
    const src = mapRef.current?.getSource('sightings') as GeoJSONSource | undefined
    src?.setData({
      type: 'FeatureCollection',
      features: sightings.map((x) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [x.lon, x.lat] }, properties: { id: x.id } })),
    })
  }, [sightings, ready])

  useEffect(() => {
    const src = mapRef.current?.getSource('places') as GeoJSONSource | undefined
    src?.setData({
      type: 'FeatureCollection',
      features: places.map((p) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lon, p.lat] }, properties: { id: p.id, kind: p.kind } })),
    })
  }, [places, ready])

  useEffect(() => {
    const src = mapRef.current?.getSource('catches') as GeoJSONSource | undefined
    src?.setData({
      type: 'FeatureCollection',
      features: (catches ?? [])
        .filter((c) => c.lat != null && c.lon != null)
        .map((c) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [c.lon!, c.lat!] }, properties: { id: c.id } })),
    })
  }, [catches, ready])

  useEffect(() => {
    const src = mapRef.current?.getSource('markers') as GeoJSONSource | undefined
    src?.setData({
      type: 'FeatureCollection',
      features: (markers ?? []).map((m) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [m.lon, m.lat] }, properties: { id: m.id, name: m.name } })),
    })
  }, [markers, ready])

  // Keyed on content: lastView updates on every pan and must not re-run this.
  const layersKey = JSON.stringify(settings.layers)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    setLayerVisibility(map, settingsRef.current.layers)
    setBasemap(map, settingsRef.current.basemap)
    void loadVisible()
  }, [layersKey, settings.basemap, settings.usgsApiKey, ready, loadVisible])

  // The map was display:none while another tab was open; it needs its size back.
  useEffect(() => {
    if (active) requestAnimationFrame(() => mapRef.current?.resize())
  }, [active])

  // /?focus=lat,lon,zoom from other screens (catch detail, search).
  const focus = params.get('focus')
  useEffect(() => {
    const map = mapRef.current
    if (!focus || !map) return
    const [lat, lon, zoom] = focus.split(',').map(Number)
    cancelAutoLocate.current()
    if (Number.isFinite(lat) && Number.isFinite(lon)) map.flyTo({ center: [lon, lat], zoom: Number.isFinite(zoom) ? zoom : 14, maxDuration: 1500 })
    setParams({}, { replace: true })
  }, [focus, ready, setParams])

  const flyTo = (p: LngLat, zoom = 14) => {
    cancelAutoLocate.current()
    mapRef.current?.flyTo({ center: [p.lon, p.lat], zoom, maxDuration: 1500 })
  }

  return (
    <div className="relative h-full w-full">
      {/* MapLibre styles its container position:relative, so size it explicitly. */}
      <div ref={container} className="h-full w-full" data-testid="map" />
      <SearchBar onPick={(r) => flyTo(r, r.zoom)} onError={(m) => toast(m, 'error')} />

      <div className="absolute right-[10px] top-[calc(env(safe-area-inset-top)+214px)] z-10 flex flex-col gap-2">
        <IconButton floating label="Map layers and offline" aria-pressed={sel?.type === 'layers'} onClick={() => setSel(sel?.type === 'layers' ? null : { type: 'layers' })}>
          <Layers size={20} />
        </IconButton>
        <IconButton
          floating
          label="Add a marker at the map center"
          onClick={() => {
            const c = mapRef.current?.getCenter()
            if (c) setSel({ type: 'marker', point: { lat: c.lat, lon: c.lng } })
          }}
        >
          <MapPinPlus size={20} />
        </IconButton>
      </div>

      {sel?.type === 'marker' && !sel.marker ? (
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 z-10 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent" />
      ) : null}

      <div className="bottom-tabbar pointer-events-none absolute left-2 z-10 mb-10 flex max-w-[70%] flex-col items-start gap-1" aria-live="polite">
        {basemapDown ? <Hint>Basemap unavailable. Showing your data only.</Hint> : null}
        {settings.layers.gauges && hints.gauges ? <Hint>{hints.gauges}</Hint> : null}
        {settings.layers.amenities && hints.places ? <Hint>{hints.places}</Hint> : null}
        {settings.layers.sightings && hints.sightings && !hints.gauges ? <Hint>{hints.sightings}</Hint> : null}
      </div>

      {sel?.type === 'gauge' ? <GaugeSheet gauge={sel.gauge} onClose={() => setSel(null)} /> : null}
      {sel?.type === 'stream' ? (
        <StreamSheet
          hit={sel.hit}
          onClose={() => setSel(null)}
          onGauge={(gauge) => setSel({ type: 'gauge', gauge })}
          onAddMarker={(p, name) => setSel({ type: 'marker', point: p, preset: { name: name ? `${name} access` : '', kind: 'access' } })}
        />
      ) : null}
      {sel?.type === 'marker' ? <MarkerSheet key={sel.marker?.id ?? `${sel.point.lat},${sel.point.lon}`} marker={sel.marker} point={sel.point} preset={sel.preset} onClose={() => setSel(null)} /> : null}
      {sel?.type === 'place' ? (
        <PlaceSheet
          place={sel.place}
          onClose={() => setSel(null)}
          onSave={(p) => setSel({ type: 'marker', point: { lat: p.lat, lon: p.lon }, preset: { name: p.name ?? '', kind: p.kind === 'parking' ? 'parking' : p.kind === 'bridge' ? 'bridge' : p.kind === 'camp' ? 'camp' : 'access' } })}
        />
      ) : null}
      {sel?.type === 'sighting' ? <SightingSheet sighting={sel.sighting} onClose={() => setSel(null)} /> : null}
      {sel?.type === 'water' ? <WaterSheet hit={sel.hit} onClose={() => setSel(null)} /> : null}
      {sel?.type === 'land' ? (
        <LandSheet
          key={`${sel.hit.lat},${sel.hit.lon}`}
          hit={sel.hit}
          onClose={() => setSel(null)}
          onAddMarker={(p, name) => setSel({ type: 'marker', point: p, preset: { name: name ? `${name} access` : '', kind: 'access' } })}
        />
      ) : null}
      {sel?.type === 'layers' ? <LayersSheet map={mapRef.current} onClose={() => setSel(null)} /> : null}
    </div>
  )
}

function Hint({ children }: { children: string }) {
  return <p className="rounded-full bg-raised/95 px-3 py-1.5 text-xs font-semibold text-text shadow-card">{children}</p>
}

function SearchBar({ onPick, onError }: { onPick: (r: SearchResult) => void; onError: (msg: string) => void }) {
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!q.trim()) return
    setBusy(true)
    try {
      setResults(await searchPlaces(q))
    } catch (err) {
      onError(err instanceof Error ? `Search failed: ${err.message}` : 'Search failed')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="pt-safe absolute left-2 right-[64px] top-2 z-10 max-w-md">
      <form role="search" onSubmit={submit} className="flex items-center gap-1 rounded-full bg-raised pl-3 shadow-pop">
        <Search size={18} className="shrink-0 text-muted" aria-hidden />
        <label htmlFor="map-search" className="sr-only">
          Search for a place or river
        </label>
        <input
          id="map-search"
          type="search"
          enterKeyHint="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a river, town or park"
          className="min-h-11 min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-muted"
        />
        {results ? (
          <IconButton
            label="Clear search"
            onClick={() => {
              setResults(null)
              setQ('')
            }}
          >
            <X size={18} />
          </IconButton>
        ) : (
          <button type="submit" disabled={busy} className="min-h-11 rounded-full px-3 text-sm font-semibold text-accent">
            {busy ? 'Searching…' : 'Go'}
          </button>
        )}
      </form>
      {results ? (
        <ul className="mt-2 max-h-[50dvh] overflow-y-auto rounded-md bg-raised shadow-pop" aria-label="Search results">
          {results.length === 0 ? <li className="px-4 py-3 text-sm text-muted">No places found.</li> : null}
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="flex w-full flex-col items-start px-4 py-3 text-left hover:bg-surface"
                onClick={() => {
                  onPick(r)
                  setResults(null)
                }}
              >
                <span className="font-semibold">{r.name}</span>
                <span className="text-xs text-muted">{r.detail}</span>
              </button>
            </li>
          ))}
          <li className="px-4 py-2 text-[11px] text-muted">Search by OpenStreetMap Nominatim</li>
        </ul>
      ) : null}
    </div>
  )
}

const round = (n: number) => Math.round(n * 1e4) / 1e4
