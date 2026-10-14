import { useEffect, useId, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Download, Trash2, Upload } from 'lucide-react'
import { Button, Field, inputClass, Page, Segmented } from '../components/ui'
import { useToast } from '../components/Toast'
import { db, type Privacy } from '../lib/db'
import { updateSettings, useSettings } from '../lib/settings'
import { buildExport, catchesCsv, download, importExport } from '../lib/transfer'
import { formatBytes, storageEstimate } from '../lib/offline'
import { requestPersistence } from '../lib/catches'
import { formatDate } from '../lib/format'
import type { Units } from '../lib/units'
import { PRIVACY_TEXT } from './LogCatchScreen'

export function SettingsScreen() {
  const s = useSettings()
  const toast = useToast()
  const keyId = useId()
  const [key, setKey] = useState(s.usgsApiKey)
  const [storage, setStorage] = useState<{ usage: number; quota: number }>()
  const [persisted, setPersisted] = useState<boolean>()
  const [withPhotos, setWithPhotos] = useState(true)
  const [busy, setBusy] = useState<string>()
  const fileRef = useRef<HTMLInputElement>(null)
  const areas = useLiveQuery(() => db.offlineAreas.toArray(), [])
  const counts = useLiveQuery(async () => ({ catches: await db.catches.count(), markers: await db.markers.count(), notes: await db.streamNotes.count() }), [])

  useEffect(() => setKey(s.usgsApiKey), [s.usgsApiKey])
  useEffect(() => {
    void storageEstimate().then(setStorage)
    void navigator.storage?.persisted?.().then(setPersisted).catch(() => {})
  }, [busy])

  const exportJson = async () => {
    setBusy('export')
    try {
      const file = await buildExport(withPhotos)
      download(`tailout-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(file), 'application/json')
    } finally {
      setBusy(undefined)
    }
  }

  const importJson = async (f: File | undefined) => {
    if (!f) return
    setBusy('import')
    try {
      const r = await importExport(await f.text())
      toast(`Imported ${r.catches} catches, ${r.markers} markers, ${r.streamNotes} notes${r.skipped ? ` (${r.skipped} skipped, already newer here)` : ''}`)
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(undefined)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const wipe = async () => {
    if (!confirm('Delete every catch, photo, marker and note on this device? Export first if you want a copy.')) return
    await Promise.all([db.catches.clear(), db.photos.clear(), db.markers.clear(), db.streamNotes.clear(), db.offlineAreas.clear(), db.apiCache.clear()])
    toast('All data deleted from this device')
  }

  return (
    <Page title="Settings">
      <Segmented<Units>
        label="Units"
        value={s.units}
        onChange={(units) => void updateSettings({ units })}
        options={[
          { value: 'imperial', label: 'in · lb · °F · cfs' },
          { value: 'metric', label: 'cm · kg · °C · m³/s' },
        ]}
      />
      <div className="flex flex-col gap-1">
        <Segmented<Privacy>
          label="Default location privacy for new catches"
          value={s.defaultPrivacy}
          onChange={(defaultPrivacy) => void updateSettings({ defaultPrivacy })}
          options={(Object.keys(PRIVACY_TEXT) as Privacy[]).map((p) => ({ value: p, label: PRIVACY_TEXT[p].label }))}
        />
        <p className="text-xs text-muted">{PRIVACY_TEXT[s.defaultPrivacy].detail}</p>
      </div>

      <Field
        id={keyId}
        label="USGS API key (optional)"
        hint={
          <>
            Without a key, USGS allows 50 gauge requests an hour from your network. A free key raises that to 1,000.{' '}
            <a className="font-semibold text-accent underline" href="https://api.waterdata.usgs.gov/docs/ogcapi/" target="_blank" rel="noreferrer">
              How to get one
            </a>
          </>
        }
      >
        <div className="flex gap-2">
          <input id={keyId} className={inputClass} value={key} onChange={(e) => setKey(e.target.value.trim())} autoComplete="off" spellCheck={false} />
          <Button
            onClick={() => {
              void updateSettings({ usgsApiKey: key })
              toast(key ? 'Key saved on this device' : 'Key removed')
            }}
          >
            Save
          </Button>
        </div>
      </Field>

      <section className="flex flex-col gap-2 rounded-md bg-surface p-3" aria-label="Your data">
        <h2 className="text-base font-semibold">Your data</h2>
        <p className="text-sm">
          {counts ? `${counts.catches} catches, ${counts.markers} markers, ${counts.notes} stream notes` : '…'}. Stored only in this browser
          {storage ? `, using ${formatBytes(storage.usage)}` : ''}.
        </p>
        {persisted === false ? (
          <div className="flex flex-col gap-2 text-sm">
            <p>This browser may clear site data when space runs low (Safari does after a week without a visit unless the app is installed). Export regularly, or:</p>
            <Button size="sm" onClick={() => void requestPersistence().then((ok) => (setPersisted(ok), toast(ok ? 'Storage protected' : 'The browser declined. Installing the app helps.')))}>
              Ask the browser to keep my data
            </Button>
          </div>
        ) : persisted ? (
          <p className="text-sm text-success">Protected from automatic clearing.</p>
        ) : null}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={withPhotos} onChange={(e) => setWithPhotos(e.target.checked)} className="size-5 accent-[var(--tl-accent)]" />
          Include photos in the backup
        </label>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void exportJson()} busy={busy === 'export'}>
            <Download size={18} /> Back up (JSON)
          </Button>
          <Button onClick={() => void catchesCsv().then((csv) => download('tailout-catches.csv', csv, 'text/csv'))}>
            <Download size={18} /> Catches as CSV
          </Button>
          <Button onClick={() => fileRef.current?.click()} busy={busy === 'import'}>
            <Upload size={18} /> Restore backup
          </Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Backup file to restore" onChange={(e) => void importJson(e.target.files?.[0])} />
        </div>
      </section>

      <section className="flex flex-col gap-2" aria-label="Offline areas">
        <h2 className="text-base font-semibold">Offline map areas</h2>
        {!areas?.length ? (
          <p className="text-sm text-muted">None yet. On the map, open Layers and tap “Save this area”.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {areas.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 rounded-md bg-surface px-3 py-2 text-sm">
                <span>
                  {a.name}
                  <span className="block text-xs text-muted">
                    {a.tiles.toLocaleString()} tiles · {formatDate(a.savedAt)}
                  </span>
                </span>
                <Button size="sm" variant="ghost" aria-label={`Forget ${a.name}`} onClick={() => void db.offlineAreas.delete(a.id)}>
                  Forget
                </Button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted">Tiles stay cached for about two months and are shared between areas. Forgetting an area only removes it from this list.</p>
      </section>

      <Button variant="danger" onClick={() => void wipe()}>
        <Trash2 size={18} /> Delete all my data
      </Button>
    </Page>
  )
}
