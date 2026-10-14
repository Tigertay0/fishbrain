import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { BarChart3 } from 'lucide-react'
import { EmptyState, Page, StatTile } from '../components/ui'
import { db, type Catch } from '../lib/db'
import { useSettings } from '../lib/settings'
import { formatDate } from '../lib/format'
import { formatLength, formatTemp, formatWeight } from '../lib/units'
import { troutTempBand, TEMP_BAND_TEXT, type TempBand } from '../lib/usgs'

export function computeStats(catches: Catch[]) {
  const bySpecies = new Map<string, number>()
  const byHour = Array.from({ length: 24 }, () => 0)
  const byLure = new Map<string, number>()
  const byBand = new Map<TempBand, number>()
  let longest: Catch | undefined
  let heaviest: Catch | undefined
  for (const c of catches) {
    bySpecies.set(c.species, (bySpecies.get(c.species) ?? 0) + 1)
    byHour[new Date(c.caughtAt).getHours()]++
    if (c.lure) byLure.set(c.lure, (byLure.get(c.lure) ?? 0) + 1)
    if (c.conditions?.waterTempC != null) {
      const b = troutTempBand(c.conditions.waterTempC)
      byBand.set(b, (byBand.get(b) ?? 0) + 1)
    }
    if (c.lengthCm && (!longest || c.lengthCm > (longest.lengthCm ?? 0))) longest = c
    if (c.weightG && (!heaviest || c.weightG > (heaviest.weightG ?? 0))) heaviest = c
  }
  const sort = <K,>(m: Map<K, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])
  const bestHour = byHour.indexOf(Math.max(...byHour))
  return { total: catches.length, species: sort(bySpecies), lures: sort(byLure).slice(0, 5), bands: sort(byBand), byHour, bestHour, longest, heaviest }
}

export function StatsScreen() {
  const { units } = useSettings()
  const catches = useLiveQuery(() => db.catches.toArray(), [])
  const st = useMemo(() => computeStats(catches ?? []), [catches])

  if (catches && !catches.length)
    return (
      <Page title="Stats">
        <EmptyState icon={<BarChart3 size={40} />} title="Stats appear after your first catch">
          <Link to="/log" className="inline-flex min-h-11 items-center rounded-md bg-accent px-4 text-sm font-semibold text-on-accent">
            Log a catch
          </Link>
        </EmptyState>
      </Page>
    )

  const max = Math.max(1, ...st.byHour)
  return (
    <Page title="Stats">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Catches" value={st.total} />
        <StatTile label="Species" value={st.species.length} />
        <StatTile label="Longest" value={formatLength(st.longest?.lengthCm, units)} hint={st.longest ? `${st.longest.species}, ${formatDate(st.longest.caughtAt)}` : undefined} />
        <StatTile label="Heaviest" value={formatWeight(st.heaviest?.weightG, units)} hint={st.heaviest ? `${st.heaviest.species}, ${formatDate(st.heaviest.caughtAt)}` : undefined} />
      </div>

      <BarList title="By species" rows={st.species} />
      {st.lures.length ? <BarList title="Top flies and lures" rows={st.lures} /> : null}

      <section aria-label="By hour">
        <h2 className="mb-2 text-base font-semibold">By hour of day {st.total ? <span className="text-sm font-normal text-muted">· most at {fmtHour(st.bestHour)}</span> : null}</h2>
        <div className="flex h-24 items-end gap-[2px]" role="img" aria-label={`Catches by hour; most at ${fmtHour(st.bestHour)}`}>
          {st.byHour.map((n, h) => (
            <span key={h} className="flex-1 rounded-t-sm bg-accent" style={{ height: `${(n / max) * 100}%`, minHeight: n ? 4 : 0 }} title={`${fmtHour(h)}: ${n}`} />
          ))}
        </div>
        <div className="flex justify-between text-[11px] text-muted" aria-hidden>
          <span>12 AM</span>
          <span>6 AM</span>
          <span>12 PM</span>
          <span>6 PM</span>
          <span>11 PM</span>
        </div>
      </section>

      {st.bands.length ? (
        <BarList
          title="By water temperature (trout bands)"
          rows={st.bands.map(([b, n]) => [`${TEMP_BAND_TEXT[b].label} ${bandRange(b, units)}`, n])}
        />
      ) : null}
    </Page>
  )
}

function BarList({ title, rows }: { title: string; rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map((r) => r[1]))
  return (
    <section aria-label={title}>
      <h2 className="mb-2 text-base font-semibold">{title}</h2>
      <ul className="flex flex-col gap-1">
        {rows.map(([label, n]) => (
          <li key={label} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-2 text-sm">
            <span className="truncate">{label}</span>
            <span className="h-3 rounded-full bg-surface">
              <span className="block h-3 rounded-full bg-accent" style={{ width: `${(n / max) * 100}%` }} />
            </span>
            <span className="tabular-nums">{n}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

const fmtHour = (h: number) => (h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`)
const bandRange = (b: TempBand, u: 'imperial' | 'metric') => {
  const r: Record<TempBand, [number | null, number | null]> = { cold: [null, 4.4], cool: [4.4, 10], prime: [10, 18.3], warm: [18.3, 20], stress: [20, null] }
  const [lo, hi] = r[b]
  return lo == null ? `(<${formatTemp(hi!, u)})` : hi == null ? `(≥${formatTemp(lo, u)})` : `(${formatTemp(lo, u)}–${formatTemp(hi, u)})`
}
