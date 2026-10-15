import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db, type Catch } from './db'
import { applyPrivacy, saveCatch } from './catches'
import { csvCell, importExport, EXPORT_FORMAT } from './transfer'
import { solunarDay, phaseName } from './solunar'
import { bestWindows, dayRating, scoreHour } from './bite'
import type { Forecast } from './weather'

beforeEach(async () => {
  // No test may reach the network.
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('offline in tests'))))
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('privacy', () => {
  const p = { lat: 39.753056, lon: -105.234722 }
  it('hidden keeps nothing, water rounds, exact keeps 6 decimals', () => {
    expect(applyPrivacy(p, 'hidden')).toBeUndefined()
    expect(applyPrivacy(p, 'water')).not.toEqual(p)
    expect(applyPrivacy({ lat: 1.23456789, lon: 2 }, 'exact')).toEqual({ lat: 1.234568, lon: 2 })
  })
  it('a hidden catch is stored with no coordinates, and stays saved offline', async () => {
    const id = await saveCatch({ species: 'Brown trout', caughtAt: new Date().toISOString(), privacy: 'hidden', point: p })
    const c = await db.catches.get(id)
    expect(c).toBeDefined()
    expect(c!.lat).toBeUndefined()
    expect(c!.lon).toBeUndefined()
    expect(c!.conditions?.moonPhase).toBeTypeOf('number')
  })
})

describe('transfer', () => {
  it('neutralises spreadsheet formulas but keeps negative numbers', () => {
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)")
    expect(csvCell('-105.23')).toBe('-105.23')
    expect(csvCell('a,b')).toBe('"a,b"')
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
    expect(csvCell(undefined)).toBe('')
    // Starts with "-" and a digit, but is a formula, not a number.
    expect(csvCell("-1+cmd|' /C calc'!A0")).toBe("'-1+cmd|' /C calc'!A0")
    expect(csvCell(-12.5)).toBe('-12.5')
  })

  const base: Catch = { id: 'c1', species: 'Brown trout', caughtAt: '2026-10-01T12:00:00Z', privacy: 'exact', lat: 1, lon: 2, createdAt: '2026-10-01T12:00:00Z', updatedAt: '2026-10-01T12:00:00Z' }
  const file = (catches: unknown[]) => JSON.stringify({ format: EXPORT_FORMAT, version: 1, exportedAt: '', catches, markers: [], streamNotes: [] })

  it('rejects files that are not exports', async () => {
    await expect(importExport('not json')).rejects.toThrow('not valid JSON')
    await expect(importExport('{"a":1}')).rejects.toThrow('not a Tailout export')
  })
  it('imports, skips older copies, and refuses hidden catches that carry coordinates', async () => {
    expect((await importExport(file([base]))).catches).toBe(1)
    const r = await importExport(file([{ ...base, species: 'older', updatedAt: '2026-09-01T00:00:00Z' }, { ...base, id: 'c2', privacy: 'hidden' }]))
    expect(r).toMatchObject({ catches: 0, skipped: 2 })
    expect((await db.catches.get('c1'))!.species).toBe('Brown trout')
    expect(await db.catches.get('c2')).toBeUndefined()
  })
  it('drops non-http regulation links and skips a broken photo without losing the rest', async () => {
    const r = await importExport(
      JSON.stringify({
        format: EXPORT_FORMAT,
        version: 1,
        exportedAt: '',
        catches: [base],
        markers: [],
        streamNotes: [{ key: 'k', name: 'Clear Creek', regsUrl: 'javascript:alert(1)', updatedAt: '2026-10-01T12:00:00Z' }],
        photos: [{ id: 'p1', full: 'not a data url', thumb: 'data:image/jpeg;base64,AAAA', createdAt: '' }],
      }),
    )
    expect(r).toMatchObject({ catches: 1, streamNotes: 1, photos: 0, invalid: 1 })
    expect((await db.streamNotes.get('k'))!.regsUrl).toBeUndefined()
    expect(await db.photos.get('p1')).toBeUndefined()
  })
})

describe('solunar and bite score', () => {
  const lat = 39.75
  const lon = -105.23
  const dayStart = Date.parse('2025-10-07T06:00:00Z') // local midnight in Denver (MDT)

  it('names the October 2025 full moon and keeps windows inside the day', () => {
    const s = solunarDay(dayStart, lat, lon)
    expect(s.phaseName).toBe('Full moon')
    expect(s.sunrise! > dayStart && s.sunset! < dayStart + 86_400_000).toBe(true)
    expect(s.windows.length).toBeGreaterThanOrEqual(2)
    for (const w of s.windows) expect(w.center).toBeGreaterThanOrEqual(dayStart)
    expect(phaseName(0.25)).toBe('First quarter')
  })

  const forecastWith = (code: number, gust = 10): Forecast => ({
    lat,
    lon,
    timezone: 'America/Denver',
    utcOffsetSec: -21600,
    days: [],
    hours: Array.from({ length: 30 }, (_, i) => ({
      t: dayStart - 6 * 3_600_000 + i * 3_600_000,
      tempC: 10,
      precipProb: 0,
      precipMm: 0,
      code,
      cloud: 20,
      pressure: 1015,
      windKmh: 5,
      gustKmh: gust,
    })),
  })

  it('storms and too-warm water pull the score down; every point has a reason', () => {
    const s = solunarDay(dayStart, lat, lon)
    const t = dayStart + 8 * 3_600_000
    const calm = scoreHour(t, s, forecastWith(1))
    const storm = scoreHour(t, s, forecastWith(95))
    const hot = scoreHour(t, s, forecastWith(1), 22)
    expect(storm.score).toBeLessThan(calm.score)
    expect(hot.score).toBeLessThan(calm.score)
    expect(calm.factors.reduce((a, f) => a + f.points, 0)).toBe(calm.score)
    expect(calm.score).toBeGreaterThanOrEqual(0)
    expect(calm.score).toBeLessThanOrEqual(100)
  })

  it('day rating averages the six best hours; windows merge adjacent good hours', () => {
    const hours = [30, 60, 70, 40, 80, 20, 90, 10].map((score, i) => ({ t: i * 3_600_000, score, factors: [] }))
    expect(dayRating(hours)).toBe(Math.round((90 + 80 + 70 + 60 + 40 + 30) / 6))
    expect(bestWindows(hours)).toEqual([
      { start: 6 * 3_600_000, end: 7 * 3_600_000, peak: 90 },
      { start: 4 * 3_600_000, end: 5 * 3_600_000, peak: 80 },
      { start: 1 * 3_600_000, end: 3 * 3_600_000, peak: 70 },
    ])
  })
})
