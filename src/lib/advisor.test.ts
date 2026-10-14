import { describe, expect, it } from 'vitest'
import { activityFor, colorsFor, defaultTargets, estimateWaterTempC, isWarming, phaseFor, plan, region, type PlanInput } from './advisor'
import { PROFILE_BY_ID, PROFILES, profileForLatin } from './species'
import { RIG_BY_ID, RIGS } from './rigs'
import { classify, parseAirHistory, pickWater, waterQuery } from './waters'
import { mergePresence, parseCounts, parseHubEau, parseSightings } from './publicdata'
import { adapterFor, likeTerm, stockedLatin } from './stocking'
import { prefFit } from './bite'
import { fToC } from './units'

const base: PlanInput = {
  water: { type: 'lake' },
  lat: 44,
  lon: -93,
  date: new Date('2026-07-15T12:00:00Z'),
  clarity: 'clear',
  method: 'any',
  presence: [],
}

describe('knowledge base', () => {
  it('every profile points at real rigs and has a default tactic', () => {
    for (const p of PROFILES) {
      for (const t of [p.tactics.default, ...Object.values(p.tactics)]) for (const id of t?.rigs ?? []) expect(RIG_BY_ID[id], `${p.id} → ${id}`).toBeDefined()
      expect(p.tempF.best[0]).toBeGreaterThanOrEqual(p.tempF.active[0])
      expect(p.tempF.best[1]).toBeLessThanOrEqual(p.tempF.active[1])
    }
    for (const r of RIGS) expect(r.parts.length).toBeGreaterThan(1)
  })
  it('matches current, old and genus-level scientific names', () => {
    expect(profileForLatin('Micropterus nigricans')?.id).toBe('largemouth') // iNaturalist's current name
    expect(profileForLatin('Micropterus salmoides')?.id).toBe('largemouth') // the older one
    expect(profileForLatin('Lepomis gibbosus')?.id).toBe('sunfish') // any Lepomis
    expect(profileForLatin('Ameiurus nebulosus')?.id).toBe('catfish')
    expect(profileForLatin('Catostomus commersonii')).toBeUndefined()
  })
})

describe('season and activity', () => {
  const lmb = PROFILE_BY_ID.largemouth
  it('walks a largemouth through the year', () => {
    expect(phaseFor(lmb, 45, true)).toBe('cold')
    expect(phaseFor(lmb, 55, true)).toBe('prespawn')
    expect(phaseFor(lmb, 66, true)).toBe('spawn')
    expect(phaseFor(lmb, 78, true)).toBe('summer')
    expect(phaseFor(lmb, 66, false)).toBe('fall')
    expect(phaseFor(lmb, 92, true)).toBe('hot')
    expect(phaseFor(lmb, undefined, false)).toBe('fall')
  })
  it('a warm spell in fall is not the spring spawn', () => {
    expect(phaseFor(lmb, 66, true, false)).toBe('summer')
  })
  it('fall spawners spawn when water cools', () => {
    expect(phaseFor(PROFILE_BY_ID.brown, 47, false)).toBe('spawn')
    expect(phaseFor(PROFILE_BY_ID.brown, 47, true)).toBe('summer')
  })
  it('activity follows the best and active ranges', () => {
    expect(activityFor(lmb, 72, 'summer')).toBe('high')
    expect(activityFor(lmb, 55, 'prespawn')).toBe('medium')
    expect(activityFor(lmb, 40, 'cold')).toBe('low')
  })
  it('seasons flip in the southern hemisphere', () => {
    expect(isWarming(new Date('2026-04-01'), 45)).toBe(true)
    expect(isWarming(new Date('2026-04-01'), -35)).toBe(false)
    expect(isWarming(new Date('2026-04-01'), 45, false)).toBe(false)
  })
})

describe('plan', () => {
  it('ranks by public evidence and gives a complete recommendation', () => {
    const p = plan({
      ...base,
      waterTempC: fToC(74),
      presence: [
        { latin: 'Micropterus nigricans', common: 'Largemouth Bass', count: 40 },
        { latin: 'Lepomis macrochirus', common: 'Bluegill', count: 12 },
        { latin: 'Catostomus commersonii', common: 'White Sucker', count: 5 },
        { latin: 'Dorosoma cepedianum', common: 'Gizzard Shad', count: 3 },
      ],
    })
    expect(p.fromDefaults).toBe(false)
    expect(p.recs[0].profile.id).toBe('largemouth')
    expect(p.recs[0].activity).toBe('high')
    expect(p.recs[0].rigs.length).toBeGreaterThan(0)
    expect(p.recs[0].why.join(' ')).toMatch(/74°F/)
    expect(p.otherFish.map((o) => o.common)).toContain('White Sucker')
    expect(p.forage).toContain('shad')
    expect(p.recs[0].colors).toMatch(/shad/)
  })
  it('respects the method: fly anglers get fly rigs and flies only', () => {
    const p = plan({ ...base, water: { type: 'stream' }, waterTempC: fToC(58), method: 'fly', presence: [{ latin: 'Salmo trutta', common: 'Brown Trout', count: 9 }] })
    const r = p.recs[0]
    expect(r.rigs.every((x) => x.methods.includes('fly'))).toBe(true)
    expect(r.baits).toEqual([])
    expect(r.flies.length).toBeGreaterThan(0)
  })
  it('warns about warm water for trout and spawning fish', () => {
    const hot = plan({ ...base, water: { type: 'river' }, waterTempC: fToC(70), presence: [{ latin: 'Oncorhynchus mykiss', common: 'Rainbow', count: 3 }] })
    expect(hot.recs[0].warnings[0]).toMatch(/68°F/)
    const spawn = plan({ ...base, date: new Date('2026-05-10'), waterTempC: fToC(66), presence: [{ latin: 'Micropterus nigricans', common: 'LMB', count: 3 }] })
    expect(spawn.recs[0].phase).toBe('spawn')
    expect(spawn.recs[0].warnings[0]).toMatch(/Spawning season/)
  })
  it('falls back to typical fish, by region, when nothing is recorded', () => {
    const us = plan({ ...base, water: { type: 'pond' } })
    expect(us.fromDefaults).toBe(true)
    expect(us.recs.map((r) => r.profile.id)).toContain('sunfish')
    const fr = plan({ ...base, lat: 45.2, lon: 5.7, water: { type: 'pond' } })
    expect(region(45.2, 5.7)).toBe('eu')
    expect(fr.recs.map((r) => r.profile.id)).toContain('carp')
    expect(defaultTargets('stream', 'na', 44)).toContain('rainbow')
  })
  it('refuses salt water instead of guessing', () => {
    expect(plan({ ...base, water: { type: 'coast' } }).unsupported).toMatch(/Saltwater/)
  })
  it('colour advice follows clarity', () => {
    expect(colorsFor('clear', [])).toMatch(/Natural/)
    expect(colorsFor('muddy', [])).toMatch(/Dark and loud/)
  })
})

describe('water temperature estimate', () => {
  it('ponds track the air, streams stay cooler, nothing freezes solid', () => {
    expect(estimateWaterTempC('pond', 25, 22)).toBe(26.5)
    expect(estimateWaterTempC('stream', 25, 22)).toBeLessThan(estimateWaterTempC('pond', 25, 22))
    expect(estimateWaterTempC('lake', -15, -12)).toBe(1)
  })
  it('species-aware bite fit', () => {
    const pref = { name: 'bass', active: [50, 88] as [number, number], best: [65, 80] as [number, number] }
    expect(prefFit(fToC(72), pref).mult).toBe(1)
    expect(prefFit(fToC(55), pref).mult).toBe(0.8)
    expect(prefFit(fToC(35), pref).mult).toBe(0.35)
  })
})

describe('water lookup', () => {
  it('classifies OSM tags', () => {
    expect(classify({ waterway: 'stream' }).type).toBe('stream')
    expect(classify({ natural: 'water', water: 'reservoir' }).type).toBe('reservoir')
    expect(classify({ natural: 'water' }, { minlat: 0, minlon: 0, maxlat: 0.001, maxlon: 0.001 }).type).toBe('pond')
    expect(classify({ natural: 'water' }, { minlat: 0, minlon: 0, maxlat: 0.05, maxlon: 0.05 }).type).toBe('lake')
    expect(classify({ natural: 'coastline' }).type).toBe('coast')
  })
  it('prefers water you are in, then a river beside you', () => {
    const sep = { type: 'sep', id: 1 }
    expect(pickWater([{ type: 'way', id: 1, tags: { natural: 'water', name: 'In Lake' } }, sep, { type: 'way', id: 2, tags: { waterway: 'river', name: 'Next River' } }]).name).toBe('In Lake')
    expect(pickWater([sep, { type: 'way', id: 3, tags: { natural: 'water', name: 'Near Lake' } }, { type: 'way', id: 2, tags: { waterway: 'river', name: 'Next River' } }]).name).toBe('Next River')
    expect(pickWater([sep]).type).toBe('unknown')
    expect(waterQuery(1, 2)).toContain('is_in(1.00000,2.00000)')
  })
  it('reads air history: weekly means, trend and recent rain', () => {
    const h = parseAirHistory({
      time: Array.from({ length: 15 }, (_, i) => `2026-07-${String(i + 1).padStart(2, '0')}`),
      temperature_2m_mean: [10, 10, 10, 10, 10, 10, 10, 20, 20, 20, 20, 20, 20, 20, 99],
      precipitation_sum: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 7, 50],
    })
    expect(h).toEqual({ mean7C: 20, mean14C: 15, warming: true, rain48hMm: 15 })
  })
})

describe('public data', () => {
  it('iNaturalist counts keep species, sightings drop obscured points', () => {
    expect(
      parseCounts({
        results: [
          { count: 3, taxon: { name: 'Salmo trutta', preferred_common_name: 'Brown Trout', rank: 'species' } },
          { count: 9, taxon: { name: 'Salmonidae', rank: 'family' } },
        ],
      }),
    ).toEqual([{ latin: 'Salmo trutta', common: 'Brown Trout', count: 3 }])
    const s = parseSightings({
      results: [
        { id: 1, obscured: false, geojson: { coordinates: [-105, 39] }, taxon: { name: 'Salmo trutta' }, license_code: 'cc-by' },
        { id: 2, obscured: true, geojson: { coordinates: [-105, 39] }, taxon: { name: 'Salmo trutta' } },
      ],
    })
    expect(s.map((x) => x.id)).toEqual(['inat-1'])
    expect(s[0].url).toBe('https://www.inaturalist.org/observations/1')
  })
  it('French surveys sum fish per species; stocking counts as evidence', () => {
    const fr = parseHubEau({ data: [{ nom_latin_taxon: 'Esox lucius', effectif_lot: 2 }, { nom_latin_taxon: 'Esox lucius', effectif_lot: 3 }, { nom_latin_taxon: 'Salmo trutta' }] })
    expect(fr[0]).toMatchObject({ latin: 'Esox lucius', count: 5 })
    const merged = mergePresence({
      inat: [{ latin: 'Salmo trutta', common: 'Brown Trout', count: 4 }],
      surveys: fr,
      stocking: { state: 'MT', source: 'x', by: 'area', events: [{ water: 'Pond', species: 'Rainbow Trout', date: '2026-06-01', source: 'x' }] },
    })
    expect(merged.find((m) => m.latin === 'Salmo trutta')?.count).toBe(5)
    expect(merged.find((m) => m.latin === 'Oncorhynchus mykiss')?.count).toBe(10)
  })
  it('stocking: state lookup, species mapping, and LIKE terms that cannot inject', () => {
    expect(adapterFor(46.87, -114)?.state).toBe('Montana')
    expect(adapterFor(39.75, -105.2)).toBeUndefined()
    expect(stockedLatin('Westslope Cutthroat Trout')).toBe('Oncorhynchus clarkii')
    expect(likeTerm("O'Brien Lake")).toBe('O BRIEN')
    expect(likeTerm("x'; DROP TABLE --")).toBe('X DROP TABLE --')
    expect(likeTerm('Pond')).toBeUndefined()
  })
})
