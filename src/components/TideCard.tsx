import { ArrowDown, ArrowUp, Waves } from 'lucide-react'
import { formatClockDay } from '../lib/format'
import { STAGE_TEXT, tideNow, type TideEvent, type TideStation } from '../lib/tides'

export type Tides = { station: TideStation; events: TideEvent[] }

const HOUR = 3_600_000

/** Where the tide is now and the next turns, from the nearest NOAA station. */
export function TideCard({ tides, offsetSec }: { tides: Tides | null | undefined; offsetSec?: number }) {
  if (tides === undefined) return <div className="skeleton h-28" role="status" aria-label="Loading tides" />
  if (tides === null) {
    return (
      <section aria-label="Tides" className="rounded-md bg-surface p-4 text-sm">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <Waves size={18} aria-hidden /> Tides
        </h2>
        <p className="mt-1">No NOAA tide station within 25 miles (tide predictions here cover US coasts). Fish the moving water between the turns.</p>
      </section>
    )
  }
  const now = Date.now()
  const state = tideNow(tides.events, now)
  const upcoming = tides.events.filter((e) => e.t > now && e.t < now + 30 * HOUR).slice(0, 4)
  const inMin = state?.minutesToNext
  const until = inMin == null ? '' : inMin < 60 ? `${inMin} min` : `${Math.floor(inMin / 60)} h ${String(inMin % 60).padStart(2, '0')} min`
  return (
    <section aria-label="Tides" className="flex flex-col gap-2 rounded-md bg-surface p-4 text-sm">
      <h2 className="flex items-center gap-2 text-base font-bold">
        <Waves size={18} aria-hidden /> Tides
      </h2>
      {state ? (
        <p>
          <span className="font-semibold">{STAGE_TEXT[state.stage]}</span>
          {` · ${state.next.type === 'high' ? 'High' : 'Low'} tide in ${until}, at ${formatClockDay(state.next.t, offsetSec, now)}`}
        </p>
      ) : null}
      <ul className="flex flex-wrap gap-x-4 gap-y-1" role="list" aria-label="Next highs and lows">
        {upcoming.map((e) => (
          <li key={e.t} className="flex items-center gap-1">
            {e.type === 'high' ? <ArrowUp size={14} aria-hidden className="text-water" /> : <ArrowDown size={14} aria-hidden className="text-muted" />}
            <span>
              {e.type === 'high' ? 'High' : 'Low'} {formatClockDay(e.t, offsetSec, now)} <span className="text-muted">({e.ft} ft)</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">
        Predictions for {tides.station.name}, {tides.station.km < 1 ? 'under 1' : Math.round(tides.station.km)} km away (NOAA). Wind and river flow can shift the timing.
      </p>
    </section>
  )
}
