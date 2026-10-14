import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { BarChart3, EyeOff, Fish, MapPin } from 'lucide-react'
import { Chip, EmptyState, Page } from '../components/ui'
import { db, type Catch } from '../lib/db'
import { usePhotoUrl } from '../lib/photos'
import { useSettings } from '../lib/settings'
import { formatDate } from '../lib/format'
import { formatLength, formatWeight, type Units } from '../lib/units'

export function LogbookScreen() {
  const { units } = useSettings()
  const catches = useLiveQuery(() => db.catches.orderBy('caughtAt').reverse().toArray(), [])
  const [species, setSpecies] = useState<string | null>(null)
  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of catches ?? []) m.set(c.species, (m.get(c.species) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [catches])
  const shown = (catches ?? []).filter((c) => !species || c.species === species)

  return (
    <Page
      title="Logbook"
      action={
        <Link to="/stats" className="inline-flex min-h-11 items-center gap-1 rounded-md px-3 text-sm font-semibold text-accent">
          <BarChart3 size={18} /> Stats
        </Link>
      }
    >
      {catches === undefined ? (
        <div className="flex flex-col gap-2" role="status" aria-label="Loading">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-20" />
          ))}
        </div>
      ) : catches.length === 0 ? (
        <EmptyState icon={<Fish size={40} />} title="No catches yet">
          <p className="text-sm text-muted">Your logbook lives on this device only. Nobody else sees it.</p>
          <Link to="/log" className="inline-flex min-h-11 items-center rounded-md bg-accent px-4 text-sm font-semibold text-on-accent">
            Log your first catch
          </Link>
        </EmptyState>
      ) : (
        <>
          {counts.length > 1 ? (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Filter by species">
              <Chip on={species === null} onClick={() => setSpecies(null)}>
                All {catches.length}
              </Chip>
              {counts.map(([name, n]) => (
                <Chip key={name} on={species === name} onClick={() => setSpecies(species === name ? null : name)}>
                  {name} {n}
                </Chip>
              ))}
            </div>
          ) : null}
          <ul className="flex flex-col gap-2">
            {shown.map((c) => (
              <li key={c.id}>
                <CatchCard c={c} units={units} />
              </li>
            ))}
          </ul>
        </>
      )}
    </Page>
  )
}

function CatchCard({ c, units }: { c: Catch; units: Units }) {
  const url = usePhotoUrl(c.photoId, 'thumb')
  const size = [c.lengthCm ? formatLength(c.lengthCm, units) : null, c.weightG ? formatWeight(c.weightG, units) : null].filter(Boolean).join(' · ')
  return (
    <Link to={`/catch/${c.id}`} className="flex items-center gap-3 rounded-md bg-raised p-2 shadow-card hover:bg-surface">
      {url ? (
        <img src={url} alt="" className="size-16 shrink-0 rounded-sm object-cover" />
      ) : (
        <span className="flex size-16 shrink-0 items-center justify-center rounded-sm bg-surface text-xl font-bold text-muted" aria-hidden>
          {c.species.charAt(0)}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-semibold">{c.species}</span>
        {size ? <span className="text-sm">{size}</span> : null}
        <span className="flex items-center gap-1 truncate text-xs text-muted">
          {formatDate(c.caughtAt)}
          {c.waterName ? ` · ${c.waterName}` : ''}
          {c.privacy === 'hidden' ? <EyeOff size={12} aria-label="location hidden" /> : c.lat != null ? <MapPin size={12} aria-label="has location" /> : null}
        </span>
      </span>
    </Link>
  )
}
