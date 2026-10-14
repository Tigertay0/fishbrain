import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LocateFixed } from 'lucide-react'
import { Button, Page, StatTile } from '../components/ui'
import { useToast } from '../components/Toast'
import { updateSettings, useSettings } from '../lib/settings'
import { loadForecast, pressureTrend, weatherLabel, type Forecast } from '../lib/weather'
import { solunarDay, type Solunar } from '../lib/solunar'
import { bestWindows, dayRating, ratingLabel, scoreDay, type HourScore } from '../lib/bite'
import { formatClock, formatHour, weekday } from '../lib/format'
import { formatDistance, formatPressure, formatTemp, formatWind } from '../lib/units'
import { formatCoords, type LngLat } from '../lib/geo'
import { useGauges } from '../lib/store'
import { nearestGauges } from '../lib/usgs'
import { MINUTE } from '../lib/cache'

type Place = LngLat & { label: string }

export function ForecastScreen() {
  const s = useSettings()
  const toast = useToast()
  const [params] = useSearchParams()
  const gauges = useGauges()
  const [place, setPlace] = useState<Place>()
  const [forecast, setForecast] = useState<Forecast>()
  const [wxState, setWxState] = useState<'idle' | 'loading' | 'ok' | 'stale' | 'error'>('idle')
  const [dayIdx, setDayIdx] = useState(0)
  const [hourSel, setHourSel] = useState<number>()
  const [locating, setLocating] = useState(false)

  // Where: an explicit place from a link, else the last GPS fix, else the map's centre.
  const qLat = Number(params.get('lat'))
  const qLon = Number(params.get('lon'))
  const qName = params.get('name')
  useEffect(() => {
    if (params.get('lat') && Number.isFinite(qLat) && Number.isFinite(qLon)) setPlace({ lat: qLat, lon: qLon, label: qName ?? formatCoords({ lat: qLat, lon: qLon }) })
    else if (s.lastFix && Date.now() - s.lastFix.at < 12 * 60 * MINUTE) setPlace((p) => p ?? { ...s.lastFix!, label: 'Your location' })
    else if (s.lastView && s.lastView.zoom >= 7) setPlace((p) => p ?? { ...s.lastView!, label: 'Map centre' })
  }, [qLat, qLon, qName, params, s.lastFix, s.lastView])

  useEffect(() => {
    if (!place) return
    let live = true
    setWxState('loading')
    loadForecast(place.lat, place.lon)
      .then((r) => {
        if (!live) return
        setForecast(r.data)
        setWxState(r.stale ? 'stale' : 'ok')
      })
      .catch(() => live && (setForecast(undefined), setWxState('error')))
    return () => {
      live = false
    }
  }, [place])

  const locate = () => {
    if (!navigator.geolocation) return toast('This device has no location service', 'error')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        const p = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        void updateSettings({ lastFix: { ...p, at: Date.now() } })
        setPlace({ ...p, label: 'Your location' })
      },
      (err) => {
        setLocating(false)
        toast(err.code === err.PERMISSION_DENIED ? 'Location permission is off for this site' : 'Could not get your location', 'error')
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 5 * 60_000 },
    )
  }

  const water = useMemo(() => {
    if (!place) return undefined
    return nearestGauges(place, gauges.filter((g) => g.tempC != null), 25, 1)[0]
  }, [place, gauges])

  const days = useMemo(() => buildDays(place, forecast, water?.gauge.tempC), [place, forecast, water])
  const day = days[Math.min(dayIdx, days.length - 1)]
  const offset = forecast?.utcOffsetSec

  if (!place) {
    return (
      <Page title="Forecast">
        <p className="text-muted">Bite windows, weather, sun and moon for where you fish.</p>
        <Button variant="primary" busy={locating} onClick={locate}>
          <LocateFixed size={18} /> Use my location
        </Button>
        <p className="text-sm text-muted">Or open a stream or gauge on the map and tap Forecast.</p>
      </Page>
    )
  }

  const selected = hourSel != null ? day?.hours[hourSel] : undefined
  return (
    <Page
      title="Forecast"
      action={
        <Button size="sm" variant="ghost" busy={locating} onClick={locate} aria-label="Forecast for my location">
          <LocateFixed size={18} />
        </Button>
      }
    >
      <p className="text-sm text-muted">
        <span className="font-semibold text-text">{place.label}</span>
        {forecast ? ` · times in ${forecast.timezone.replace(/_/g, ' ')}` : ''}
      </p>
      {wxState === 'loading' && !forecast ? <div className="skeleton h-16" aria-label="Loading forecast" /> : null}
      {wxState === 'error' ? <p className="rounded-md bg-surface p-3 text-sm">Weather is unavailable (offline?). Scores below use sun and moon only.</p> : null}
      {wxState === 'stale' ? <p className="rounded-md bg-surface p-3 text-sm">Offline: showing the last saved forecast.</p> : null}

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Days">
        {days.map((d, i) => {
          const r = ratingLabel(d.rating)
          return (
            <button
              key={d.date}
              role="tab"
              aria-selected={i === dayIdx}
              onClick={() => {
                setDayIdx(i)
                setHourSel(undefined)
              }}
              className={`flex min-w-16 flex-col items-center gap-0.5 rounded-md border px-3 py-2 ${i === dayIdx ? 'border-accent bg-raised' : 'border-border bg-surface'}`}
            >
              <span className="text-xs font-semibold text-muted">{i === 0 ? 'Today' : weekday(d.date)}</span>
              <span className={`text-lg font-bold ${toneClass(r.tone)}`}>{d.rating}</span>
              <span className="text-[11px] text-muted">{d.wx ? weatherLabel(d.wx.code) : r.label}</span>
            </button>
          )
        })}
      </div>

      {day ? (
        <>
          <section className="flex items-end justify-between gap-3" aria-label="Day rating">
            <div>
              <p className={`text-4xl font-bold ${toneClass(ratingLabel(day.rating).tone)}`}>
                {day.rating} <span className="text-xl">{ratingLabel(day.rating).label}</span>
              </p>
              <p className="text-sm text-muted">
                Best:{' '}
                {day.windows.length
                  ? day.windows
                      .slice(0, 2)
                      .map((w) => `${formatClock(w.start, offset)}–${formatClock(w.end, offset)}`)
                      .join(', ')
                  : 'no standout window'}
              </p>
            </div>
          </section>

          <HourBars hours={day.hours} offset={offset} selected={hourSel} onSelect={setHourSel} />
          {selected ? (
            <section className="rounded-md bg-surface p-3 text-sm" aria-live="polite">
              <p className="mb-1 font-semibold">
                {formatHour(selected.t, offset)}: {selected.score}
              </p>
              <ul className="flex flex-col gap-0.5">
                {selected.factors.map((f) => (
                  <li key={f.label} className="flex justify-between gap-3">
                    <span>{f.label}</span>
                    <span className={f.points >= 0 ? 'text-success' : 'text-danger'}>{f.points >= 0 ? `+${f.points}` : f.points}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <p className="text-xs text-muted">Tap an hour to see what raised or lowered its score.</p>
          )}

          {day.wx ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatTile label="High / low" value={`${formatTemp(day.wx.maxC, s.units)} / ${formatTemp(day.wx.minC, s.units)}`} hint={weatherLabel(day.wx.code)} />
              <StatTile label="Rain" value={Number.isFinite(day.wx.precipProb) ? `${day.wx.precipProb}%` : '—'} hint="chance" />
              <StatTile label="Wind" value={formatWind(day.wx.windMaxKmh, s.units)} hint="max sustained" />
              <StatTile label="Pressure" value={formatPressure(day.pressure?.value, s.units)} hint={day.pressure ? `${day.pressure.trend}, 3 h` : undefined} />
            </div>
          ) : null}

          <SunMoon sol={day.sol} offset={offset} />

          {water ? (
            <p className="text-sm">
              Water temp {formatTemp(water.gauge.tempC, s.units)} from gauge {water.gauge.id}, {formatDistance(water.km, s.units)} away, is part of the score.
            </p>
          ) : (
            <p className="text-xs text-muted">Open the map near this spot to load gauges; a nearby water-temperature reading makes the score trout-aware.</p>
          )}

          <details className="rounded-md bg-surface p-3 text-sm">
            <summary className="cursor-pointer font-semibold">How the score works</summary>
            <p className="mt-2">
              It's a rule of thumb, not a prediction. Each hour starts at 25 and gains points for solunar periods (moon overhead or underfoot, moonrise and moonset), low light around sunrise
              and sunset, days near a new or full moon, falling pressure and cloud cover. Storms, heavy rain, strong gusts and a sharp pressure rise take points away. When a nearby gauge
              reports water temperature, water that's too cold or too warm for trout scales the score down. A day's number is the average of its six best hours.
            </p>
          </details>
        </>
      ) : null}
    </Page>
  )
}

type DayView = {
  date: string
  start: number
  sol: Solunar
  hours: HourScore[]
  rating: number
  windows: { start: number; end: number }[]
  wx?: Forecast['days'][number]
  pressure?: { value: number; trend: string }
}

function buildDays(place: LngLat | undefined, f: Forecast | undefined, waterTempC?: number): DayView[] {
  if (!place) return []
  const now = Date.now()
  const starts: { date: string; start: number; wx?: Forecast['days'][number] }[] = f
    ? f.days.filter((d) => d.start + 24 * 60 * MINUTE > now).map((d) => ({ date: d.date, start: d.start, wx: d }))
    : Array.from({ length: 7 }, (_, i) => {
        const d = new Date()
        d.setHours(0, 0, 0, 0)
        d.setDate(d.getDate() + i)
        return { date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, start: d.getTime() }
      })
  return starts.map(({ date, start, wx }) => {
    const sol = solunarDay(start, place.lat, place.lon)
    const hours = scoreDay(start, sol, f, waterTempC)
    const at = start <= now && now < start + 24 * 60 * MINUTE ? now : start + 12 * 60 * MINUTE
    const p = f ? pressureTrend(f, at) : undefined
    const h = f?.hours.find((x) => Math.abs(x.t - at) <= 30 * MINUTE)
    return {
      date,
      start,
      sol,
      hours,
      rating: dayRating(hours),
      windows: bestWindows(hours),
      wx,
      pressure: p && h ? { value: h.pressure, trend: p.trend } : undefined,
    }
  })
}

function HourBars({ hours, offset, selected, onSelect }: { hours: HourScore[]; offset?: number; selected?: number; onSelect: (i: number) => void }) {
  const now = Date.now()
  return (
    <div className="flex flex-col gap-1">
      <div className="flex h-28 items-end gap-[2px]" role="group" aria-label="Hourly bite score">
        {hours.map((h, i) => {
          const isNow = now >= h.t && now < h.t + 60 * MINUTE
          return (
            <button
              key={h.t}
              type="button"
              onClick={() => onSelect(i)}
              aria-label={`${formatHour(h.t, offset)}, score ${h.score}${h.window ? `, ${h.window} solunar period` : ''}`}
              aria-pressed={selected === i}
              className={`relative flex h-full flex-1 items-end rounded-t-sm ${h.window === 'major' ? 'bg-accent/10' : h.window === 'minor' ? 'bg-accent/5' : ''} ${
                selected === i ? 'outline-2 outline-focus' : ''
              }`}
            >
              <span
                className={`w-full rounded-t-sm ${h.score >= 55 ? 'bg-accent' : 'bg-border-input/60'} ${isNow ? 'ring-2 ring-text' : ''}`}
                style={{ height: `${Math.max(4, h.score)}%` }}
              />
            </button>
          )
        })}
      </div>
      <div className="flex justify-between text-[11px] text-muted" aria-hidden>
        {[0, 6, 12, 18, 23].map((i) => (
          <span key={i}>{hours[i] ? formatHour(hours[i].t, offset) : ''}</span>
        ))}
      </div>
      <p className="text-[11px] text-muted">Shaded columns are solunar periods.</p>
    </div>
  )
}

function SunMoon({ sol, offset }: { sol: Solunar; offset?: number }) {
  const rows: [string, number | undefined][] = [
    ['Sunrise', sol.sunrise],
    ['Sunset', sol.sunset],
    ['Moonrise', sol.moonrise],
    ['Moonset', sol.moonset],
    ['Moon overhead', sol.transit],
    ['Moon underfoot', sol.underfoot],
  ]
  return (
    <section aria-label="Sun and moon" className="rounded-md bg-surface p-3">
      <h2 className="mb-2 text-sm font-semibold">
        Sun and moon · {sol.phaseName}, {Math.round(sol.illumination * 100)}% lit
      </h2>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2">
            <dt className="text-muted">{k}</dt>
            <dd>{v != null ? formatClock(v, offset) : '—'}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

const toneClass = (t: 'bad' | 'neutral' | 'good' | 'great') => (t === 'great' ? 'text-accent' : t === 'good' ? 'text-success' : t === 'bad' ? 'text-muted' : 'text-text')
