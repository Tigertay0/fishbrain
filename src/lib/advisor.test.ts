import { describe, expect, it } from 'vitest'
import { activityFor, colorsFor, defaultTargets, estimateWaterTempC, isWarming, packList, phaseFor, plan, region, tacticFor, type PlanInput } from './advisor'
import { PROFILE_BY_ID, PROFILES, profileForLatin } from './species'
import { RIG_BY_ID, RIGS } from './rigs'
import { coastFor, defaultSaltTargets } from './saltwater'
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
  it('a season adds its own picks in front of the full list instead of replacing it', () => {
    const cold = tacticFor(PROFILE_BY_ID.smallmouth, 'cold')
    expect(cold.lures.slice(0, 3)).toEqual(['Hair jig', 'Blade bait', 'Ned worm'])
    expect(cold.lures).toContain('Tube') // from the all-season list
    expect(new Set(cold.lures).size).toBe(cold.lures.length) // no duplicates
    const r = plan({ ...base, waterTempC: fToC(40), presence: [{ latin: 'Micropterus dolomieu', common: 'Smallmouth', count: 4 }] }).recs[0]
    expect(r.seasonal).toContain('Hair jig')
    expect(r.seasonal).not.toContain('Tube')
  })
  it('gives a real choice of bait and lures for every fish', () => {
    for (const p of PROFILES) {
      const d = p.tactics.default
      expect(d.baits.length, `${p.id} baits`).toBeGreaterThanOrEqual(3)
      if (!/^Not usual/.test(d.lures[0])) expect(d.lures.length, `${p.id} lures`).toBeGreaterThanOrEqual(5)
    }
  })
  it('packs one combined tackle list from the best bets, without repeats', () => {
    const p = plan({
      ...base,
      waterTempC: fToC(70),
      presence: [
        { latin: 'Micropterus nigricans', common: 'Largemouth', count: 9 },
        { latin: 'Lepomis macrochirus', common: 'Bluegill', count: 6 },
        { latin: 'Pomoxis nigromaculatus', common: 'Crappie', count: 3 },
      ],
    })
    const pack = packList(p.recs)
    expect(pack.lures.length).toBeGreaterThanOrEqual(6)
    expect(pack.baits).toContain('Nightcrawler')
    expect(new Set(pack.lures).size).toBe(pack.lures.length)
    expect(pack.lures.every((x) => !/^Not usual/.test(x))).toBe(true)
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
  it('salt water: coastal fish for the coast, with tide reasons and saltwater rules', () => {
    const tide = { stage: 'rising' as const, prev: { t: 0, type: 'low' as const, ft: 0.5 }, next: { t: 1, type: 'high' as const, ft: 2.1 }, minutesToNext: 120 }
    const gulf = plan({ ...base, lat: 29.3, lon: -94.8, water: { type: 'coast' }, waterTempC: fToC(66), tide })
    expect(gulf.unsupported).toBeUndefined()
    const ids = gulf.recs.map((r) => r.profile.id)
    expect(ids).toEqual(expect.arrayContaining(['redfish', 'seatrout']))
    expect(ids).not.toContain('largemouth')
    const red = gulf.recs.find((r) => r.profile.id === 'redfish')!
    expect(red.why.join(' ')).toMatch(/Tide is rising \(incoming\): that suits them/)
    expect(red.rigs.map((r) => r.id)).toContain('popping-cork')
    expect(gulf.notes.join(' ')).toMatch(/licence/)
    expect(gulf.notes.join(' ')).not.toMatch(/live bait between waters/)
    // Flounder want the outgoing tide: they rank higher on it than on the incoming (or drop out of the top five).
    const rank = (recs: typeof gulf.recs) => {
      const i = recs.findIndex((r) => r.profile.id === 'flounder')
      return i < 0 ? 99 : i
    }
    const falling = plan({ ...base, lat: 29.3, lon: -94.8, water: { type: 'coast' }, waterTempC: fToC(66), tide: { ...tide, stage: 'falling' } })
    expect(rank(falling.recs)).toBeLessThan(rank(gulf.recs))
  })
  it('salt water: records pick saltwater fish; no tide data says so', () => {
    const p = plan({ ...base, lat: 41.3, lon: -72.0, water: { type: 'coast' }, presence: [{ latin: 'Morone saxatilis', common: 'Striped Bass', count: 12 }] })
    expect(p.recs[0].profile.id).toBe('striper')
    expect(p.recs[0].rigs.map((r) => r.id)).toContain('fishfinder')
    expect(p.notes.join(' ')).toMatch(/No tide station data/)
    // The same record in a reservoir is the freshwater striper.
    const lake = plan({ ...base, water: { type: 'reservoir' }, presence: [{ latin: 'Morone saxatilis', common: 'Striped Bass', count: 12 }] })
    expect(lake.recs[0].profile.id).toBe('whitebass')
  })
  it('knows which coast it is on', () => {
    expect(coastFor(41.3, -72.0)).toBe('ne')
    expect(coastFor(32.8, -79.9)).toBe('se') // Charleston
    expect(coastFor(27.9, -82.6)).toBe('gulf') // Tampa
    expect(coastFor(25.8, -80.1)).toBe('se') // Miami
    expect(coastFor(36.9, -122.0)).toBe('pacific')
    expect(coastFor(47.3, -2.5)).toBe('eu')
    expect(coastFor(30.33, -81.4)).toBe('se') // Jacksonville is Atlantic
    expect(coastFor(21.3, -157.8)).toBeUndefined() // Hawaii
    expect(coastFor(18.4, -66.1)).toBeUndefined() // Puerto Rico
    expect(coastFor(-33.9, 151.2)).toBeUndefined() // Sydney
    expect(plan({ ...base, lat: 21.3, lon: -157.8, water: { type: 'coast' } }).unsupported).toMatch(/US and European coasts/)
    expect(defaultSaltTargets('gulf', 26.5)).toContain('snook')
    expect(defaultSaltTargets('gulf', 30.2)).not.toContain('snook')
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
