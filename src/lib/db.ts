import Dexie, { type Table } from 'dexie'
import type { Units } from './units'

export type Privacy = 'exact' | 'water' | 'hidden'

export type Conditions = {
  airTempC?: number
  pressureHpa?: number
  pressureTrend?: 'rising' | 'falling' | 'steady'
  pressureDelta3h?: number
  cloudPct?: number
  windKmh?: number
  weatherCode?: number
  moonPhase?: number
  moonFraction?: number
  gaugeId?: string
  gaugeName?: string
  gaugeKm?: number
  flowCfs?: number
  waterTempC?: number
  /** true until weather has been attached (saved offline, filled in later) */
  pending?: boolean
}

export type Catch = {
  id: string
  caughtAt: string // ISO, UTC
  species: string
  lengthCm?: number
  weightG?: number
  lure?: string
  method?: string
  notes?: string
  photoId?: string
  /** absent when privacy is hidden: never stored, not just never shown */
  lat?: number
  lon?: number
  waterName?: string
  privacy: Privacy
  conditions?: Conditions
  createdAt: string
  updatedAt: string
}

export type Photo = { id: string; full: Blob; thumb: Blob; createdAt: string }

export type MarkerKind = 'access' | 'parking' | 'bridge' | 'camp' | 'run' | 'note'
export type Marker = {
  id: string
  kind: MarkerKind
  name: string
  notes?: string
  lat: number
  lon: number
  createdAt: string
  updatedAt: string
}

export type StreamNote = {
  key: string
  name: string
  classLabel?: string
  species?: string[]
  regsUrl?: string
  regsCheckedOn?: string // YYYY-MM-DD
  notes?: string
  updatedAt: string
}

export type ApiCacheRow = { key: string; savedAt: number; data: unknown }

export type OfflineArea = {
  id: string
  name: string
  bbox: { west: number; south: number; east: number; north: number }
  zooms: number[]
  tiles: number
  savedAt: string
}

export type Basemap = 'streets' | 'topo' | 'imagery'
export type LayerKey = 'streams' | 'gauges' | 'catches' | 'markers' | 'amenities'

export type AppSettings = {
  units: Units
  defaultPrivacy: Privacy
  usgsApiKey: string
  basemap: Basemap
  layers: Record<LayerKey, boolean>
  lastView?: { lat: number; lon: number; zoom: number }
  lastFix?: { lat: number; lon: number; at: number }
}

export const DEFAULT_SETTINGS: AppSettings = {
  units: 'imperial',
  defaultPrivacy: 'exact',
  usgsApiKey: '',
  basemap: 'streets',
  layers: { streams: true, gauges: true, catches: true, markers: true, amenities: false },
}

class TailoutDB extends Dexie {
  catches!: Table<Catch, string>
  photos!: Table<Photo, string>
  markers!: Table<Marker, string>
  streamNotes!: Table<StreamNote, string>
  apiCache!: Table<ApiCacheRow, string>
  offlineAreas!: Table<OfflineArea, string>
  settings!: Table<{ key: string; value: AppSettings }, string>

  constructor() {
    super('tailout')
    this.version(1).stores({
      catches: 'id, caughtAt, species',
      photos: 'id',
      markers: 'id, kind',
      streamNotes: 'key',
      apiCache: 'key, savedAt',
      offlineAreas: 'id',
      settings: 'key',
    })
  }
}

export const db = new TailoutDB()

export const newId = () => crypto.randomUUID()
export const nowIso = () => new Date().toISOString()
