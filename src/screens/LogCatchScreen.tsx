import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Camera, LocateFixed, Trash2, X } from 'lucide-react'
import { Button, Field, inputClass, Page, Segmented } from '../components/ui'
import { useToast } from '../components/Toast'
import { db, type Photo, type Privacy } from '../lib/db'
import { saveCatch } from '../lib/catches'
import { makePhoto, usePhotoUrl } from '../lib/photos'
import { updateSettings, useSettings } from '../lib/settings'
import { fromLocalInput, toLocalInput } from '../lib/format'
import { formatCoords, type LngLat } from '../lib/geo'
import { LURES, METHODS, SPECIES_NAMES } from '../lib/species'
import { lengthInputValue, lengthUnit, parseLength, parseWeight, weightInputValue, weightUnit } from '../lib/units'

export const PRIVACY_TEXT: Record<Privacy, { label: string; detail: string }> = {
  exact: { label: 'Exact spot', detail: 'Saves the exact point. It still never leaves this device.' },
  water: { label: 'Water only', detail: 'Saves the water name and a point rounded to about 1 km.' },
  hidden: { label: 'Hidden', detail: 'Saves no location at all. Weather is still looked up, then the point is thrown away.' },
}

type Loc = { point?: LngLat; source: 'gps' | 'link' | 'saved' | 'none'; accuracy?: number }

export function LogCatchScreen() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const toast = useToast()
  const s = useSettings()
  const existing = useLiveQuery(() => (id ? db.catches.get(id) : undefined), [id])
  const recentSpecies = useLiveQuery(async () => {
    const rows = await db.catches.orderBy('caughtAt').reverse().limit(50).toArray()
    return [...new Set(rows.map((r) => r.species))]
  }, [])
  const ids = { species: useId(), length: useId(), weight: useId(), lure: useId(), water: useId(), when: useId(), notes: useId(), photo: useId() }

  const [species, setSpecies] = useState('')
  const [length, setLength] = useState('')
  const [weight, setWeight] = useState('')
  const [lure, setLure] = useState('')
  const [method, setMethod] = useState('Fly')
  const [water, setWater] = useState(params.get('water') ?? '')
  const [when, setWhen] = useState(toLocalInput(new Date().toISOString()))
  const [notes, setNotes] = useState('')
  const [privacy, setPrivacy] = useState<Privacy>(s.defaultPrivacy)
  const [loc, setLoc] = useState<Loc>({ source: 'none' })
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [keepPhotoId, setKeepPhotoId] = useState<string | undefined>()
  const [photoBusy, setPhotoBusy] = useState(false)
  const [locating, setLocating] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const loadedFor = useRef<string>(undefined)
  const keptUrl = usePhotoUrl(keepPhotoId, 'thumb')
  const newUrl = useMemo(() => (photo ? URL.createObjectURL(photo.thumb) : undefined), [photo])
  useEffect(() => () => (newUrl ? URL.revokeObjectURL(newUrl) : undefined), [newUrl])

  // Edit: fill the form once.
  useEffect(() => {
    if (!existing || loadedFor.current === existing.id) return
    loadedFor.current = existing.id
    setSpecies(existing.species)
    setLength(lengthInputValue(existing.lengthCm, s.units))
    setWeight(weightInputValue(existing.weightG, s.units))
    setLure(existing.lure ?? '')
    setMethod(existing.method ?? 'Fly')
    setWater(existing.waterName ?? '')
    setWhen(toLocalInput(existing.caughtAt))
    setNotes(existing.notes ?? '')
    setPrivacy(existing.privacy)
    setKeepPhotoId(existing.photoId)
    setLoc(existing.lat != null && existing.lon != null ? { point: { lat: existing.lat, lon: existing.lon }, source: 'saved' } : { source: 'none' })
  }, [existing, s.units])

  const locate = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        const point = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        setLoc({ point, source: 'gps', accuracy: pos.coords.accuracy })
        void updateSettings({ lastFix: { ...point, at: Date.now() } })
      },
      (err) => {
        setLocating(false)
        if (err.code === err.PERMISSION_DENIED) toast('Location is off for this site. The catch will save without a place.', 'error')
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60_000 },
    )
  }

  // New catch: take the place from the link (map, gauge) or ask GPS.
  useEffect(() => {
    if (id) return
    const lat = Number(params.get('lat'))
    const lon = Number(params.get('lon'))
    if (params.get('lat') && Number.isFinite(lat) && Number.isFinite(lon)) setLoc({ point: { lat, lon }, source: 'link' })
    else locate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const onPhoto = async (file: File | undefined) => {
    if (!file) return
    setPhotoBusy(true)
    try {
      setPhoto(await makePhoto(file))
      setKeepPhotoId(undefined)
    } catch {
      toast("Couldn't read that photo", 'error')
    } finally {
      setPhotoBusy(false)
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (saving) return
    const errs: Record<string, string> = {}
    if (!species.trim()) errs.species = 'What did you catch?'
    const lengthCm = parseLength(length, s.units)
    if (length.trim() && lengthCm == null) errs.length = 'Enter a number, like 14.5'
    const weightG = parseWeight(weight, s.units)
    if (weight.trim() && weightG == null) errs.weight = 'Enter a number, like 1.2'
    if (!when || Number.isNaN(Date.parse(when))) errs.when = 'Pick a date and time'
    else if (Date.parse(when) > Date.now() + 5 * 60_000) errs.when = "That's in the future"
    setErrors(errs)
    if (Object.keys(errs).length) {
      document.getElementById(ids[Object.keys(errs)[0] as keyof typeof ids])?.focus()
      return
    }
    setSaving(true)
    try {
      let photoId = keepPhotoId
      if (photo) {
        await db.photos.put(photo)
        photoId = photo.id
      }
      const newId = await saveCatch(
        {
          species: species.trim(),
          lengthCm,
          weightG,
          lure: lure.trim() || undefined,
          method,
          waterName: water.trim() || undefined,
          caughtAt: fromLocalInput(when),
          notes: notes.trim() || undefined,
          privacy,
          photoId,
          point: loc.point,
        },
        existing,
      )
      // Only once the catch no longer points at the old photo is it safe to drop; if this
      // fails the photo is merely orphaned, and the catch is saved either way.
      if (existing?.photoId && existing.photoId !== photoId) await db.photos.delete(existing.photoId).catch(() => undefined)
      toast(existing ? 'Catch updated' : 'Catch saved')
      nav(`/catch/${newId}`, { replace: true })
    } catch {
      toast('Could not save. Is storage full?', 'error')
      setSaving(false)
    }
  }

  const speciesOptions = useMemo(() => [...new Set([...(recentSpecies ?? []), ...SPECIES_NAMES])], [recentSpecies])
  const thumb = newUrl ?? keptUrl

  return (
    <Page title={id ? 'Edit catch' : 'Log a catch'}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          {thumb ? (
            <div className="relative">
              <img src={thumb} alt="Catch photo" className="size-24 rounded-md object-cover" />
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => {
                  setPhoto(null)
                  setKeepPhotoId(undefined)
                }}
                className="absolute -right-2 -top-2 flex size-8 items-center justify-center rounded-full bg-raised shadow-pop"
              >
                <X size={16} />
              </button>
            </div>
          ) : null}
          <label htmlFor={ids.photo} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border bg-raised px-4 text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus">
            <Camera size={18} /> {photoBusy ? 'Processing…' : thumb ? 'Change photo' : 'Add photo'}
            <input id={ids.photo} type="file" accept="image/*" className="sr-only" onChange={(e) => void onPhoto(e.target.files?.[0])} />
          </label>
        </div>

        <Field id={ids.species} label="Species" error={errors.species}>
          <input
            id={ids.species}
            list={`${ids.species}-list`}
            className={inputClass}
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
            aria-invalid={!!errors.species}
            aria-describedby={errors.species ? `${ids.species}-error` : undefined}
            autoComplete="off"
            required
          />
          <datalist id={`${ids.species}-list`}>
            {speciesOptions.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field id={ids.length} label={`Length (${lengthUnit(s.units)})`} error={errors.length}>
            <input id={ids.length} inputMode="decimal" className={inputClass} value={length} onChange={(e) => setLength(e.target.value)} aria-invalid={!!errors.length} aria-describedby={errors.length ? `${ids.length}-error` : undefined} />
          </Field>
          <Field id={ids.weight} label={`Weight (${weightUnit(s.units)})`} error={errors.weight}>
            <input id={ids.weight} inputMode="decimal" className={inputClass} value={weight} onChange={(e) => setWeight(e.target.value)} aria-invalid={!!errors.weight} aria-describedby={errors.weight ? `${ids.weight}-error` : undefined} />
          </Field>
        </div>

        <Field id={ids.lure} label="Fly, lure or bait">
          <input id={ids.lure} list={`${ids.lure}-list`} className={inputClass} value={lure} onChange={(e) => setLure(e.target.value)} autoComplete="off" />
          <datalist id={`${ids.lure}-list`}>
            {LURES.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </Field>

        <Segmented label="Method" value={method} onChange={setMethod} options={METHODS.map((m) => ({ value: m, label: m }))} />

        <Field id={ids.water} label="Water" hint="River, creek or lake name">
          <input id={ids.water} className={inputClass} value={water} onChange={(e) => setWater(e.target.value)} />
        </Field>

        <Field id={ids.when} label="When" error={errors.when}>
          <input id={ids.when} type="datetime-local" className={inputClass} value={when} onChange={(e) => setWhen(e.target.value)} aria-invalid={!!errors.when} aria-describedby={errors.when ? `${ids.when}-error` : undefined} />
        </Field>

        <div className="flex flex-col gap-2 rounded-md bg-surface p-3">
          <span className="text-sm font-semibold">Location</span>
          <p className="text-sm" aria-live="polite">
            {locating
              ? 'Finding you…'
              : loc.point
                ? `${formatCoords(loc.point)}${loc.accuracy ? ` (±${Math.round(loc.accuracy)} m)` : ''}${loc.source === 'link' ? ', from the map' : ''}`
                : 'No location. The catch saves without one.'}
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={locate} busy={locating}>
              <LocateFixed size={16} /> Use my location
            </Button>
            {loc.point ? (
              <Button size="sm" variant="ghost" onClick={() => setLoc({ source: 'none' })}>
                <Trash2 size={16} /> Clear
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Segmented<Privacy>
            label="Location privacy"
            value={privacy}
            onChange={setPrivacy}
            options={(Object.keys(PRIVACY_TEXT) as Privacy[]).map((p) => ({ value: p, label: PRIVACY_TEXT[p].label }))}
          />
          <p className="text-xs text-muted">{PRIVACY_TEXT[privacy].detail}</p>
        </div>

        <Field id={ids.notes} label="Notes">
          <textarea id={ids.notes} rows={3} className={`${inputClass} py-2`} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <Button type="submit" variant="primary" busy={saving}>
          {saving ? 'Saving…' : existing ? 'Save changes' : 'Save catch'}
        </Button>
        <p className="text-xs text-muted">Weather, pressure, moon and the nearest gauge are added automatically. Saved offline? They're filled in when you're back online.</p>
      </form>
    </Page>
  )
}
