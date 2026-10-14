import { describe, expect, it } from 'vitest'
import { cToF, formatFlow, formatLength, formatTemp, formatWeight, lengthInputValue, parseLength, parseWeight } from './units'
import { cellBBox, cellKey, cellsForBBox, coarsen, countTiles, distanceKm, tilesForBBox } from './geo'
import { parseHistory, parseLatest, STALE_MS, titleCase, trend24h, troutTempBand } from './usgs'
import { hourAt, localToEpoch, parseForecast, pressureTrend } from './weather'
import { parsePlaces } from './overpass'
import { planArea, MAX_AREA_TILES } from './offline'
import { streamKey } from './streams'
import { waterFromGaugeName } from '../sheets/GaugeSheet'
import { shouldLocateOnOpen } from './locate'
import { mergeSettings } from './settings'
import { DEFAULT_SETTINGS } from './db'

describe('units', () => {
  it('formats and parses both systems', () => {
    expect(formatLength(40.64, 'imperial')).toBe('16 in')
    expect(formatLength(40.6, 'metric')).toBe('40.6 cm')
    expect(formatWeight(907.18, 'imperial')).toBe('2 lb')
    expect(formatWeight(750, 'metric')).toBe('750 g')
    expect(formatTemp(12.5, 'imperial')).toBe('55°F')
    expect(formatFlow(1234, 'imperial')).toBe('1,234 cfs')
    expect(formatFlow(71.8, 'imperial')).toBe('71.8 cfs')
    expect(formatFlow(100, 'metric')).toBe('2.83 m³/s')
    expect(parseLength('16', 'imperial')).toBe(40.6)
    expect(parseLength('14,5', 'metric')).toBe(14.5)
    expect(parseLength('-3', 'metric')).toBeUndefined()
    expect(parseLength('abc', 'metric')).toBeUndefined()
    expect(parseWeight('1.5', 'metric')).toBe(1500)
    expect(lengthInputValue(40.64, 'imperial')).toBe('16')
    expect(cToF(20)).toBe(68)
  })
})

describe('geo', () => {
  it('cells are stable and bounded', () => {
    expect(cellKey(39.75, -105.23, 1)).toBe('1:39:-106')
    expect(cellBBox('1:39:-106')).toEqual({ south: 39, north: 40, west: -106, east: -105 })
    expect(cellsForBBox({ west: -105.3, south: 39.7, east: -105.1, north: 39.8 }, 1, 6)).toEqual(['1:39:-106'])
    expect(cellsForBBox({ west: -120, south: 30, east: -80, north: 45 }, 1, 6)).toBeNull()
  })
  it('coarsen moves a point by less than ~1 km and is stable', () => {
    const p = { lat: 39.753056, lon: -105.234722 }
    const c = coarsen(p, 1)
    expect(distanceKm(p, c)).toBeLessThan(0.75)
    expect(coarsen(c, 1)).toEqual(c)
  })
  it('tile counts match the tile list', () => {
    const b = { west: -105.3, south: 39.7, east: -105.1, north: 39.8 }
    expect(countTiles(b, [10, 11, 12])).toBe(tilesForBBox(b, [10, 11, 12]).length)
  })
})

describe('usgs', () => {
  const now = Date.parse('2026-10-14T16:00:00Z')
  const f = (id: string, code: string, time: string, value: string | null) => ({
    properties: { monitoring_location_id: id, parameter_code: code, time, value },
    geometry: { coordinates: [-105.2, 39.7] as [number, number] },
  })
  it('drops retired, null and sentinel series; keeps the newest sensor', () => {
    const gauges = parseLatest(
      {
        features: [
          f('USGS-1', '00060', '2026-10-14T15:45:00Z', '71.8'),
          f('USGS-1', '00010', '2026-10-14T15:45:00Z', '12.5'),
          f('USGS-1', '00010', '2026-10-14T10:00:00Z', '9.0'), // older second sensor
          f('USGS-2', '00060', '1981-10-01T04:45:00Z', '63.0'), // retired
          f('USGS-3', '00060', '2026-10-14T15:00:00Z', null), // empty
          f('USGS-4', '00060', '2026-10-14T15:00:00Z', '-999999'), // sentinel
        ],
      },
      now,
    )
    expect(gauges).toHaveLength(1)
    expect(gauges[0]).toMatchObject({ id: 'USGS-1', flowCfs: 71.8, tempC: 12.5, lat: 39.7, lon: -105.2 })
    expect(STALE_MS).toBeGreaterThan(0)
  })
  it('history is sorted per parameter, and the 24 h trend needs a real change', () => {
    const h = parseHistory({
      features: [f('x', '00060', '2026-10-14T12:00:00Z', '120'), f('x', '00060', '2026-10-13T12:00:00Z', '100'), f('x', '00010', '2026-10-14T12:00:00Z', '10')],
    })
    expect(h.flow.map((p) => p.v)).toEqual([100, 120])
    expect(trend24h(h.flow)).toBe('rising')
    expect(trend24h([{ t: 0, v: 100 }, { t: 86_400_000, v: 105 }])).toBe('steady')
    expect(trend24h([{ t: 0, v: 100 }])).toBeUndefined()
  })
  it('trout temperature bands at the 40/50/65/68°F edges', () => {
    expect(troutTempBand(4)).toBe('cold')
    expect(troutTempBand(5)).toBe('cool')
    expect(troutTempBand(12)).toBe('prime')
    expect(troutTempBand(19)).toBe('warm')
    expect(troutTempBand(20)).toBe('stress')
  })
  it('names read like names', () => {
    expect(titleCase('CLEAR CREEK AT GOLDEN, CO')).toBe('Clear Creek at Golden, CO')
    expect(titleCase('CRYSTAL CREEK AT U.S. HWY. 16 NEAR HOUSTON, MN')).toBe('Crystal Creek at U.S. Hwy. 16 near Houston, MN')
    expect(waterFromGaugeName('Clear Creek at Golden, CO')).toBe('Clear Creek')
    expect(waterFromGaugeName('Silver Creek near Houston, MN')).toBe('Silver Creek')
  })
})

describe('weather', () => {
  it('turns local wall-clock strings into instants', () => {
    expect(localToEpoch('2026-10-14T06:00', -6 * 3600)).toBe(Date.parse('2026-10-14T12:00:00Z'))
  })
  it('parses hourly data and computes a 3 h pressure trend', () => {
    const time = ['2026-10-14T00:00', '2026-10-14T01:00', '2026-10-14T02:00', '2026-10-14T03:00']
    const f = parseForecast({
      latitude: 1,
      longitude: 2,
      timezone: 'UTC',
      utc_offset_seconds: 0,
      hourly: {
        time,
        temperature_2m: [5, 6, 7, 8],
        pressure_msl: [1015, 1014, 1013, 1012.5],
        cloud_cover: [0, 0, 0, 0],
        weather_code: [0, 0, 0, null],
      },
      daily: { time: ['2026-10-14'] },
    })
    const t3 = Date.parse('2026-10-14T03:00:00Z')
    expect(hourAt(f, t3)?.tempC).toBe(8)
    expect(Number.isNaN(f.hours[3].code)).toBe(true)
    expect(pressureTrend(f, t3)).toEqual({ delta3h: -2.5, trend: 'falling' })
    expect(hourAt(f, t3 + 5 * 3_600_000)).toBeUndefined()
  })
})

describe('overpass', () => {
  it('classifies places and dedupes', () => {
    const places = parsePlaces({
      elements: [
        { type: 'node', id: 1, lat: 1, lon: 2, tags: { shop: 'fishing', name: 'Fly Shop' } },
        { type: 'node', id: 1, lat: 1, lon: 2, tags: { shop: 'fishing', name: 'Fly Shop' } },
        { type: 'way', id: 2, center: { lat: 3, lon: 4 }, tags: { highway: 'residential', bridge: 'yes', ref: 'CR 12' } },
        { type: 'way', id: 3, tags: { amenity: 'parking' } }, // no position
        { type: 'node', id: 4, lat: 5, lon: 6, tags: { amenity: 'bench' } }, // not ours
      ],
    })
    expect(places.map((p) => [p.kind, p.name])).toEqual([
      ['shop', 'Fly Shop'],
      ['bridge', 'CR 12'],
    ])
    expect(places[1].osmUrl).toBe('https://www.openstreetmap.org/way/2')
  })
})

describe('offline areas', () => {
  it('fits a valley under the cap and refuses a state', () => {
    const valley = planArea({ west: -105.3, south: 39.7, east: -105.15, north: 39.8 }, 12)
    expect('zooms' in valley && valley.tiles <= MAX_AREA_TILES && valley.zooms.at(-1)! <= 14).toBe(true)
    const state = planArea({ west: -109, south: 37, east: -102, north: 41 }, 7)
    expect('tooBig' in state).toBe(true)
  })
})

describe('streams', () => {
  it('keys notes by name and a 0.25° cell', () => {
    expect(streamKey(' Clear  Creek ', 39.75, -105.23)).toBe('clear creek@0.25:159:-421')
    expect(streamKey('Mill Creek', 39.75, -105.23)).not.toBe(streamKey('Mill Creek', 44.5, -72.1))
  })
})

describe('locate on open', () => {
  const geo = { geolocation: {} as Geolocation }
  const perm = (state: PermissionState) => ({ ...geo, permissions: { query: async () => ({ state }) as PermissionStatus } })
  it('centres on the angler unless location is off or a spot was linked', async () => {
    expect(await shouldLocateOnOpen(perm('granted'), '')).toBe(true)
    expect(await shouldLocateOnOpen(perm('prompt'), '')).toBe(true)
    expect(await shouldLocateOnOpen(perm('denied'), '')).toBe(false)
    expect(await shouldLocateOnOpen(perm('granted'), '?focus=45,-111,14')).toBe(false)
    expect(await shouldLocateOnOpen({ geolocation: undefined as unknown as Geolocation }, '')).toBe(false)
    const broken = { ...geo, permissions: { query: async () => Promise.reject(new TypeError('unsupported')) } }
    expect(await shouldLocateOnOpen(broken, '')).toBe(true)
  })
})

describe('settings migration', () => {
  it('turns nearby access points on once for old settings, then respects the choice', () => {
    const old = mergeSettings({ layers: { ...DEFAULT_SETTINGS.layers, amenities: false } })
    expect(old.layers.amenities).toBe(true)
    expect(old.layersRev).toBe(2)
    expect(mergeSettings({ ...old, layers: { ...old.layers, amenities: false } }).layers.amenities).toBe(false)
    expect(mergeSettings(undefined).layers.amenities).toBe(true)
  })
})
