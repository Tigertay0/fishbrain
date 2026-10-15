import { db, type Catch, type Marker, type StreamNote } from './db'
import { safeHttpUrl } from './format'

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

/** `skipped` counts every record not imported; `invalid` is the part of it that couldn't be read at all. */
export type ImportResult = { catches: number; markers: number; streamNotes: number; photos: number; skipped: number; invalid: number }

/** Merges an export into this device. A record replaces an existing one only if it is newer. */
export async function importExport(text: string): Promise<ImportResult> {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  if (!isExport(data)) throw new Error('That file is not a Tailout export.')
  const res: ImportResult = { catches: 0, markers: 0, streamNotes: 0, photos: 0, skipped: 0, invalid: 0 }
  const unreadable = () => {
    res.skipped++
    res.invalid++
  }
  await db.transaction('rw', [db.catches, db.markers, db.streamNotes, db.photos], async () => {
    for (const c of data.catches) {
      if (!validCatch(c)) {
        unreadable()
        continue
      }
      const prev = await db.catches.get(c.id)
      if (!isNewer(prev, c.updatedAt)) {
        res.skipped++
        continue
      }
      // Otherwise the photo the replaced copy pointed at stays in the database forever.
      if (prev?.photoId && prev.photoId !== c.photoId) await db.photos.delete(prev.photoId)
      await db.catches.put(c)
      res.catches++
    }
    for (const m of data.markers) {
      if (!validMarker(m)) {
        unreadable()
        continue
      }
      if (isNewer(await db.markers.get(m.id), m.updatedAt)) {
        await db.markers.put(m)
        res.markers++
      } else res.skipped++
    }
    for (const n of data.streamNotes) {
      if (!validNote(n)) {
        unreadable()
        continue
      }
      if (isNewer(await db.streamNotes.get(n.key), n.updatedAt)) {
        // The regulations link is rendered as a link: only http(s) survives.
        await db.streamNotes.put({ ...n, regsUrl: safeHttpUrl(n.regsUrl) })
        res.streamNotes++
      } else res.skipped++
    }
    for (const p of data.photos ?? []) {
      if (typeof p?.id !== 'string' || (await db.photos.get(p.id))) continue
      const full = dataUrlToBlob(p.full)
      const thumb = dataUrlToBlob(p.thumb)
      if (!full || !thumb) {
        unreadable()
        continue
      }
      await db.photos.put({ id: p.id, full, thumb, createdAt: p.createdAt })
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
  // Neutralise spreadsheet formulas, then quote if needed. Only a whole number like -105.23
  // is left alone: "-1+cmd|..." starts with a digit too, and a spreadsheet would run it.
  const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?(e[+-]?\d+)?$/i.test(s) ? `'${s}` : s
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

const isDate = (v: unknown) => typeof v === 'string' && !Number.isNaN(Date.parse(v))
const isOptionalCoord = (v: unknown) => v == null || Number.isFinite(v)

function validCatch(c: Catch): boolean {
  return (
    typeof c?.id === 'string' &&
    typeof c.species === 'string' &&
    isDate(c.caughtAt) &&
    isDate(c.updatedAt) &&
    ['exact', 'water', 'hidden'].includes(c.privacy) &&
    isOptionalCoord(c.lat) &&
    isOptionalCoord(c.lon) &&
    // honour the privacy rule even for imported data
    (c.privacy !== 'hidden' || (c.lat == null && c.lon == null))
  )
}

function validMarker(m: Marker): boolean {
  return typeof m?.id === 'string' && typeof m.name === 'string' && Number.isFinite(m.lat) && Number.isFinite(m.lon) && isDate(m.updatedAt)
}

function validNote(n: StreamNote): boolean {
  return typeof n?.key === 'string' && typeof n.name === 'string' && isDate(n.updatedAt)
}

function isNewer(existing: { updatedAt: string } | undefined, updatedAt: string): boolean {
  return !existing || Date.parse(updatedAt) > Date.parse(existing.updatedAt)
}

function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(b)
  })
}

/** The image in a base64 data URL, or undefined when it isn't one. */
function dataUrlToBlob(url: unknown): Blob | undefined {
  if (typeof url !== 'string') return undefined
  const comma = url.indexOf(',')
  const type = comma < 0 ? undefined : /^data:(image\/[\w.+-]+);base64$/.exec(url.slice(0, comma))?.[1]
  if (!type) return undefined
  try {
    const bin = atob(url.slice(comma + 1))
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return new Blob([bytes], { type })
  } catch {
    return undefined // not valid base64
  }
}
