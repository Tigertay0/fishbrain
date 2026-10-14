import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import SunCalc from 'suncalc'
import { ChevronDown, CloudSun, LocateFixed, MapPin, TriangleAlert } from 'lucide-react'
import { Button, inputClass, Page, Segmented } from '../components/ui'
import { RigDiagram } from '../components/RigDiagram'
import { useToast } from '../components/Toast'
import { updateSettings, useSettings } from '../lib/settings'
import { estimateWaterTempC, plan, type Clarity, type Presence, type Recommendation, type WaterKind } from '../lib/advisor'
import { loadAirHistory, lookupWater, searchRadiusKm, type AirHistory, type WaterBody } from '../lib/waters'
import { inFrance, loadFrenchSurveys, loadSpeciesNear, mergePresence, type Sources } from '../lib/publicdata'
import { loadStocking, STOCKING_COVERAGE } from '../lib/stocking'
import { loadForecast, pressureTrend, hourAt, type Forecast } from '../lib/weather'
import { solunarDay } from '../lib/solunar'
import { bestWindows, scoreDay } from '../lib/bite'
import { nearestGauges } from '../lib/usgs'
import { useGauges } from '../lib/store'
import { formatClock, formatDate } from '../lib/format'
import { cToF, formatTemp, fToC } from '../lib/units'
import { formatCoords } from '../lib/geo'
import { MINUTE } from '../lib/cache'
import type { Method } from '../lib/rigs'

type Place = { lat: number; lon: number }

const TYPE_OPTIONS: { value: WaterKind; label: string }[] = [
  { value: 'stream', label: 'Stream' },
  { value: 'river', label: 'River' },
  { value: 'lake', label: 'Lake' },
  { value: 'pond', label: 'Pond' },
  { value: 'reservoir', label: 'Reservoir' },
]

export function PlanScreen() {
  const s = useSettings()
  const toast = useToast()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const gauges = useGauges()
  const tempId = useId()

  const [place, setPlace] = useState<Place>()
  const [water, setWater] = useState<WaterBody>()
  const [waterState, setWaterState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [typeOverride, setTypeOverride] = useState<WaterKind>()
  const [sources, setSources] = useState<Sources>({})
  const [sourcesState, setSourcesState] = useState<'loading' | 'ok' | 'partial'>('loading')
  const [air, setAir] = useState<AirHistory>()
  const [forecast, setForecast] = useState<Forecast>()
  const [manualTemp, setManualTemp] = useState('')
  const [clarity, setClarity] = useState<Clarity>()
  const [method, setMethod] = useState<Method | 'any'>('any')
  const [locating, setLocating] = useState(false)

  const qLat = Number(params.get('lat'))
  const qLon = Number(params.get('lon'))
  const qName = params.get('name') ?? undefined
  const qType = params.get('type') as WaterKind | null
  const target = params.get('target')

  // Where: a place from the link, else a recent GPS fix.
  useEffect(() => {
    if (params.get('lat') && Number.isFinite(qLat) && Number.isFinite(qLon)) setPlace({ lat: qLat, lon: qLon })
    else if (s.lastFix && Date.now() - s.lastFix.at < 2 * 60 * MINUTE) setPlace((p) => p ?? { lat: s.lastFix!.lat, lon: s.lastFix!.lon })
  }, [params, qLat, qLon, s.lastFix])

  // What water is this?
  useEffect(() => {
    if (!place) return
    setTypeOverride(undefined)
    if (qType && qName) {
      setWater({ name: qName, type: qType })
      setWaterState('ok')
      return
    }
    let live = true
    setWaterState('loading')
    lookupWater(place.lat, place.lon)
      .then((r) => {
        if (!live) return
        setWater({ ...r.data, name: r.data.name ?? qName, type: qType ?? r.data.type })
        setWaterState('ok')
      })
      .catch(() => {
        if (!live) return
        setWater({ name: qName, type: qType ?? 'unknown' })
        setWaterState('error')
      })
    return () => {
      live = false
    }
  }, [place, qName, qType])

  const type: WaterKind = typeOverride ?? water?.type ?? 'unknown'

  // Public data: who lives here, and has anyone stocked it?
  useEffect(() => {
    if (!place || !water) return
    let live = true
    const radius = searchRadiusKm({ ...water, type })
    setSourcesState('loading')
    const tasks = [
      loadSpeciesNear(place.lat, place.lon, radius).then((r) => live && setSources((x) => ({ ...x, inat: r.data }))),
      inFrance(place.lat, place.lon)
        ? loadFrenchSurveys(place.lat, place.lon, Math.max(2, radius)).then((r) => live && setSources((x) => ({ ...x, surveys: r.data })))
        : Promise.resolve(),
      loadStocking(place.lat, place.lon, Math.max(2, radius), water.name).then((r) => live && setSources((x) => ({ ...x, stocking: r ?? null }))),
    ]
    void Promise.allSettled(tasks).then((rs) => live && setSourcesState(rs.some((r) => r.status === 'rejected') ? 'partial' : 'ok'))
    return () => {
      live = false
    }
  }, [place, water, type])

  // Conditions: air history (for a water-temp estimate) and the forecast (wind, pressure, light).
  useEffect(() => {
    if (!place) return
    let live = true
    loadAirHistory(place.lat, place.lon)
      .then((r) => live && setAir(r.data))
      .catch(() => {})
    loadForecast(place.lat, place.lon)
      .then((r) => live && setForecast(r.data))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [place])

  // Water temperature: your reading > a gauge on this river > an estimate from the air.
  const gauge = useMemo(() => {
    if (!place || !(type === 'stream' || type === 'river')) return undefined
    return nearestGauges(place, gauges.filter((g) => g.tempC != null), 5, 1)[0]
  }, [place, gauges, type])
  const manualC = useMemo(() => {
    const n = Number(manualTemp.replace(',', '.'))
    if (!manualTemp.trim() || !Number.isFinite(n)) return undefined
    return s.units === 'imperial' ? fToC(n) : n
  }, [manualTemp, s.units])
  const temp: { c?: number; source: string } =
    manualC != null
      ? { c: manualC, source: 'your reading' }
      : gauge?.gauge.tempC != null
        ? { c: gauge.gauge.tempC, source: `USGS gauge ${gauge.gauge.id}` }
        : air && Number.isFinite(air.mean7C)
          ? { c: estimateWaterTempC(type, air.mean7C, air.mean14C), source: 'estimate from 2 weeks of air temperature' }
          : { source: 'unknown' }

  const clarityGuess: Clarity = (type === 'stream' || type === 'river') && (air?.rain48hMm ?? 0) >= 12 ? 'stained' : 'clear'
  const clarityNow = clarity ?? clarityGuess

  const presence = useMemo(() => mergePresence(sources), [sources])

  const now = Date.now()
  const conditions = useMemo(() => {
    if (!place) return {}
    const sun = SunCalc.getTimes(new Date(), place.lat, place.lon)
    const near = (d: Date) => Number.isFinite(d.getTime()) && Math.abs(now - d.getTime()) <= 75 * MINUTE
    const h = forecast ? hourAt(forecast, now) : undefined
    return { lowLight: near(sun.sunrise) || near(sun.sunset), windKmh: h?.windKmh, pressureTrend: forecast ? pressureTrend(forecast, now)?.trend : undefined }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place, forecast])

  const result = useMemo(() => {
    if (!place || !water) return undefined
    return plan({
      water: { type, name: water.name },
      lat: place.lat,
      lon: place.lon,
      date: new Date(),
      waterTempC: temp.c,
      warming: air?.warming,
      clarity: clarityNow,
      method,
      presence,
      ...conditions,
    })
  }, [place, water, type, temp.c, air?.warming, clarityNow, method, presence, conditions])

  const recs = useMemo(() => {
    if (!result) return []
    if (!target) return result.recs
    const i = result.recs.findIndex((r) => r.profile.id === target)
    return i > 0 ? [result.recs[i], ...result.recs.filter((_, j) => j !== i)] : result.recs
  }, [result, target])

  const [locateFailed, setLocateFailed] = useState<string>()
  const locate = () => {
    if (!navigator.geolocation) {
      setLocateFailed('This device has no location service.')
      return
    }
    setLocating(true)
    setLocateFailed(undefined)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        const p = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        void updateSettings({ lastFix: { ...p, at: Date.now() } })
        nav('/plan', { replace: true })
        setPlace(p)
      },
      (err) => {
        setLocating(false)
        const msg = err.code === err.PERMISSION_DENIED ? 'Location is turned off for this site.' : 'Couldn’t get a GPS fix.'
        setLocateFailed(msg)
        if (place) toast(msg, 'error')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60_000 },
    )
  }

  // Opening the tab with no place yet: find the angler straight away, like logging a catch does.
  const autoLocated = useRef(false)
  useEffect(() => {
    if (autoLocated.current || params.get('lat')) return
    if (s.lastFix && Date.now() - s.lastFix.at < 2 * 60 * MINUTE) return
    autoLocated.current = true
    locate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!place) {
    return (
      <Page title="What to use">
        {locating || !locateFailed ? (
          <div className="flex flex-col gap-3" aria-live="polite">
            <p className="font-semibold">Finding the water you’re at…</p>
            <div className="skeleton h-8 w-2/3" />
            <div className="skeleton h-40" />
          </div>
        ) : (
          <>
            <p>{locateFailed} Pick the water on the map instead, or try again.</p>
            <Button variant="primary" onClick={() => nav('/')}>
              <MapPin size={18} /> Pick water on the map
            </Button>
            <Button busy={locating} onClick={locate}>
              <LocateFixed size={18} /> Try my location again
            </Button>
          </>
        )}
      </Page>
    )
  }

  const methodLabel = { any: 'any method', bait: 'bait', lure: 'lures', fly: 'fly' }[method]
  const summary = [
    type === 'unknown' ? null : type.charAt(0).toUpperCase() + type.slice(1),
    temp.c != null ? `${formatTemp(temp.c, s.units)} water${temp.source.startsWith('estimate') ? ' (estimate)' : temp.source === 'your reading' ? ' (your reading)' : ' (gauge)'}` : null,
    clarityNow.charAt(0).toUpperCase() + clarityNow.slice(1),
    air ? (air.warming ? 'Warming' : 'Cooling') : null,
    methodLabel,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Page
      title="What to use"
      action={
        <Button size="sm" variant="ghost" busy={locating} onClick={locate} aria-label="Plan for my location">
          <LocateFixed size={18} />
        </Button>
      }
    >
      <section aria-label="Water" className="flex flex-col gap-1">
        {waterState === 'loading' ? (
          <div className="skeleton h-8 w-2/3" aria-label="Finding the water" />
        ) : (
          <h2 className="text-xl font-bold">{water?.name ?? (type === 'unknown' ? 'Water near you' : `Unnamed ${type}`)}</h2>
        )}
        <p className="text-sm" data-testid="conditions-summary">
          {summary}
        </p>
        {waterState === 'error' ? <p className="text-xs text-muted">Couldn’t look the water up (offline?). Set its type under Adjust.</p> : null}
      </section>

      {type === 'coast' ? null : (
        <details className="group rounded-md border border-border" open={waterState === 'error' || type === 'unknown'}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-semibold">
            <span>Adjust: water, temperature, clarity, method</span>
            <ChevronDown size={18} className="shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="flex flex-col gap-3 border-t border-border p-3">
            <Segmented<WaterKind> label="Type of water" value={type} onChange={setTypeOverride} options={TYPE_OPTIONS} />
            <div className="flex flex-col gap-1">
              <label htmlFor={tempId} className="text-sm font-semibold">
                Water temp from a thermometer ({s.units === 'imperial' ? '°F' : '°C'})
              </label>
              <input
                id={tempId}
                inputMode="decimal"
                className={inputClass}
                value={manualTemp}
                onChange={(e) => setManualTemp(e.target.value)}
                placeholder={temp.c != null ? `about ${Math.round(s.units === 'imperial' ? cToF(temp.c) : temp.c)}` : ''}
                aria-describedby={`${tempId}-hint`}
              />
              <p id={`${tempId}-hint`} className="text-xs text-muted">
                Now using: {temp.source}
                {air ? `. Rain in the last 48 h: ${air.rain48hMm} mm.` : '.'}
              </p>
            </div>
            <Segmented<Clarity>
              label={`Water clarity${clarity ? '' : ` (guess: ${clarityGuess})`}`}
              value={clarityNow}
              onChange={setClarity}
              options={[
                { value: 'clear', label: 'Clear' },
                { value: 'stained', label: 'Stained' },
                { value: 'muddy', label: 'Muddy' },
              ]}
            />
            <Segmented<Method | 'any'>
              label="How do you want to fish?"
              value={method}
              onChange={setMethod}
              options={[
                { value: 'any', label: 'Any' },
                { value: 'bait', label: 'Bait' },
                { value: 'lure', label: 'Lures' },
                { value: 'fly', label: 'Fly' },
              ]}
            />
            <p className="text-xs text-muted">{formatCoords(place)}</p>
          </div>
        </details>
      )}

      {result?.unsupported ? <p className="rounded-md bg-surface p-3">{result.unsupported}</p> : null}

      {result && !result.unsupported ? (
        <section aria-label="Best bets" className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Best bets here</h2>
          {sourcesState === 'loading' ? <div className="skeleton h-40" aria-label="Checking which fish live here" /> : null}
          {result.fromDefaults && sourcesState !== 'loading' ? (
            <p className="rounded-md bg-surface p-3 text-sm">No public fish records near here yet, so these are the fish that usually live in a {type === 'unknown' ? 'water' : type} like this.</p>
          ) : null}
          {/* Wait for the records, so the list doesn't show a guess and then reshuffle. */}
          {sourcesState === 'loading'
            ? null
            : recs.map((r, i) => <RecCard key={r.profile.id} rec={r} open={i === 0} place={place} forecast={forecast} waterTempC={temp.c} />)}
        </section>
      ) : null}

      {result?.notes.length ? (
        <ul className="flex flex-col gap-1 text-sm" aria-label="Notes">
          {result.notes.map((n) => (
            <li key={n} className="flex gap-2">
              <span aria-hidden>•</span>
              {n}
            </li>
          ))}
        </ul>
      ) : null}

      <WhereSection place={place} sources={sources} state={sourcesState} other={result?.otherFish ?? []} forage={result?.forage ?? []} />

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => nav(`/forecast?lat=${place.lat}&lon=${place.lon}${water?.name ? `&name=${encodeURIComponent(water.name)}` : ''}`)}>
          <CloudSun size={18} /> 7-day forecast
        </Button>
        <Button
          onClick={() => {
            void updateSettings({ layers: { ...s.layers, sightings: true } })
            nav(`/?focus=${place.lat},${place.lon},13`)
          }}
        >
          <MapPin size={18} /> Show fish records on the map
        </Button>
      </div>
      <p className="text-xs text-muted">
        Advice is general guidance from water type, season, temperature and public records. Rules on bait, hooks, seasons and limits vary: check your local regulations.
      </p>
    </Page>
  )
}

function RecCard({ rec, open, place, forecast, waterTempC }: { rec: Recommendation; open: boolean; place: Place; forecast?: Forecast; waterTempC?: number }) {
  const r = rec
  const [rig, ...otherRigs] = r.rigs
  const offset = forecast?.utcOffsetSec
  const windows = useMemo(() => {
    const now = Date.now()
    const day = forecast?.days.find((d) => d.start <= now && now < d.start + 24 * 60 * MINUTE)
    const start = day?.start ?? new Date(new Date().setHours(0, 0, 0, 0)).getTime()
    const sol = solunarDay(start, place.lat, place.lon)
    const hours = scoreDay(start, sol, forecast, waterTempC, { name: r.profile.name.toLowerCase(), active: r.profile.tempF.active, best: r.profile.tempF.best })
    return bestWindows(hours, 50)
      .filter((w) => w.end > now)
      .slice(0, 2)
  }, [forecast, place, waterTempC, r.profile])

  const tone = r.activity === 'high' ? 'text-success' : r.activity === 'medium' ? 'text-text' : 'text-muted'
  return (
    <details open={open} className="group rounded-md bg-raised shadow-card">
      <summary className="flex cursor-pointer list-none items-start gap-3 p-4">
        <span className="flex flex-1 flex-col">
          <span className="text-lg font-semibold">{r.profile.name}</span>
          <span className="text-sm">
            <span className={`font-semibold ${tone}`}>{r.activity === 'high' ? 'Biting well' : r.activity === 'medium' ? 'Catchable' : 'Slow'}</span>
            <span className="text-muted"> · {r.phaseLabel}</span>
          </span>
          <span className="text-xs text-muted">{r.evidence}</span>
        </span>
        <ChevronDown size={20} className="mt-1 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="flex flex-col gap-3 border-t border-border p-4 text-sm">
        {r.warnings.length ? (
          <ul className="flex flex-col gap-1 rounded-md bg-surface p-3">
            {r.warnings.map((w) => (
              <li key={w} className="flex gap-2">
                <TriangleAlert size={16} className="mt-0.5 shrink-0 text-warning" aria-hidden />
                {w}
              </li>
            ))}
          </ul>
        ) : null}
        <Row label="Where">{r.where}</Row>
        <Row label="How">{r.how}</Row>
        {windows.length ? (
          <Row label="Best times today">{windows.map((w) => `${formatClock(w.start, offset)}–${formatClock(w.end, offset)}`).join(', ')}</Row>
        ) : null}
        {rig ? (
          <div className="flex flex-col gap-1">
            <span className="font-semibold">Rig: {rig.name}</span>
            <span className="text-muted">{rig.when}</span>
            <div className="rounded-md bg-surface p-2">
              <RigDiagram rig={rig} />
            </div>
            <Link to={`/rigs/${rig.id}`} className="font-semibold text-accent underline">
              How to tie it
            </Link>
            {otherRigs.length ? (
              <span>
                Also works:{' '}
                {otherRigs.map((o, i) => (
                  <span key={o.id}>
                    {i ? ', ' : ''}
                    <Link to={`/rigs/${o.id}`} className="text-accent underline">
                      {o.name}
                    </Link>
                  </span>
                ))}
              </span>
            ) : null}
          </div>
        ) : null}
        {r.baits.length ? <Row label="Bait">{r.baits.join(', ')}</Row> : null}
        {r.lures.length ? <Row label="Lures">{r.lures.join(', ')}</Row> : null}
        {r.flies.length ? <Row label="Flies">{r.flies.join(', ')}</Row> : null}
        {r.lures.length || r.flies.length ? <Row label="Colours">{r.colors}</Row> : null}
        <Row label="Tackle">
          {r.tackle.line}; {r.tackle.hooks}
        </Row>
        <Row label="Why">
          <ul className="flex list-disc flex-col gap-0.5 pl-4">
            {r.why.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Row>
      </div>
    </details>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="font-semibold">{label}: </span>
      {children}
    </div>
  )
}

function WhereSection({ place, sources, state, other, forage }: { place: Place; sources: Sources; state: string; other: Presence[]; forage: string[] }) {
  const inat = sources.inat ?? []
  const surveys = sources.surveys ?? []
  const st = sources.stocking
  return (
    <section aria-label="Public fishing data" className="flex flex-col gap-3 rounded-md bg-surface p-4 text-sm">
      <h2 className="text-base font-bold">What public records say</h2>
      {state === 'loading' && !inat.length ? <div className="skeleton h-12" /> : null}
      {inat.length ? (
        <div>
          <p className="font-semibold">Fish recorded nearby (iNaturalist)</p>
          <p>{inat.slice(0, 10).map((p) => `${p.common} ${p.count}`).join(' · ')}</p>
        </div>
      ) : state !== 'loading' ? (
        <p>No iNaturalist fish records near here in the last 10 years.</p>
      ) : null}
      {surveys.length ? (
        <div>
          <p className="font-semibold">Official surveys (OFB electrofishing, via Hub’Eau)</p>
          <p>{surveys.slice(0, 10).map((p) => `${p.common} ${p.count}`).join(' · ')}</p>
        </div>
      ) : null}
      {st === null ? (
        <p className="text-muted">Stocking reports are built in for {STOCKING_COVERAGE.join(', ')}. Your state may publish them on its fish and wildlife site.</p>
      ) : st ? (
        st.events.length ? (
          <div>
            <p className="font-semibold">Stocked recently ({st.source})</p>
            <ul className="flex flex-col gap-0.5">
              {st.events.slice(0, 6).map((e, i) => (
                <li key={i}>
                  {e.date ? formatDate(e.date.length === 7 ? `${e.date}-01` : e.date) : ''}: {e.count ? `${e.count.toLocaleString()} ` : ''}
                  {e.species}
                  {e.sizeIn ? ` (${e.sizeIn} in)` : ''} at {e.water}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p>No {st.state} stocking records{st.by === 'name' ? ' matching this water’s name' : ' near here'} in the last 3 years.</p>
        )
      ) : null}
      {forage.length ? <p>Baitfish recorded here: {forage.join(', ')}. Match them in size and colour.</p> : null}
      {other.length ? <p className="text-muted">Also recorded: {other.slice(0, 8).map((o) => o.common).join(', ')}.</p> : null}
      <p className="text-xs text-muted">
        Records show where fish have been seen, not public access. Sources: iNaturalist (research grade, licensed per observer)
        {surveys.length ? ", OFB via Hub'Eau" : ''}
        {st?.events.length ? `, ${st.source}` : ''}. Coordinates {place.lat.toFixed(3)}, {place.lon.toFixed(3)}.
      </p>
    </section>
  )
}
