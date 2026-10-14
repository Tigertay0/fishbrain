import { describe, expect, it, vi } from 'vitest'
import { tileUrls } from './offline'
import { combineLand, lookupLand, parseFee, formatAcres, LAND_TILES, LAND_FILTER, landColorExpression, landQueryUrl, managerForSymbol, MANAGER_BY_SYMBOL, parseLand, SHOWN_MANAGERS } from './publicland'

describe('public land', () => {
  it('maps the tile service symbols to who manages the land', () => {
    expect(managerForSymbol(1)).toBe('federal')
    expect(managerForSymbol(7)).toBe('state')
    expect(managerForSymbol(0)).toBe('tribal')
    expect(managerForSymbol('5')).toBe('private')
    expect(managerForSymbol(42)).toBe('unknown')
  })
  it('never shades private easements or unknown parcels as if they were public', () => {
    expect(SHOWN_MANAGERS).not.toContain('private')
    expect(SHOWN_MANAGERS).not.toContain('unknown')
    const shown = (LAND_FILTER[2] as unknown as [string, number[]])[1]
    expect(shown).not.toContain(MANAGER_BY_SYMBOL.indexOf('private'))
    expect(shown).not.toContain(MANAGER_BY_SYMBOL.indexOf('unknown'))
    // Every shaded kind has its own colour, not the grey fallback.
    const expr = landColorExpression() as unknown[]
    for (const k of SHOWN_MANAGERS) expect(expr).toContain(MANAGER_BY_SYMBOL.indexOf(k))
  })
  it('reads the access service: open, restricted, closed, unknown; ownership before designations', () => {
    const parcels = parseLand({
      features: [
        { attributes: { Unit_Nm: 'Lee Metcalf Wilderness', Pub_Access: 'RA', FeatClass: 'Designation', MngNm_Desc: 'Forest Service', GIS_Acres: 250000 } },
        { attributes: { Unit_Nm: ' Gallatin National Forest ', Pub_Access: 'OA', FeatClass: 'Fee', MngNm_Desc: 'Forest Service', MngTp_Desc: 'Federal', DesTp_Desc: 'National Forest', GIS_Acres: 423210.4 } },
        { attributes: { Unit_Nm: '', Pub_Access: 'XX', FeatClass: 'Easement', GIS_Acres: 0 } },
      ],
    })
    expect(parcels.map((p) => p.featureClass)).toEqual(['Fee', 'Easement', 'Designation'])
    expect(parcels[0]).toMatchObject({ name: 'Gallatin National Forest', access: 'open', manager: 'Forest Service', designation: 'National Forest', acres: 423210 })
    expect(parcels[1]).toMatchObject({ name: 'Unnamed protected area', access: 'unknown', acres: undefined })
    expect(parcels[2].access).toBe('restricted')
    expect(parseLand({ features: [{ attributes: { Pub_Access: 'XA' } }] })[0].access).toBe('closed')
    expect(parseLand({})).toEqual([])
    expect(() => parseLand({ error: { message: 'Invalid query' } })).toThrow('Invalid query')
  })
  it('asks for one point, no geometry back', () => {
    const u = new URL(landQueryUrl(45.123456, -111.987654))
    expect(u.searchParams.get('geometry')).toBe('-111.98765,45.12346')
    expect(u.searchParams.get('returnGeometry')).toBe('false')
    expect(u.searchParams.get('inSR')).toBe('4326')
  })
  it('formats acreage for a glance', () => {
    expect(formatAcres(1944)).toBe('1,944 acres')
    expect(formatAcres(423210)).toBe('423k acres')
    expect(formatAcres(1850413)).toBe('1.9M acres')
  })
})

describe('saving public land for offline', () => {
  it('builds tile URLs for every source, row before column for ArcGIS', () => {
    const urls = tileUrls(
      [
        { template: 'https://a/{z}/{x}/{y}.pbf', zooms: [12] },
        { template: LAND_TILES, zooms: [12] },
      ],
      { west: -111.052, south: 45.031, east: -111.051, north: 45.032 },
    )
    expect(urls).toHaveLength(2)
    const [z, x, y] = urls[0].match(/(\d+)\/(\d+)\/(\d+)\.pbf$/)!.slice(1)
    expect(urls[1]).toMatch(new RegExp(`/tile/${z}/${y}/${x}\.pbf$`))
  })
})

describe('ownership beats overlapping designations', () => {
  it('a wilderness study area inside a national forest reads as the open forest, with the WSA as also here', () => {
    const fee = parseFee({ features: [{ attributes: { Unit_Nm: 'Gallatin National Forest', Pub_Access: 'OA', Mang_Type: 'FED', Mang_Name: 'USFS', Des_Tp: 'NF', GIS_Acres: 1850413 } }] })
    const access = parseLand({
      features: [{ attributes: { Unit_Nm: 'Hyalite-Porcupine-Buffalo Horn Wilderness Study Area', Pub_Access: 'RA', FeatClass: 'Designation', MngNm_Desc: 'Forest Service', MngTp_Desc: 'Federal', DesTp_Desc: 'Wilderness Study Area' } }],
    })
    const [main, also] = combineLand(fee, access)
    expect(main).toMatchObject({ name: 'Gallatin National Forest', access: 'open', manager: 'Forest Service', managerType: 'Federal', designation: 'National Forest' })
    expect(also).toMatchObject({ name: 'Hyalite-Porcupine-Buffalo Horn Wilderness Study Area', access: 'restricted' })
  })
  it('falls back to the access service, and to its wording for agency codes it does not know', () => {
    const access = parseLand({ features: [{ attributes: { Unit_Nm: 'Delaware State Forest', Pub_Access: 'OA', FeatClass: 'Fee', MngNm_Desc: 'State Department of Natural Resources', DesTp_Desc: 'State Resource Management Area' } }] })
    expect(combineLand([], access)).toEqual(access)
    const fee = parseFee({ features: [{ attributes: { Unit_Nm: 'Delaware State Forest', Pub_Access: 'OA', Mang_Name: 'XYZ', Des_Tp: 'SRMA' } }] })
    const [main] = combineLand(fee, access)
    expect(main.manager).toBe('State Department of Natural Resources')
    expect(main.designation).toBe('State Resource Management Area')
    expect(combineLand(fee, access)).toHaveLength(1) // same parcel, not listed twice
  })
})

describe('land lookup safety', () => {
  it('never borrows the manager of a different parcel, and the smallest owner wins', () => {
    const fee = parseFee({
      features: [
        { attributes: { Unit_Nm: 'Big Federal Area', Pub_Access: 'OA', Mang_Type: 'FED', Mang_Name: 'BLM', GIS_Acres: 500000 } },
        { attributes: { Unit_Nm: 'Small State Park', Pub_Access: 'RA', Mang_Type: 'STAT', Mang_Name: 'ZZZ', GIS_Acres: 300 } },
      ],
    })
    const access = parseLand({ features: [{ attributes: { Unit_Nm: 'Some Wilderness', Pub_Access: 'RA', FeatClass: 'Designation', MngNm_Desc: 'Bureau of Land Management', MngTp_Desc: 'Federal' } }] })
    const [main, ...rest] = combineLand(fee, access)
    expect(main).toMatchObject({ name: 'Small State Park', access: 'restricted', managerType: 'State', manager: undefined })
    expect(rest.map((p) => p.name)).toEqual(['Big Federal Area', 'Some Wilderness'])
  })
  it('caches only complete answers: a timed-out half is shown, then asked again next time', async () => {
    const calls: string[] = []
    let feeFails = true
    vi.stubGlobal('fetch', async (url: string) => {
      calls.push(url)
      if (url.includes('Fee_Managers') && feeFails) throw new TypeError('network')
      const body = url.includes('Fee_Managers')
        ? { features: [{ attributes: { Unit_Nm: 'Gallatin National Forest', Pub_Access: 'OA', Mang_Name: 'USFS', GIS_Acres: 1 } }] }
        : { features: [{ attributes: { Unit_Nm: 'Hyalite WSA', Pub_Access: 'RA', FeatClass: 'Designation' } }] }
      return new Response(JSON.stringify(body), { status: 200 })
    })
    try {
      const first = await lookupLand(45.1, -111.1)
      expect(first.complete).toBe(false)
      expect(first.parcels[0].name).toBe('Hyalite WSA')
      feeFails = false
      const second = await lookupLand(45.1, -111.1)
      expect(second).toMatchObject({ complete: true, parcels: [{ name: 'Gallatin National Forest', access: 'open' }, { name: 'Hyalite WSA' }] })
      const n = calls.length
      expect((await lookupLand(45.1, -111.1)).complete).toBe(true)
      expect(calls.length).toBe(n) // the complete answer came from the cache
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
