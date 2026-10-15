import { useId, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button, DirectionsLink, Field, inputClass, Segmented, Sheet } from '../components/ui'
import { useToast } from '../components/Toast'
import { db, newId, nowIso, type Marker, type MarkerKind } from '../lib/db'
import { formatCoords, type LngLat } from '../lib/geo'

export const MARKER_KINDS: { value: MarkerKind; label: string }[] = [
  { value: 'access', label: 'Access' },
  { value: 'parking', label: 'Parking' },
  { value: 'bridge', label: 'Bridge' },
  { value: 'run', label: 'Good run' },
  { value: 'camp', label: 'Camp' },
  { value: 'note', label: 'Note' },
]

export function MarkerSheet({ marker, point, preset, onClose }: { marker?: Marker; point: LngLat; preset?: Partial<Marker>; onClose: () => void }) {
  const toast = useToast()
  const [kind, setKind] = useState<MarkerKind>(marker?.kind ?? preset?.kind ?? 'access')
  const [name, setName] = useState(marker?.name ?? preset?.name ?? '')
  const [notes, setNotes] = useState(marker?.notes ?? '')
  const [error, setError] = useState<string>()
  // One id for the life of the sheet, so a double tap on Save writes one marker, not two.
  const [id] = useState(() => marker?.id ?? newId())
  const nameId = useId()
  const notesId = useId()

  const save = async () => {
    if (!name.trim()) {
      setError('Give it a name you will recognise later.')
      return
    }
    const now = nowIso()
    await db.markers.put({
      id,
      kind,
      name: name.trim(),
      notes: notes.trim() || undefined,
      lat: point.lat,
      lon: point.lon,
      createdAt: marker?.createdAt ?? now,
      updatedAt: now,
    })
    toast(marker ? 'Marker updated' : 'Marker saved')
    onClose()
  }

  const remove = async () => {
    if (!marker || !confirm(`Delete “${marker.name}”?`)) return
    await db.markers.delete(marker.id)
    toast('Marker deleted')
    onClose()
  }

  return (
    <Sheet
      title={marker ? 'Edit marker' : 'New marker'}
      onClose={onClose}
      actions={
        <>
          <Button variant="primary" onClick={() => void save()}>
            Save marker
          </Button>
          {marker ? (
            <>
              <DirectionsLink point={point} />
              <Button variant="danger" onClick={() => void remove()}>
                <Trash2 size={18} /> Delete
              </Button>
            </>
          ) : null}
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Segmented label="Type" value={kind} options={MARKER_KINDS} onChange={setKind} />
        <Field id={nameId} label="Name" error={error}>
          <input
            id={nameId}
            className={inputClass}
            value={name}
            maxLength={80}
            aria-invalid={!!error}
            aria-describedby={error ? `${nameId}-error` : undefined}
            onChange={(e) => {
              setName(e.target.value)
              setError(undefined)
            }}
          />
        </Field>
        <Field id={notesId} label="Notes">
          <textarea id={notesId} rows={3} className={`${inputClass} py-2`} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <p className="text-xs text-muted">
          {formatCoords(point)}
          {!marker ? ' · the ring on the map shows where it goes' : ''}
        </p>
      </div>
    </Sheet>
  )
}
