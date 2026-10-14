// Public land from USGS PAD-US (Protected Areas Database of the United States).
// The map draws USGS's own vector tiles, coloured by who manages the land; a tap
// asks the PAD-US Public Access service for the name and whether the public can
// get in. Both are keyless, public domain, and send CORS headers.
import type { ExpressionSpecification } from 'maplibre-gl'
import { cachedFetch, DAY, fetchJson } from './cache'

export const LAND_TILES =
  'https://tiles.arcgis.com/tiles/v01gqwM5QqNysAAi/arcgis/rest/services/PADUS_Management_Areas_Manager_Type/VectorTileServer/tile/{z}/{y}/{x}.pbf'
export const LAND_SOURCE_LAYER = 'PADUS'
const ACCESS_QUERY = 'https://services.arcgis.com/v01gqwM5QqNysAAi/arcgis/rest/services/PADUS_Public_Access/FeatureServer/0/query'

/** Zoomed out further than this, the tiles are big and say little about where to fish. */
export const LAND_MIN_ZOOM = 7
export const LAND_MAX_TILE_ZOOM = 14

export type ManagerKind = 'tribal' | 'federal' | 'joint' | 'local' | 'ngo' | 'private' | 'regional' | 'state' | 'territorial' | 'unknown'

/** The tile service's `_symbol` index, in the order its style lists them. */
export const MANAGER_BY_SYMBOL: ManagerKind[] = ['tribal', 'federal', 'joint', 'local', 'ngo', 'private', 'regional', 'state', 'territorial', 'unknown']

export const MANAGER_LABEL: Record<ManagerKind, string> = {
  tribal: 'Tribal land',
  federal: 'Federal land',
  joint: 'Jointly managed land',
  local: 'City or county land',
  ngo: 'Conservation group land',
  private: 'Private land with a conservation easement',
  regional: 'Regional agency land',
  state: 'State land',
  territorial: 'Territorial land',
  unknown: 'Land of unknown management',
}

/** Shaded on the map. Private easements and unknown parcels are left off: they read as "public" and usually aren't. */
export const SHOWN_MANAGERS: ManagerKind[] = ['federal', 'state', 'local', 'regional', 'joint', 'territorial', 'tribal', 'ngo']

/** Fixed colours (not theme tokens): the same land should look the same in light and dark mode. */
export const MANAGER_COLOR: Partial<Record<ManagerKind, string>> = {
  federal: '#3f8f4f',
  state: '#3a7fb8',
  local: '#8aa83a',
  regional: '#8aa83a',
  joint: '#8aa83a',
  territorial: '#8aa83a',
  tribal: '#b5763a',
  ngo: '#8a6bb8',
}

export const LEGEND: { kind: ManagerKind; label: string }[] = [
  { kind: 'federal', label: 'Federal' },
  { kind: 'state', label: 'State' },
  { kind: 'local', label: 'City, county, regional' },
  { kind: 'tribal', label: 'Tribal' },
  { kind: 'ngo', label: 'Conservation group' },
]

const symbolsOf = (kinds: ManagerKind[]) => kinds.map((k) => MANAGER_BY_SYMBOL.indexOf(k))

export const LAND_FILTER: ExpressionSpecification = ['in', ['get', '_symbol'], ['literal', symbolsOf(SHOWN_MANAGERS)]]

export function landColorExpression(): ExpressionSpecification {
  const pairs = SHOWN_MANAGERS.flatMap((k) => [MANAGER_BY_SYMBOL.indexOf(k), MANAGER_COLOR[k]!])
  return ['match', ['get', '_symbol'], ...pairs, '#8a8a8a'] as unknown as ExpressionSpecification
}

export function managerForSymbol(symbol: unknown): ManagerKind {
  return MANAGER_BY_SYMBOL[Number(symbol)] ?? 'unknown'
}

export type Access = 'open' | 'restricted' | 'closed' | 'unknown'

export const ACCESS_TEXT: Record<Access, { label: string; detail: string }> = {
  open: { label: 'Open to the public', detail: 'No special permission needed, though hours, seasons and local rules can still apply.' },
  restricted: { label: 'Restricted access', detail: 'Open with conditions: a permit, a season, set hours or limited areas. Check with the manager before you go.' },
  closed: { label: 'Closed to the public', detail: 'Protected, but not open for public entry.' },
  unknown: { label: 'Access unknown', detail: 'The database doesn’t say. Treat it as private unless signs or the manager say otherwise.' },
}

export type LandParcel = {
  name: string
  access: Access
  manager?: string
  managerType?: string
  designation?: string
  acres?: number
  featureClass?: string
}

type Attrs = {
  Unit_Nm?: string | null
  Pub_Access?: string | null
  MngNm_Desc?: string | null
  MngTp_Desc?: string | null
  DesTp_Desc?: string | null
  GIS_Acres?: number | null
  FeatClass?: string | null
}

const ACCESS_CODE: Record<string, Access> = { OA: 'open', RA: 'restricted', XA: 'closed', UK: 'unknown' }
/** Land ownership tells you more about getting in than an overlapping designation does. */
const CLASS_RANK: Record<string, number> = { Fee: 0, Easement: 1, Designation: 2, Marine: 3, Proclamation: 4 }

export function parseLand(json: { features?: { attributes?: Attrs }[]; error?: { message?: string } }): LandParcel[] {
  if (json.error) throw new Error(json.error.message ?? 'Public land lookup failed')
  const clean = (s?: string | null) => (s && s.trim() ? s.trim() : undefined)
  return (json.features ?? [])
    .map((f) => f.attributes ?? {})
    .map((a) => ({
      name: clean(a.Unit_Nm) ?? 'Unnamed protected area',
      access: ACCESS_CODE[a.Pub_Access ?? ''] ?? 'unknown',
      manager: clean(a.MngNm_Desc),
      managerType: clean(a.MngTp_Desc),
      designation: clean(a.DesTp_Desc),
      acres: a.GIS_Acres != null && a.GIS_Acres > 0 ? Math.round(a.GIS_Acres) : undefined,
      featureClass: clean(a.FeatClass),
    }))
    .sort((x, y) => (CLASS_RANK[x.featureClass ?? ''] ?? 9) - (CLASS_RANK[y.featureClass ?? ''] ?? 9))
}

function pointQuery(base: string, lat: number, lon: number, outFields: string): string {
  const q = new URLSearchParams({
    geometry: `${lon.toFixed(5)},${lat.toFixed(5)}`,
    geometryType: 'esriGeometryPoint',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields,
    returnGeometry: 'false',
    f: 'json',
  })
  return `${base}?${q}`
}

export const landQueryUrl = (lat: number, lon: number) =>
  pointQuery(ACCESS_QUERY, lat, lon, 'Unit_Nm,Pub_Access,MngNm_Desc,MngTp_Desc,DesTp_Desc,GIS_Acres,FeatClass')
export const feeQueryUrl = (lat: number, lon: number) => pointQuery(FEE_QUERY, lat, lon, 'Unit_Nm,Pub_Access,Mang_Type,Mang_Name,Des_Tp,GIS_Acres')

/**
 * The access service keeps only the top layer at a point, so a wilderness study
 * area inside a national forest hides the forest (and its "open" access). The
 * fee (ownership) service has the forest itself, but in agency codes.
 */
const FEE_QUERY = 'https://services.arcgis.com/v01gqwM5QqNysAAi/arcgis/rest/services/Fee_Managers_PADUS/FeatureServer/0/query'

/** PAD-US agency codes seen most on fishable land; anything else falls back to the access service's wording. */
const AGENCY: Record<string, string> = {
  USFS: 'Forest Service',
  BLM: 'Bureau of Land Management',
  NPS: 'National Park Service',
  FWS: 'U.S. Fish and Wildlife Service',
  USACE: 'U.S. Army Corps of Engineers',
  USBR: 'Bureau of Reclamation',
  TVA: 'Tennessee Valley Authority',
  DOD: 'Department of Defense',
  SFW: 'State fish and wildlife agency',
  SPR: 'State parks agency',
  SDNR: 'State natural resources department',
  SDC: 'State conservation department',
  SLB: 'State land board',
  CITY: 'City',
  CNTY: 'County',
  NGO: 'Conservation group',
  TRIB: 'Tribe',
}

const DESIGNATION: Record<string, string> = {
  NF: 'National Forest',
  NP: 'National Park',
  NWR: 'National Wildlife Refuge',
  NRA: 'National Recreation Area',
  NM: 'National Monument',
  WA: 'Wilderness Area',
  WSA: 'Wilderness Study Area',
  SP: 'State Park',
}

type FeeAttrs = { Unit_Nm?: string | null; Pub_Access?: string | null; Mang_Type?: string | null; Mang_Name?: string | null; Des_Tp?: string | null; GIS_Acres?: number | null }

export function parseFee(json: { features?: { attributes?: FeeAttrs }[]; error?: { message?: string } }): LandParcel[] {
  if (json.error) throw new Error(json.error.message ?? 'Public land lookup failed')
  return (json.features ?? []).map(({ attributes: a = {} }) => ({
    name: a.Unit_Nm?.trim() || 'Unnamed public land',
    access: ACCESS_CODE[a.Pub_Access ?? ''] ?? 'unknown',
    manager: AGENCY[a.Mang_Name ?? ''],
    designation: DESIGNATION[a.Des_Tp ?? ''],
    acres: a.GIS_Acres != null && a.GIS_Acres > 0 ? Math.round(a.GIS_Acres) : undefined,
    featureClass: 'Fee',
  }))
}

/**
 * Ownership first (its access is the one that decides whether you can walk in),
 * filled out with the access service's plain-English names; overlapping
 * designations (wilderness, refuges) follow as extra parcels.
 */
export function combineLand(fee: LandParcel[], access: LandParcel[]): LandParcel[] {
  if (!fee.length) return access
  const [own, ...moreOwn] = fee
  const same = access.find((a) => a.name === own.name)
  const main: LandParcel = {
    ...own,
    manager: own.manager ?? same?.manager ?? access[0]?.manager,
    managerType: same?.managerType ?? access[0]?.managerType,
    designation: own.designation ?? same?.designation,
  }
  const names = new Set([main.name])
  const extra = [...moreOwn, ...access].filter((p) => !names.has(p.name) && names.add(p.name))
  return [main, ...extra]
}

/** What public land is at this point. Cached for a month: boundaries change yearly at most. */
export function lookupLand(lat: number, lon: number) {
  return cachedFetch(`padus2:${lat.toFixed(4)}:${lon.toFixed(4)}`, 30 * DAY, async () => {
    const [fee, access] = await Promise.allSettled([
      fetchJson<Parameters<typeof parseFee>[0]>(feeQueryUrl(lat, lon)).then(parseFee),
      fetchJson<Parameters<typeof parseLand>[0]>(landQueryUrl(lat, lon)).then(parseLand),
    ])
    if (fee.status === 'rejected' && access.status === 'rejected') throw access.reason
    return combineLand(fee.status === 'fulfilled' ? fee.value : [], access.status === 'fulfilled' ? access.value : [])
  })
}

export function formatAcres(acres: number): string {
  if (acres >= 1_000_000) return `${(acres / 1_000_000).toFixed(1)}M acres`
  if (acres >= 10_000) return `${Math.round(acres / 1000).toLocaleString()}k acres`
  return `${acres.toLocaleString()} acres`
}
