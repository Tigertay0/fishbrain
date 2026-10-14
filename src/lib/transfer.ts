import { db, type Catch, type Marker, type StreamNote } from './db'

export const EXPORT_FORMAT = 'tailout-export'

type ExportPhoto = { id: string; full: string; thumb: string; createdAt: string }
export type ExportFile = {
  format: typeof EXPORT_FORMAT
  version: 1
  exportedAt: string
  catches: Catch[]
  markers: Marker[]
  streamNotes: StreamNote[]
  photos?: ExportPhoto[]
}

export async function buildExport(includePhotos: boolean): Promise<ExportFile> {
  const [catches, markers, streamNotes] = await Promise.all([db.catches.toArray(), db.markers.toArray(), db.streamNotes.toArray()])
  const file: ExportFile = { format: EXPORT_FORMAT, version: 1, exportedAt: new Date().toISOString(), catches, markers, streamNotes }
  if (includePhotos) {
    const photos = await db.photos.toArray()
    file.photos = await Promise.all(
      photos.map(async (p) => ({ id: p.id, full: await blobToDataUrl(p.full), thumb: await blobToDataUrl(p.thumb), createdAt: p.createdAt })),
    )
  }
  return file
}

export type ImportResult = { catches: number; markers: number; streamNotes: number; photos: number; skipped: number }

/** Merges an export into this device. A record replaces an existing one only if it is newer. */
export async function importExport(text: string): Promise<ImportResult> {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  if (!isExport(data)) throw new Error('That file is not a Tailout export.')
  const res: ImportResult = { catches: 0, markers: 0, streamNotes: 0, photos: 0, skipped: 0 }
  await db.transaction('rw', [db.catches, db.markers, db.streamNotes, db.photos], async () => {
    for (const c of data.catches) {
      if (!validCatch(c)) {
        res.skipped++
        continue
      }
      if (await newer(db.catches.get(c.id), c.updatedAt)) {
        await db.catches.put(c)
        res.catches++
      } else res.skipped++
    }
    for (const m of data.markers) {
      if (!validMarker(m)) {
        res.skipped++
        continue
      }
      if (await newer(db.markers.get(m.id), m.updatedAt)) {
        await db.markers.put(m)
        res.markers++
      } else res.skipped++
    }
    for (const n of data.streamNotes) {
      if (typeof n?.key !== 'string' || typeof n?.name !== 'string') {
        res.skipped++
        continue
      }
      if (await newer(db.streamNotes.get(n.key), n.updatedAt)) {
        await db.streamNotes.put(n)
        res.streamNotes++
      } else res.skipped++
    }
    for (const p of data.photos ?? []) {
      if (typeof p?.id !== 'string' || (await db.photos.get(p.id))) continue
      await db.photos.put({ id: p.id, full: dataUrlToBlob(p.full), thumb: dataUrlToBlob(p.thumb), createdAt: p.createdAt })
      res.photos++
    }
  })
  return res
}

export async function catchesCsv(): Promise<string> {
  const rows = await db.catches.orderBy('caughtAt').toArray()
  const head = [
    'caught_at', 'species', 'length_cm', 'weight_g', 'lure', 'method', 'water', 'privacy', 'lat', 'lon',
    'air_temp_c', 'pressure_hpa', 'pressure_trend', 'flow_cfs', 'water_temp_c', 'gauge_id', 'notes',
  ]
  const lines = rows.map((c) =>
    [
      c.caughtAt, c.species, c.lengthCm, c.weightG, c.lure, c.method, c.waterName, c.privacy, c.lat, c.lon,
      c.conditions?.airTempC, c.conditions?.pressureHpa, c.conditions?.pressureTrend, c.conditions?.flowCfs,
      c.conditions?.waterTempC, c.conditions?.gaugeId, c.notes,
    ]
      .map(csvCell)
      .join(','),
  )
  return [head.join(','), ...lines].join('\n') + '\n'
}

export function csvCell(v: unknown): string {
  if (v == null) return ''
  const s = String(v)
  // Neutralise spreadsheet formulas, then quote if needed.
  const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d/.test(s) ? `'${s}` : s
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function download(name: string, content: string | Blob, type: string): void {
  const blob = typeof content === 'string' ? new Blob([content], { type }) : content
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function isExport(d: unknown): d is ExportFile {
  const x = d as ExportFile
  return !!x && x.format === EXPORT_FORMAT && Array.isArray(x.catches) && Array.isArray(x.markers) && Array.isArray(x.streamNotes)
}

function validCatch(c: Catch): boolean {
  return (
    typeof c?.id === 'string' &&
    typeof c.species === 'string' &&
    !Number.isNaN(Date.parse(c.caughtAt)) &&
    ['exact', 'water', 'hidden'].includes(c.privacy) &&
    // honour the privacy rule even for imported data
    (c.privacy !== 'hidden' || (c.lat == null && c.lon == null))
  )
}

function validMarker(m: Marker): boolean {
  return typeof m?.id === 'string' && typeof m.name === 'string' && Number.isFinite(m.lat) && Number.isFinite(m.lon)
}

async function newer(existing: Promise<{ updatedAt: string } | undefined>, updatedAt: string): Promise<boolean> {
  const e = await existing
  return !e || Date.parse(updatedAt) > Date.parse(e.updatedAt)
}

function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(b)
  })
}

function dataUrlToBlob(url: string): Blob {
  const [head, body] = url.split(',')
  const type = /data:([^;]+)/.exec(head)?.[1] ?? 'image/jpeg'
  const bin = atob(body)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type })
}
