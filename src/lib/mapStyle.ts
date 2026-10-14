import type { Map as MlMap, StyleSpecification, ExpressionSpecification } from 'maplibre-gl'
import type { Basemap, LayerKey } from './db'
import { LAND_FILTER, LAND_MAX_TILE_ZOOM, LAND_MIN_ZOOM, LAND_SOURCE_LAYER, LAND_TILES, landColorExpression } from './publicland'

export const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'
export const BASE_SOURCE = 'openmaptiles'
export const LAND_SOURCE = 'padus'

/** Used when the basemap can't load (first run offline): your data on a plain background. */
export const FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: 'fallback-bg', type: 'background', paint: { 'background-color': '#e9e5dc' } }],
}

const RASTERS: Record<Exclude<Basemap, 'streets'>, { url: string; attribution: string; maxzoom: number }> = {
  topo: {
    url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}',
    attribution: 'USGS The National Map',
    maxzoom: 16,
  },
  imagery: {
    url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}',
    attribution: 'USGS The National Map: Orthoimagery',
    maxzoom: 16,
  },
}

/** Which of our layers belong to each toggle. */
export const LAYER_GROUPS: Record<LayerKey, string[]> = {
  streams: ['streams-casing', 'streams-line', 'streams-hit'],
  gauges: ['gauges-circle', 'gauges-label'],
  catches: ['catches-circle'],
  markers: ['markers-circle', 'markers-label'],
  amenities: ['places-circle'],
  sightings: ['sightings-circle'],
  publicLand: ['land-fill', 'land-line'],
}

/** Layers a tap can hit, best first. Public land is last: it sits under everything else. */
export const HIT_LAYERS = ['markers-circle', 'catches-circle', 'gauges-circle', 'sightings-circle', 'places-circle', 'streams-hit', 'water-hit', 'land-fill']

const css = (name: string, fallback: string) =>
  (typeof document !== 'undefined' && getComputedStyle(document.documentElement).getPropertyValue(`--tl-${name}`).trim()) || fallback

const EMPTY = { type: 'FeatureCollection' as const, features: [] }

export function addOverlays(map: MlMap, basemap: Basemap): void {
  const style = map.getStyle()
  const firstSymbol = style.layers.find((l) => l.type === 'symbol')?.id
  const hasGlyphs = !!style.glyphs
  const water = css('water', '#1f6f8b')
  const halo = css('raised', '#ffffff')

  for (const [key, r] of Object.entries(RASTERS)) {
    if (map.getSource(`usgs-${key}`)) continue
    map.addSource(`usgs-${key}`, { type: 'raster', tiles: [r.url], tileSize: 256, maxzoom: r.maxzoom, attribution: r.attribution })
    map.addLayer(
      { id: `basemap-${key}`, type: 'raster', source: `usgs-${key}`, layout: { visibility: basemap === key ? 'visible' : 'none' } },
      firstSymbol,
    )
  }

  if (map.getSource(BASE_SOURCE)) {
    // Streams from the basemap's own vector tiles, in a water colour with a
    // light casing so they never read as roads (see replica/fixes.md, F6).
    const filter: ExpressionSpecification = [
      'all',
      ['match', ['get', 'class'], ['river', 'stream'], true, false],
      ['!=', ['get', 'brunnel'], 'tunnel'],
    ]
    const common = { type: 'line' as const, source: BASE_SOURCE, 'source-layer': 'waterway', filter, layout: { 'line-cap': 'round' as const, 'line-join': 'round' as const } }
    map.addLayer(
      {
        ...common,
        id: 'streams-casing',
        paint: { 'line-color': halo, 'line-opacity': 0.9, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 2, 12, 5, 16, 10] },
      },
      firstSymbol,
    )
    map.addLayer(
      {
        ...common,
        id: 'streams-line',
        paint: { 'line-color': water, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 12, 2.5, 16, 5.5] },
      },
      firstSymbol,
    )
    map.addLayer({ ...common, id: 'streams-hit', paint: { 'line-color': water, 'line-opacity': 0.01, 'line-width': 20 } })
    // Lakes, ponds and wide rivers: an invisible fill so a tap on open water opens it.
    map.addLayer(
      {
        id: 'water-hit',
        type: 'fill',
        source: BASE_SOURCE,
        'source-layer': 'water',
        filter: ['match', ['get', 'class'], ['lake', 'river', 'pond', 'dock', 'ocean'], true, false],
        paint: { 'fill-color': water, 'fill-opacity': 0.01 },
      },
      'streams-casing',
    )
  }

  addPublicLand(map, map.getLayer('water-hit') ? 'water-hit' : firstSymbol)

  for (const id of ['places', 'sightings', 'gauges', 'catches', 'markers']) if (!map.getSource(id)) map.addSource(id, { type: 'geojson', data: EMPTY })

  map.addLayer({
    id: 'sightings-circle',
    type: 'circle',
    source: 'sightings',
    minzoom: 9,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 3, 14, 6],
      'circle-color': css('sighting', '#6a4c9c'),
      'circle-opacity': 0.85,
      'circle-stroke-color': halo,
      'circle-stroke-width': 1,
    },
  })

  map.addLayer({
    id: 'places-circle',
    type: 'circle',
    source: 'places',
    minzoom: 11,
    paint: {
      'circle-radius': 6,
      'circle-color': [
        'match',
        ['get', 'kind'],
        'shop', css('accent', '#a6461a'),
        'slipway', water,
        'camp', css('success', '#2b6e2f'),
        'bridge', css('cold', '#2a5f9e'),
        'fishing', css('accent-strong', '#8a3812'),
        'pier', css('accent-strong', '#8a3812'),
        css('text-muted', '#5e574b'),
      ],
      'circle-stroke-color': halo,
      'circle-stroke-width': 1.5,
    },
  })
  map.addLayer({
    id: 'gauges-circle',
    type: 'circle',
    source: 'gauges',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 5, 12, 8],
      'circle-color': [
        'match',
        ['get', 'band'],
        'prime', css('success', '#2b6e2f'),
        'cool', css('cold', '#2a5f9e'),
        'cold', css('cold', '#2a5f9e'),
        'warm', css('warning', '#8f5200'),
        'stress', css('danger', '#b42318'),
        water,
      ],
      'circle-stroke-color': halo,
      'circle-stroke-width': 2,
    },
  })
  map.addLayer({
    id: 'catches-circle',
    type: 'circle',
    source: 'catches',
    paint: { 'circle-radius': 6, 'circle-color': css('accent', '#a6461a'), 'circle-stroke-color': halo, 'circle-stroke-width': 2 },
  })
  map.addLayer({
    id: 'markers-circle',
    type: 'circle',
    source: 'markers',
    paint: { 'circle-radius': 7, 'circle-color': css('text', '#1c1a16'), 'circle-stroke-color': halo, 'circle-stroke-width': 2.5 },
  })
  if (hasGlyphs) {
    const text = {
      'text-font': ['Noto Sans Regular'],
      'text-size': 11,
      'text-offset': [0, 1.3] as [number, number],
      'text-anchor': 'top' as const,
      'text-optional': true,
    }
    map.addLayer({
      id: 'gauges-label',
      type: 'symbol',
      source: 'gauges',
      minzoom: 10,
      layout: { ...text, 'text-field': ['get', 'label'] },
      paint: { 'text-color': css('text', '#1c1a16'), 'text-halo-color': halo, 'text-halo-width': 1.5 },
    })
    map.addLayer({
      id: 'markers-label',
      type: 'symbol',
      source: 'markers',
      minzoom: 12,
      layout: { ...text, 'text-field': ['get', 'name'] },
      paint: { 'text-color': css('text', '#1c1a16'), 'text-halo-color': halo, 'text-halo-width': 1.5 },
    })
  }
}

/**
 * USGS PAD-US public land, tinted by manager and outlined, above the raster
 * basemaps (so it shows on topo and satellite) and under streams and pins.
 */
function addPublicLand(map: MlMap, before: string | undefined): void {
  if (map.getSource(LAND_SOURCE)) return
  map.addSource(LAND_SOURCE, {
    type: 'vector',
    tiles: [LAND_TILES],
    minzoom: LAND_MIN_ZOOM,
    maxzoom: LAND_MAX_TILE_ZOOM,
    attribution: 'Public land: USGS PAD-US',
  })
  const common = { source: LAND_SOURCE, 'source-layer': LAND_SOURCE_LAYER, minzoom: LAND_MIN_ZOOM, filter: LAND_FILTER }
  map.addLayer(
    {
      ...common,
      id: 'land-fill',
      type: 'fill',
      paint: { 'fill-color': landColorExpression(), 'fill-opacity': ['interpolate', ['linear'], ['zoom'], LAND_MIN_ZOOM, 0.3, 13, 0.2] },
    },
    before,
  )
  map.addLayer(
    {
      ...common,
      id: 'land-line',
      type: 'line',
      paint: { 'line-color': landColorExpression(), 'line-opacity': 0.85, 'line-width': ['interpolate', ['linear'], ['zoom'], LAND_MIN_ZOOM, 0.5, 13, 1.5, 16, 2.5] },
    },
    before,
  )
}

export function setBasemap(map: MlMap, basemap: Basemap): void {
  for (const key of Object.keys(RASTERS)) {
    if (map.getLayer(`basemap-${key}`)) map.setLayoutProperty(`basemap-${key}`, 'visibility', basemap === key ? 'visible' : 'none')
  }
}

export function setLayerVisibility(map: MlMap, layers: Record<LayerKey, boolean>): void {
  for (const [key, ids] of Object.entries(LAYER_GROUPS)) {
    for (const id of ids) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', layers[key as LayerKey] ? 'visible' : 'none')
  }
}

/** Style layers that label lakes and rivers, used to name the water someone tapped. */
export function waterNameLayers(map: MlMap): string[] {
  return map
    .getStyle()
    .layers.filter((l) => 'source-layer' in l && l['source-layer'] === 'water_name')
    .map((l) => l.id)
}

/** The vector tile URL template, for offline downloads. Undefined on the fallback style. */
export function vectorTileTemplate(map: MlMap): string | undefined {
  const src = map.getSource(BASE_SOURCE) as { tiles?: string[] } | undefined
  return src?.tiles?.[0]
}
