import { describe, expect, it } from 'vitest'
import { parsePredictions, parseStations, stageFits, tideNow, tideWindows } from './tides'
import { parseSeaTemp } from './marine'

// Boston, 2026-10-14 (GMT), from the real NOAA response shape.
const RAW = {
  predictions: [
    { t: '2026-10-14 06:12', v: '9.213', type: 'H' },
    { t: '2026-10-14 12:07', v: '1.318', type: 'L' },
    { t: '2026-10-14 18:16', v: '10.062', type: 'H' },
    { t: '2026-10-15 00:41', v: '0.518', type: 'L' },
    { t: 'garbage', v: '1', type: 'H' },
  ],
}
const at = (iso: string) => Date.parse(`${iso}Z`)

describe('tides', () => {
  it('parses NOAA highs and lows as UTC instants, dropping junk rows', () => {
    const ev = parsePredictions(RAW)
    expect(ev).toHaveLength(4)
    expect(ev[0]).toEqual({ t: at('2026-10-14T06:12'), type: 'high', ft: 9.2 })
    expect(ev[1].type).toBe('low')
    expect(() => parsePredictions({ error: { message: 'No Predictions data was found' } })).toThrow(/No Predictions/)
  })
  it('knows the stage of the tide now', () => {
    const ev = parsePredictions(RAW)
    expect(tideNow(ev, at('2026-10-14T15:00'))).toMatchObject({ stage: 'rising', next: { type: 'high' }, minutesToNext: 196 })
    expect(tideNow(ev, at('2026-10-14T09:00'))?.stage).toBe('falling')
    expect(tideNow(ev, at('2026-10-14T18:40'))?.stage).toBe('high-slack')
    expect(tideNow(ev, at('2026-10-14T11:40'))?.stage).toBe('low-slack')
    expect(tideNow(ev, at('2026-10-14T05:00'))).toBeUndefined() // before the first known turn
  })
  it('finds the windows a fish likes, clipped to the day', () => {
    const ev = parsePredictions(RAW)
    const day = [at('2026-10-14T00:00'), at('2026-10-15T00:00')] as const
    const rising = tideWindows(ev, 'rising', ...day)
    expect(rising).toEqual([{ start: at('2026-10-14T12:52'), end: at('2026-10-14T17:31') }])
    const falling = tideWindows(ev, 'falling', ...day)
    expect(falling.map((w) => new Date(w.start).toISOString().slice(11, 16))).toEqual(['06:57', '19:01'])
    expect(falling.at(-1)!.end).toBe(at('2026-10-14T23:56')) // stops short of the 00:41 slack
    expect(tideWindows(ev, 'falling', day[0], at('2026-10-14T20:00')).at(-1)!.end).toBe(at('2026-10-14T20:00')) // clipped to the range
    expect(tideWindows(ev, 'moving', ...day)).toHaveLength(3)
    expect(tideWindows(ev, 'slack', ...day)).toHaveLength(3) // 06:12, 12:07, 18:16 (00:41 is past the day)
  })
  it('matches stage to preference', () => {
    expect(stageFits('rising', 'moving')).toBe(true)
    expect(stageFits('high-slack', 'moving')).toBe(false)
    expect(stageFits('low-slack', 'slack')).toBe(true)
    expect(stageFits('falling', 'rising')).toBe(false)
  })
  it('sorts stations by our own distance and tidies shouted names', () => {
    const s = parseStations(
      {
        stationList: [
          { stationId: '8444162', name: 'BOSTON LIGHT', lat: 42.3283, lon: -70.8917 },
          { stationId: '8444012', name: 'FORT DAWES, BOSTON HARBOR', lat: 42.3483, lon: -70.96 },
          { name: 'no id', lat: 1, lon: 1 },
        ],
      },
      42.35,
      -70.95,
    )
    expect(s.map((x) => x.id)).toEqual(['8444012', '8444162'])
    expect(s[0].name).toBe('Fort Dawes, Boston Harbor')
    expect(s[0].km).toBeLessThan(1)
    expect(parseStations({ stationList: null }, 39.7, -105.2)).toEqual([])
  })
})

describe('sea temperature', () => {
  it('takes the reading for this hour in the place’s own time, and nothing if the data is stale', () => {
    const raw = { utc_offset_seconds: -4 * 3600, hourly: { time: ['2026-10-14T10:00', '2026-10-14T11:00', '2026-10-14T12:00'], sea_surface_temperature: [17.1, null, 17.6] } }
    // 15:50 UTC is 11:50 local: 11:00 is null, so the nearest reading is 12:00 local.
    expect(parseSeaTemp(raw, Date.parse('2026-10-14T15:50Z'))).toBe(17.6)
    expect(parseSeaTemp(raw, Date.parse('2026-10-15T15:50Z'))).toBeUndefined()
    expect(parseSeaTemp({}, Date.now())).toBeUndefined()
  })
})
