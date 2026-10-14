// Network fixtures for e2e tests. Shapes match the real APIs as checked on 2026-10-14.
// Nothing here talks to the real services: tests must never hammer public APIs.
import type { Page, Route } from '@playwright/test'

export const GOLDEN = { lat: 39.753056, lon: -105.234722 }
export const DENVER_OFFSET = -6 * 3600 // MDT

const STYLE = {
  version: 8,
  name: 'test',
  sources: {},
  layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#e9e5dc' } }],
}

export type MockCounts = { usgs: number; meteo: number; overpass: number; nominatim: number; inat: number; hubeau: number; stocking: number }

export type MockOptions = { styleFails?: boolean; /** flip at runtime to simulate losing signal for weather */ meteoDown?: boolean }

export async function mockNetwork(page: Page, opts: MockOptions = {}): Promise<MockCounts> {
  const counts: MockCounts = { usgs: 0, meteo: 0, overpass: 0, nominatim: 0, inat: 0, hubeau: 0, stocking: 0 }
  // Later routes win in Playwright, so the catch-all goes first.
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (r) => r.fulfill({ status: 204, body: '' }))
  await page.route(/tiles\.openfreemap\.org\/styles\/liberty/, (r) => (opts.styleFails ? r.abort('internetdisconnected') : r.fulfill({ json: STYLE })))
  await page.route(/api\.waterdata\.usgs\.gov/, (r) => {
    counts.usgs++
    return usgs(r)
  })
  await page.route(/api\.open-meteo\.com/, (r) => {
    counts.meteo++
    if (opts.meteoDown) return r.abort('internetdisconnected')
    return r.fulfill({ json: meteo(r.request().url()) })
  })
  await page.route(/nominatim\.openstreetmap\.org/, (r) => {
    counts.nominatim++
    return r.fulfill({
      json: [
        { place_id: 1, lat: String(GOLDEN.lat), lon: String(GOLDEN.lon), display_name: 'Clear Creek, Golden, Jefferson County, Colorado, United States', name: 'Clear Creek', class: 'waterway', type: 'river' },
      ],
    })
  })
  await page.route(/overpass-api\.de/, (r) => {
    counts.overpass++
    const body = decodeURIComponent((r.request().postData() ?? '').replace(/^data=/, '').replace(/\+/g, ' '))
    if (body.includes('is_in(')) return r.fulfill({ json: water(body) })
    return r.fulfill({
      json: {
        elements: [
          { type: 'node', id: 101, lat: GOLDEN.lat + 0.002, lon: GOLDEN.lon + 0.002, tags: { shop: 'fishing', name: 'Test Fly Shop' } },
          { type: 'way', id: 202, center: { lat: GOLDEN.lat - 0.001, lon: GOLDEN.lon }, tags: { amenity: 'parking' } },
        ],
      },
    })
  })
  await page.route(/api\.inaturalist\.org/, (r) => {
    counts.inat++
    return r.fulfill({ json: inat(r.request().url()) })
  })
  await page.route(/hubeau\.eaufrance\.fr/, (r) => {
    counts.hubeau++
    return r.fulfill({
      status: 206,
      json: {
        count: 3,
        data: [
          { nom_latin_taxon: 'Salmo trutta', nom_commun_taxon: 'Truite de rivière', effectif_lot: 12 },
          { nom_latin_taxon: 'Salmo trutta', nom_commun_taxon: 'Truite de rivière', effectif_lot: 3 },
          { nom_latin_taxon: 'Esox lucius', nom_commun_taxon: 'Brochet', effectif_lot: 2 },
          { nom_latin_taxon: 'Phoxinus phoxinus', nom_commun_taxon: 'Vairon', effectif_lot: 40 },
        ],
      },
    })
  })
  // NOAA tides: one station near the test coast, and a high/low every ~6 h around now.
  await page.route(/api\.tidesandcurrents\.noaa\.gov\/mdapi/, (r) =>
    r.fulfill({ json: { stationList: [{ stationId: '8735180', name: 'DAUPHIN ISLAND', lat: PLACES.coast.lat + 0.02, lon: PLACES.coast.lon }] } }),
  )
  await page.route(/api\.tidesandcurrents\.noaa\.gov\/api/, (r) => r.fulfill({ json: { predictions: tidePredictions() } }))
  await page.route(/marine-api\.open-meteo\.com/, (r) => {
    const hour = new Date().toISOString().slice(0, 13)
    return r.fulfill({ json: { utc_offset_seconds: 0, hourly: { time: [`${hour}:00`], sea_surface_temperature: [21.5] } } })
  })
  await page.route(/services3\.arcgis\.com\/.*FISH_PLANTS/, (r) => {
    counts.stocking++
    return r.fulfill({
      json: {
        features: [
          { attributes: { WATERBODY: 'Missoula Kids Pond', SPECIES: 'Rainbow Trout', NUMFISH: 264, FISHSIZE: 10.4, PLANTDATE: Date.parse('2026-06-09T00:00:00Z') } },
          { attributes: { WATERBODY: 'Missoula Kids Pond', SPECIES: 'Westslope Cutthroat Trout', NUMFISH: 525, FISHSIZE: 9.8, PLANTDATE: Date.parse('2026-05-28T00:00:00Z') } },
        ],
      },
    })
  })
  return counts
}

/** Special test places: */
export const PLACES = {
  /** a named lake (Overpass says we're inside it) */
  lake: { lat: 39.705, lon: -105.11 },
  /** nothing recorded nearby, so the plan falls back to typical fish */
  empty: { lat: 45.0, lon: -93.2 },
  /** salt water */
  coast: { lat: 30.0, lon: -88.0 },
  /** France, with official surveys */
  france: { lat: 45.19, lon: 5.72 },
  /** Montana, with stocking reports */
  montana: { lat: 46.8721, lon: -114.006 },
  /** a public fish sighting (and nothing else) */
  sighting: { lat: 39.7400666, lon: -105.2701633 },
}

function water(body: string) {
  const m = /is_in\(([-\d.]+),([-\d.]+)\)/.exec(body)
  const lat = Number(m?.[1])
  const sep = { type: 'sep', id: 1, tags: { kind: 'near' } }
  if (Math.abs(lat - PLACES.lake.lat) < 0.01)
    return {
      elements: [
        { type: 'way', id: 5, tags: { natural: 'water', water: 'lake', name: 'Test Lake' }, bounds: { minlat: 39.69, minlon: -105.13, maxlat: 39.72, maxlon: -105.09 } },
        sep,
      ],
    }
  if (Math.abs(lat - PLACES.coast.lat) < 0.01) return { elements: [sep, { type: 'way', id: 6, tags: { natural: 'coastline' } }] }
  if (Math.abs(lat - PLACES.montana.lat) < 0.01)
    return { elements: [{ type: 'way', id: 7, tags: { natural: 'water', water: 'pond', name: 'Missoula Kids Pond' }, bounds: { minlat: 46.871, minlon: -114.007, maxlat: 46.873, maxlon: -114.005 } }, sep] }
  return { elements: [sep, { type: 'way', id: 8, tags: { waterway: 'river', name: 'Clear Creek' } }] }
}

function inat(rawUrl: string) {
  const url = new URL(rawUrl)
  const lat = Number(url.searchParams.get('lat') ?? url.searchParams.get('swlat'))
  if (Math.abs(lat - PLACES.empty.lat) < 0.01 || Math.abs(lat - PLACES.france.lat) < 0.01) return { total_results: 0, results: [] }
  const taxon = (name: string, common: string) => ({ name, preferred_common_name: common, rank: 'species' })
  if (url.pathname.endsWith('/species_counts')) {
    return {
      total_results: 4,
      results: [
        { count: 14, taxon: taxon('Salmo trutta', 'Brown Trout') },
        { count: 10, taxon: taxon('Micropterus nigricans', 'Largemouth Bass') },
        { count: 6, taxon: taxon('Oncorhynchus mykiss', 'Rainbow Trout') },
        { count: 3, taxon: taxon('Catostomus commersonii', 'White Sucker') },
      ],
    }
  }
  return {
    total_results: 2,
    results: [
      { id: 383819682, uri: 'https://www.inaturalist.org/observations/383819682', observed_on: '2026-07-21', obscured: false, geojson: { type: 'Point', coordinates: [PLACES.sighting.lon, PLACES.sighting.lat] }, license_code: 'cc-by-nc', taxon: taxon('Oncorhynchus mykiss', 'Rainbow Trout'), user: { login: 'test_observer' } },
      { id: 2, uri: 'https://www.inaturalist.org/observations/2', observed_on: '2026-07-20', obscured: true, geojson: { type: 'Point', coordinates: [-105.2, 39.75] }, license_code: null, taxon: taxon('Salmo trutta', 'Brown Trout'), user: { login: 'hidden' } },
    ],
  }
}

function usgs(r: Route) {
  const url = new URL(r.request().url())
  const now = Date.now()
  if (url.pathname.endsWith('/latest-continuous/items')) {
    const feat = (id: string, code: string, time: number, value: string | null, lon: number, lat: number) => ({
      type: 'Feature',
      properties: { monitoring_location_id: id, parameter_code: code, time: new Date(time).toISOString(), value },
      geometry: { type: 'Point', coordinates: [lon, lat] },
    })
    return r.fulfill({
      json: {
        type: 'FeatureCollection',
        features: [
          feat('USGS-06719505', '00060', now - 15 * 60e3, '71.8', GOLDEN.lon, GOLDEN.lat),
          feat('USGS-06719505', '00010', now - 15 * 60e3, '12.5', GOLDEN.lon, GOLDEN.lat),
          // a retired gauge: must not appear
          feat('USGS-06718300', '00060', Date.parse('2005-10-01T05:45:00Z'), '84.0', -105.436105, 39.746376),
          // a live gauge with a null reading: must not appear
          feat('USGS-06719560', '00060', now - 30 * 60e3, null, -105.148833, 39.740402),
        ],
        links: [],
      },
    })
  }
  if (url.pathname.includes('/monitoring-locations/items/')) {
    return r.fulfill({ json: { type: 'Feature', id: 'USGS-06719505', properties: { monitoring_location_name: 'CLEAR CREEK AT GOLDEN, CO' }, geometry: null } })
  }
  if (url.pathname.endsWith('/continuous/items')) {
    const features = []
    for (let h = 7 * 24; h >= 0; h--) {
      const t = new Date(now - h * 3600e3).toISOString()
      features.push({ type: 'Feature', properties: { parameter_code: '00060', time: t, value: String(60 + (7 * 24 - h) * 0.07) }, geometry: null })
      features.push({ type: 'Feature', properties: { parameter_code: '00010', time: t, value: String(11 + 2 * Math.sin(h / 4)) }, geometry: null })
    }
    return r.fulfill({ json: { type: 'FeatureCollection', features, links: [] } })
  }
  return r.fulfill({ status: 404, json: {} })
}

/** An Open-Meteo-shaped forecast for any URL, in Denver time. */
export function meteo(rawUrl: string) {
  const url = new URL(rawUrl)
  const past = Number(url.searchParams.get('past_days') ?? 0)
  const days = past + Number(url.searchParams.get('forecast_days') ?? 7)
  const local = new Date(Date.now() + DENVER_OFFSET * 1000)
  const start = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - past)
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 16)
  const time: string[] = []
  for (let i = 0; i < days * 24; i++) time.push(iso(start + i * 3600e3))
  const dailyTime = Array.from({ length: days }, (_, d) => iso(start + d * 86400e3).slice(0, 10))
  return {
    latitude: Number(url.searchParams.get('latitude')),
    longitude: Number(url.searchParams.get('longitude')),
    timezone: 'America/Denver',
    utc_offset_seconds: DENVER_OFFSET,
    hourly: {
      time,
      temperature_2m: time.map((_, i) => 8 + 6 * Math.sin(((i % 24) - 9) / 3.8)),
      precipitation_probability: time.map(() => 10),
      precipitation: time.map(() => 0),
      weather_code: time.map(() => 2),
      cloud_cover: time.map(() => 40),
      pressure_msl: time.map((_, i) => 1016 - i * 0.05),
      wind_speed_10m: time.map(() => 9),
      wind_gusts_10m: time.map(() => 18),
    },
    daily: {
      time: dailyTime,
      weather_code: dailyTime.map(() => 2),
      temperature_2m_max: dailyTime.map(() => 16),
      temperature_2m_min: dailyTime.map(() => 2),
      precipitation_sum: dailyTime.map(() => 0),
      precipitation_probability_max: dailyTime.map(() => 10),
      temperature_2m_mean: dailyTime.map((_, d) => 6 + d * 0.3),
      wind_speed_10m_max: dailyTime.map(() => 14),
    },
  }
}

/** Reads every row of an IndexedDB store, without going through the app. */
export function readStore(page: Page, store: string): Promise<Record<string, unknown>[]> {
  return page.evaluate(
    (name) =>
      new Promise<Record<string, unknown>[]>((resolve, reject) => {
        const req = indexedDB.open('tailout')
        req.onerror = () => reject(req.error)
        req.onsuccess = () => {
          const tx = req.result.transaction(name, 'readonly')
          const all = tx.objectStore(name).getAll()
          all.onsuccess = () => {
            resolve(all.result as Record<string, unknown>[])
            req.result.close()
          }
          all.onerror = () => reject(all.error)
        }
      }),
    store,
  )
}

/** NOAA-shaped highs and lows (GMT) from yesterday to two days out, so "now" always falls between turns. */
function tidePredictions() {
  const start = Date.now() - 26 * 3600_000
  const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ')
  return Array.from({ length: 16 }, (_, i) => ({ t: fmt(start + i * 6.2 * 3600_000), v: i % 2 ? '0.3' : '2.1', type: i % 2 ? 'L' : 'H' }))
}
