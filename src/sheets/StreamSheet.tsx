import { useEffect, useId, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { CloudSun, Fish, MapPinPlus, Sparkles } from 'lucide-react'
import { Button, Chip, DirectionsLink, Field, inputClass, Sheet } from '../components/ui'
import { useToast } from '../components/Toast'
import { db, nowIso, type StreamNote } from '../lib/db'
import { peekCache } from '../lib/cache'
import type { LngLat } from '../lib/geo'
import { normalizeWater, streamKey, type StreamHit } from '../lib/streams'
import { useGauges } from '../lib/store'
import { nearestGauges, type Gauge } from '../lib/usgs'
import { formatDistance, formatFlow, formatTemp, formatLength } from '../lib/units'
import { useSettings } from '../lib/settings'
import { formatDate, safeHttpUrl } from '../lib/format'
import { PROFILES } from '../lib/species'

const CLASS_SUGGESTIONS = ['Wild trout', 'Stocked', 'Catch and release', 'Artificial lures only', 'Delayed harvest', 'Trophy water']
const TROUT = PROFILES.filter((s) => s.group === 'trout').map((s) => s.name)

export function StreamSheet({
  hit,
  onClose,
  onGauge,
  onAddMarker,
}: {
  hit: StreamHit
  onClose: () => void
  onGauge: (g: Gauge) => void
  onAddMarker: (p: LngLat, name?: string) => void
}) {
  const { units } = useSettings()
  const nav = useNavigate()
  const toast = useToast()
  const gauges = useGauges()
  const near = useMemo(() => nearestGauges(hit, gauges, 25, 3), [hit, gauges])
  const key = hit.name ? streamKey(hit.name, hit.lat, hit.lon) : undefined
  const note = useLiveQuery(() => (key ? db.streamNotes.get(key) : undefined), [key])
  const mine = useLiveQuery(
    () => (hit.name ? db.catches.filter((c) => !!c.waterName && normalizeWater(c.waterName) === normalizeWater(hit.name!)).toArray() : []),
    [hit.name],
  )
  const title = hit.name ?? `Unnamed ${hit.kind}`
  const ids = { cls: useId(), regs: useId(), checked: useId(), notes: useId() }

  const [draft, setDraft] = useState<Omit<StreamNote, 'key' | 'name' | 'updatedAt'>>({})
  const [editing, setEditing] = useState(false)
  useEffect(() => {
    setDraft({ classLabel: note?.classLabel, species: note?.species, regsUrl: note?.regsUrl, regsCheckedOn: note?.regsCheckedOn, notes: note?.notes })
  }, [note])

  const save = async () => {
    if (!key || !hit.name) return
    const regsUrl = draft.regsUrl?.trim()
    if (regsUrl && !safeHttpUrl(regsUrl)) {
      toast('Regulations link must start with http:// or https://', 'error')
      return
    }
    try {
      await db.streamNotes.put({ ...draft, regsUrl: regsUrl || undefined, key, name: hit.name, updatedAt: nowIso() })
    } catch {
      toast('Could not save. Is storage full?', 'error')
      return
    }
    setEditing(false)
    toast('Stream notes saved')
  }
  const regsHref = safeHttpUrl(note?.regsUrl)

  const q = `lat=${hit.lat}&lon=${hit.lon}`
  return (
    <Sheet
      title={
        <span className="flex flex-col">
          <span>{title}</span>
          <span className="text-xs font-medium capitalize text-muted">
            {hit.kind}
            {hit.intermittent ? ' · may run dry' : ''}
            {note?.classLabel ? ` · ${note.classLabel}` : ''}
          </span>
        </span>
      }
      onClose={onClose}
      actions={
        <>
          <Button variant="primary" onClick={() => nav(`/plan?${q}&type=${hit.kind === 'river' ? 'river' : 'stream'}${hit.name ? `&name=${encodeURIComponent(hit.name)}` : ''}`)}>
            <Sparkles size={18} /> What to use here
          </Button>
          <Button onClick={() => nav(`/log?${q}${hit.name ? `&water=${encodeURIComponent(hit.name)}` : ''}`)}>
            <Fish size={18} /> Log a catch here
          </Button>
          <Button onClick={() => onAddMarker(hit, hit.name)}>
            <MapPinPlus size={18} /> Add marker
          </Button>
          <Button onClick={() => nav(`/forecast?${q}&name=${encodeURIComponent(title)}`)}>
            <CloudSun size={18} /> Forecast
          </Button>
          <DirectionsLink point={hit} />
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <section aria-label="Nearby gauges">
          <h3 className="mb-1 text-sm font-semibold">Nearest gauges</h3>
          {near.length === 0 ? (
            <p className="text-sm text-muted">No live USGS gauge within 25 km. Zoom out a little to load more, or judge flows by eye.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {near.map(({ gauge, km }) => (
                <li key={gauge.id}>
                  <button type="button" onClick={() => onGauge(gauge)} className="flex w-full items-center justify-between gap-2 rounded-md bg-surface px-3 py-2 text-left">
                    <span className="text-sm font-semibold">
                      <CachedGaugeName id={gauge.id} />
                    </span>
                    <span className="text-sm">
                      {formatFlow(gauge.flowCfs, units)}
                      {gauge.tempC != null ? ` · ${formatTemp(gauge.tempC, units)}` : ''}
                      <span className="text-muted"> · {formatDistance(km, units)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {hit.name ? (
          <section aria-label="My notes">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-sm font-semibold">My notes on this stretch</h3>
              {!editing ? (
                <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                  {note ? 'Edit' : 'Add notes'}
                </Button>
              ) : null}
            </div>
            {!editing ? (
              note ? (
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  {note.classLabel ? (
                    <>
                      <dt className="text-muted">Class</dt>
                      <dd>{note.classLabel}</dd>
                    </>
                  ) : null}
                  {note.species?.length ? (
                    <>
                      <dt className="text-muted">Species</dt>
                      <dd>{note.species.join(', ')}</dd>
                    </>
                  ) : null}
                  {regsHref ? (
                    <>
                      <dt className="text-muted">Regs</dt>
                      <dd>
                        <a className="font-semibold text-accent underline" href={regsHref} target="_blank" rel="noreferrer">
                          Open regulations
                        </a>
                        {note.regsCheckedOn ? <span className="text-muted"> · checked {formatDate(note.regsCheckedOn)}</span> : null}
                      </dd>
                    </>
                  ) : null}
                  {note.notes ? (
                    <>
                      <dt className="text-muted">Notes</dt>
                      <dd className="whitespace-pre-wrap">{note.notes}</dd>
                    </>
                  ) : null}
                </dl>
              ) : (
                <p className="text-sm text-muted">Keep your own class, species, a link to the current regulations and notes. They stay on this device.</p>
              )
            ) : (
              <div className="flex flex-col gap-3">
                <Field id={ids.cls} label="Class or type">
                  <input id={ids.cls} list={`${ids.cls}-list`} className={inputClass} value={draft.classLabel ?? ''} onChange={(e) => setDraft({ ...draft, classLabel: e.target.value || undefined })} />
                  <datalist id={`${ids.cls}-list`}>
                    {CLASS_SUGGESTIONS.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </Field>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold">Species here</span>
                  <div className="flex flex-wrap gap-2">
                    {TROUT.map((s) => (
                      <Chip
                        key={s}
                        on={!!draft.species?.includes(s)}
                        onClick={() =>
                          setDraft({ ...draft, species: draft.species?.includes(s) ? draft.species.filter((x) => x !== s) : [...(draft.species ?? []), s] })
                        }
                      >
                        {s.replace(' trout', '')}
                      </Chip>
                    ))}
                  </div>
                </div>
                <Field id={ids.regs} label="Regulations link" hint="Your state agency's page for this water.">
                  <input id={ids.regs} type="url" inputMode="url" className={inputClass} value={draft.regsUrl ?? ''} onChange={(e) => setDraft({ ...draft, regsUrl: e.target.value })} placeholder="https://" />
                </Field>
                <Field id={ids.checked} label="Regs checked on">
                  <input id={ids.checked} type="date" className={inputClass} value={draft.regsCheckedOn ?? ''} onChange={(e) => setDraft({ ...draft, regsCheckedOn: e.target.value || undefined })} />
                </Field>
                <Field id={ids.notes} label="Notes">
                  <textarea id={ids.notes} rows={3} className={`${inputClass} py-2`} value={draft.notes ?? ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value || undefined })} />
                </Field>
                <div className="flex gap-2">
                  <Button variant="primary" onClick={() => void save()}>
                    Save notes
                  </Button>
                  <Button variant="ghost" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </section>
        ) : (
          <p className="text-sm text-muted">This stream has no name on the map, so notes can't attach to it. Add a marker instead.</p>
        )}

        {mine?.length ? (
          <section aria-label="My catches here">
            <h3 className="mb-1 text-sm font-semibold">My catches on {hit.name} ({mine.length})</h3>
            <ul className="flex flex-col gap-1 text-sm">
              {mine.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <Link to={`/catch/${c.id}`} className="text-accent underline">
                    {c.species}
                    {c.lengthCm ? `, ${formatLength(c.lengthCm, units)}` : ''}
                  </Link>{' '}
                  <span className="text-muted">· {formatDate(c.caughtAt)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <p className="text-xs text-muted">Stream lines © OpenStreetMap contributors. Access and regulations are not shown by the map: check before you fish.</p>
      </div>
    </Sheet>
  )
}

/** A gauge's name if it was ever fetched; otherwise its id. Never spends a USGS request. */
function CachedGaugeName({ id }: { id: string }) {
  const [name, setName] = useState<string>()
  useEffect(() => {
    let live = true
    void peekCache<string | undefined>(`usgs:name:${id}`).then((r) => live && setName(r?.data))
    return () => {
      live = false
    }
  }, [id])
  return <>{name ?? id}</>
}
