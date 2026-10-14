import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { EyeOff, Map as MapIcon, Pencil, Trash2 } from 'lucide-react'
import { Button, EmptyState, Page, StatTile, type Tone } from '../components/ui'
import { useToast } from '../components/Toast'
import { db } from '../lib/db'
import { deleteCatch } from '../lib/catches'
import { usePhotoUrl } from '../lib/photos'
import { useSettings } from '../lib/settings'
import { formatDateTime } from '../lib/format'
import { formatCoords } from '../lib/geo'
import { formatDistance, formatFlow, formatLength, formatPressure, formatTemp, formatWeight, formatWind } from '../lib/units'
import { phaseName } from '../lib/solunar'
import { TEMP_BAND_TEXT, troutTempBand } from '../lib/usgs'
import { weatherLabel } from '../lib/weather'
import { PRIVACY_TEXT } from './LogCatchScreen'

export function CatchDetailScreen() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const { units } = useSettings()
  const c = useLiveQuery(() => (id ? db.catches.get(id) : undefined), [id], null)
  const photo = usePhotoUrl(c?.photoId, 'full')

  if (c === null) return <Page title="Catch">{null}</Page>
  if (!c)
    return (
      <Page title="Catch">
        <EmptyState icon={<EyeOff size={36} />} title="This catch isn't on this device">
          <Link to="/logbook" className="font-semibold text-accent underline">
            Back to the logbook
          </Link>
        </EmptyState>
      </Page>
    )

  const k = c.conditions
  const band = k?.waterTempC != null ? troutTempBand(k.waterTempC) : undefined
  const bandTone: Tone | undefined = band ? ({ cold: 'cold', cool: 'cold', prime: 'good', warm: 'caution', stress: 'bad' } as const)[band] : undefined

  const remove = async () => {
    if (!confirm(`Delete this ${c.species}? This can't be undone.`)) return
    await deleteCatch(c)
    toast('Catch deleted')
    nav('/logbook', { replace: true })
  }

  return (
    <Page
      title={c.species}
      action={
        <Link to={`/catch/${c.id}/edit`} className="inline-flex min-h-11 items-center gap-1 rounded-md px-3 text-sm font-semibold text-accent">
          <Pencil size={16} /> Edit
        </Link>
      }
    >
      {photo ? <img src={photo} alt={`${c.species} catch`} className="max-h-[50dvh] w-full rounded-md object-cover" /> : null}
      <p className="text-sm text-muted">
        {formatDateTime(c.caughtAt)}
        {c.waterName ? ` · ${c.waterName}` : ''}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Length" value={formatLength(c.lengthCm, units)} />
        <StatTile label="Weight" value={formatWeight(c.weightG, units)} />
        <StatTile label="Fly / lure" value={c.lure ?? '—'} />
        <StatTile label="Method" value={c.method ?? '—'} />
      </div>
      {c.notes ? <p className="whitespace-pre-wrap rounded-md bg-surface p-3 text-sm">{c.notes}</p> : null}

      <section aria-label="Conditions" className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">Conditions</h2>
        {k?.pending ? <p className="rounded-md bg-surface p-3 text-sm">Saved offline. Weather and flows are added when you're back online.</p> : null}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile label="Air" value={formatTemp(k?.airTempC, units)} hint={k?.weatherCode != null ? weatherLabel(k.weatherCode) : undefined} />
          <StatTile label="Pressure" value={formatPressure(k?.pressureHpa, units)} hint={k?.pressureTrend ? `${k.pressureTrend} over 3 h` : undefined} />
          <StatTile label="Wind" value={formatWind(k?.windKmh, units)} hint={k?.cloudPct != null ? `${k.cloudPct}% cloud` : undefined} />
          <StatTile label="Moon" value={k?.moonPhase != null ? phaseName(k.moonPhase) : '—'} hint={k?.moonFraction != null ? `${Math.round(k.moonFraction * 100)}% lit` : undefined} />
          {k?.gaugeId ? (
            <>
              <StatTile label="Flow" value={formatFlow(k.flowCfs, units)} hint={`${k.gaugeName ?? k.gaugeId}${k.gaugeKm == null ? '' : k.gaugeKm < 0.1 ? ', at the gauge' : `, ${formatDistance(k.gaugeKm, units)} away`}`} />
              <StatTile label="Water temp" value={formatTemp(k.waterTempC, units)} tone={bandTone} hint={band ? TEMP_BAND_TEXT[band].label : undefined} />
            </>
          ) : null}
        </div>
      </section>

      <section aria-label="Location" className="flex flex-col gap-2 rounded-md bg-surface p-3">
        <h2 className="text-sm font-semibold">Location · {PRIVACY_TEXT[c.privacy].label}</h2>
        {c.lat != null && c.lon != null ? (
          <>
            <p className="text-sm">
              {formatCoords({ lat: c.lat, lon: c.lon })}
              {c.privacy === 'water' ? ' (rounded to ~1 km)' : ''}
            </p>
            <Button size="sm" onClick={() => nav(`/?focus=${c.lat},${c.lon},${c.privacy === 'water' ? 12 : 15}`)}>
              <MapIcon size={16} /> Show on map
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted">{c.privacy === 'hidden' ? 'No location was stored for this catch.' : 'No location.'}</p>
        )}
      </section>

      <Button variant="danger" onClick={() => void remove()}>
        <Trash2 size={18} /> Delete catch
      </Button>
    </Page>
  )
}
