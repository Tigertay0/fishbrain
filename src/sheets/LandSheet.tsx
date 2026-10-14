import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CircleCheck, CircleQuestionMark, CircleX, MapPinPlus, ShieldAlert, Sparkles, TriangleAlert } from 'lucide-react'
import { Button, Sheet } from '../components/ui'
import { ACCESS_TEXT, formatAcres, lookupLand, MANAGER_LABEL, type Access, type LandLookup, type ManagerKind } from '../lib/publicland'
import type { LngLat } from '../lib/geo'

export type LandHit = LngLat & { manager: ManagerKind }

const ACCESS_ICON: Record<Access, { icon: typeof CircleCheck; tone: string }> = {
  open: { icon: CircleCheck, tone: 'text-success' },
  restricted: { icon: ShieldAlert, tone: 'text-warning' },
  closed: { icon: CircleX, tone: 'text-danger' },
  unknown: { icon: CircleQuestionMark, tone: 'text-muted' },
}

const EASEMENT_NOTE =
  'This is a conservation easement: usually private land the owner has agreed not to develop. You can only go in where the access above, or signs on the ground, say so.'

const MANAGER_NOTE: Partial<Record<ManagerKind, string>> = {
  tribal: 'Tribal land: fishing usually needs a tribal permit, separate from your state licence. Check with the tribe first.',
  ngo: 'Land trusts and conservation groups set their own rules. Many welcome anglers; some only on marked trails or by permission.',
}

export function LandSheet({ hit, onClose, onAddMarker }: { hit: LandHit; onClose: () => void; onAddMarker: (p: LngLat, name?: string) => void }) {
  const nav = useNavigate()
  const [result, setResult] = useState<LandLookup>()
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let live = true
    setState('loading')
    lookupLand(hit.lat, hit.lon)
      .then((r) => {
        if (!live) return
        setResult(r)
        setState('ok')
      })
      .catch(() => live && setState('error'))
    return () => {
      live = false
    }
  }, [hit.lat, hit.lon, attempt])

  const [main, ...others] = result?.parcels ?? []
  const note = main?.featureClass === 'Easement' ? EASEMENT_NOTE : MANAGER_NOTE[hit.manager]

  return (
    <Sheet
      title={
        <span className="flex flex-col">
          <span>{main?.name ?? MANAGER_LABEL[hit.manager]}</span>
          <span className="text-xs font-medium text-muted">{main?.managerType ? `${main.managerType} land` : MANAGER_LABEL[hit.manager]}</span>
        </span>
      }
      onClose={onClose}
      actions={
        <>
          <Button onClick={() => nav(`/plan?lat=${hit.lat}&lon=${hit.lon}`)}>
            <Sparkles size={18} /> What to use here
          </Button>
          <Button onClick={() => onAddMarker(hit, main?.name)}>
            <MapPinPlus size={18} /> Save as my marker
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 text-sm">
        {state === 'loading' ? <div className="skeleton h-16" role="status" aria-label="Looking up this land" /> : null}
        <div aria-live="polite" className="flex flex-col gap-3">
          {state === 'error' ? (
            <div className="flex flex-col items-start gap-2 rounded-md bg-surface p-3">
              <p>
                Couldn’t look up the details (offline?). The shading says this is {MANAGER_LABEL[hit.manager].toLowerCase()}; whether you can get in isn’t known
                until the lookup works.
              </p>
              <Button size="sm" onClick={() => setAttempt((n) => n + 1)}>
                Try again
              </Button>
            </div>
          ) : null}
          {state === 'ok' && !main ? (
            <p className="rounded-md bg-surface p-3">
              The map shades this spot, but the land records have nothing right here: you may be on a boundary or a private parcel inside it. Treat it as private
              unless signs say otherwise.
            </p>
          ) : null}
          {state === 'ok' && result && !result.complete ? (
            <p className="text-xs text-muted">Part of the lookup failed (weak signal?), so this may be incomplete. Tap the land again to retry.</p>
          ) : null}
        </div>
        {main ? <AccessBadge access={main.access} /> : null}
        {main ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            {main.manager ? (
              <>
                <dt className="text-muted">Managed by</dt>
                <dd>{main.manager}</dd>
              </>
            ) : null}
            {main.designation ? (
              <>
                <dt className="text-muted">Type</dt>
                <dd>{main.designation}</dd>
              </>
            ) : null}
            {main.acres ? (
              <>
                <dt className="text-muted">Size</dt>
                <dd>{formatAcres(main.acres)}</dd>
              </>
            ) : null}
            {others.length ? (
              <>
                <dt className="text-muted">Also here</dt>
                <dd>{others.map((o) => `${o.name} (${ACCESS_TEXT[o.access].label.toLowerCase()})`).join('; ')}</dd>
              </>
            ) : null}
          </dl>
        ) : null}
        {note ? (
          <p className="flex gap-2 rounded-md bg-surface p-3">
            <TriangleAlert size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden />
            <span>{note}</span>
          </p>
        ) : null}
        <p className="text-xs text-muted">
          Boundaries are approximate and rules change: obey posted signs, and check fishing regulations and any closures for this land. Source: USGS Protected Areas Database
          (PAD-US).
        </p>
      </div>
    </Sheet>
  )
}

function AccessBadge({ access }: { access: Access }) {
  const { icon: Icon, tone } = ACCESS_ICON[access]
  const t = ACCESS_TEXT[access]
  return (
    <div className="flex gap-2 rounded-md bg-surface p-3">
      <Icon size={20} className={`mt-0.5 shrink-0 ${tone}`} aria-hidden />
      <div className="flex flex-col">
        <span className={`font-semibold ${tone}`}>{t.label}</span>
        <span>{t.detail}</span>
      </div>
    </div>
  )
}
