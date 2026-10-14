import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDownRight, ArrowRight, ArrowUpRight, CloudSun, ExternalLink, Fish, Navigation, Sparkles } from 'lucide-react'
import { Button, Sheet, StatTile, type Tone } from '../components/ui'
import { Sparkline } from '../components/Sparkline'
import { useSettings } from '../lib/settings'
import { ago } from '../lib/format'
import { directionsUrl } from '../lib/geo'
import { cToF, formatFlow, formatStage, formatTemp } from '../lib/units'
import {
  loadGaugeHistory,
  loadGaugeName,
  STALE_MS,
  TEMP_BAND_TEXT,
  trend24h,
  troutTempBand,
  usgsPageUrl,
  type Gauge,
  type GaugeHistory,
  type TempBand,
  type Trend,
} from '../lib/usgs'

const BAND_TONE: Record<TempBand, Tone> = { cold: 'cold', cool: 'cold', prime: 'good', warm: 'caution', stress: 'bad' }

export function GaugeSheet({ gauge, onClose }: { gauge: Gauge; onClose: () => void }) {
  const { units, usgsApiKey } = useSettings()
  const nav = useNavigate()
  const [name, setName] = useState<string>()
  const [hist, setHist] = useState<GaugeHistory>()
  const [histState, setHistState] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    let live = true
    setName(undefined)
    setHistState('loading')
    loadGaugeName(gauge.id, usgsApiKey)
      .then((n) => live && setName(n))
      .catch(() => {})
    loadGaugeHistory(gauge.id, usgsApiKey)
      .then((r) => {
        if (!live) return
        setHist(r.data)
        setHistState('ok')
      })
      .catch(() => live && setHistState('error'))
    return () => {
      live = false
    }
  }, [gauge.id, usgsApiKey])

  const band = gauge.tempC != null ? troutTempBand(gauge.tempC) : undefined
  const flowTrend = hist ? trend24h(hist.flow) : undefined
  const old = gauge.observedAt && Date.now() - Date.parse(gauge.observedAt) > 6 * 60 * 60 * 1000
  const title = name ?? gauge.id

  return (
    <Sheet
      title={
        <span className="flex flex-col">
          <span>{title}</span>
          <span className="text-xs font-medium text-muted">
            USGS river gauge{gauge.observedAt ? ` · updated ${ago(gauge.observedAt)}` : ''}
          </span>
        </span>
      }
      onClose={onClose}
      actions={
        <>
          <Button
            variant="primary"
            onClick={() => nav(`/plan?lat=${gauge.lat}&lon=${gauge.lon}&type=river${name ? `&name=${encodeURIComponent(waterFromGaugeName(name))}` : ''}`)}
          >
            <Sparkles size={18} /> What to use here
          </Button>
          <Button onClick={() => nav(`/log?lat=${gauge.lat}&lon=${gauge.lon}${name ? `&water=${encodeURIComponent(waterFromGaugeName(name))}` : ''}`)}>
            <Fish size={18} /> Log a catch here
          </Button>
          <Button onClick={() => nav(`/forecast?lat=${gauge.lat}&lon=${gauge.lon}&name=${encodeURIComponent(title)}`)}>
            <CloudSun size={18} /> Forecast
          </Button>
          <a className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold text-accent" href={directionsUrl(gauge)} target="_blank" rel="noreferrer">
            <Navigation size={18} /> Directions
          </a>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {old ? <p className="rounded-md bg-surface px-3 py-2 text-sm text-warning">Latest reading is over 6 hours old. Check before you drive.</p> : null}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <StatTile
            label="Flow"
            value={
              <span className="inline-flex items-center gap-1">
                {formatFlow(gauge.flowCfs, units)}
                <TrendIcon t={flowTrend} />
              </span>
            }
            hint={flowTrend ? `${flowTrend} over 24 h` : gauge.flowCfs == null ? 'not measured here' : undefined}
          />
          <StatTile label="Water temp" value={formatTemp(gauge.tempC, units)} tone={band ? BAND_TONE[band] : 'neutral'} hint={band ? TEMP_BAND_TEXT[band].label : 'no temperature sensor'} />
          {gauge.stageFt != null ? <StatTile label="Gage height" value={formatStage(gauge.stageFt, units)} /> : null}
        </div>
        {band ? (
          <p className="text-sm">
            <span className="font-semibold">For trout: </span>
            {TEMP_BAND_TEXT[band].advice}
            {band === 'stress' && gauge.tempC != null ? ` (${Math.round(cToF(gauge.tempC))}°F is above the 68°F guideline.)` : ''}
          </p>
        ) : null}
        {histState === 'loading' ? <div className="skeleton h-24" role="status" aria-label="Loading 7-day history" /> : null}
        {histState === 'error' ? <p className="text-sm text-muted">History unavailable right now.</p> : null}
        {histState === 'ok' && hist ? (
          <>
            {hist.flow.length ? <Sparkline series={hist.flow} label="Flow" format={(v) => formatFlow(v, units)} /> : null}
            {hist.temp.length ? <Sparkline series={hist.temp} label="Water temp" format={(v) => formatTemp(v, units)} color="var(--tl-accent)" /> : null}
            {!hist.flow.length && !hist.temp.length && hist.stage.length ? <Sparkline series={hist.stage} label="Gage height" format={(v) => formatStage(v, units)} /> : null}
          </>
        ) : null}
        <a href={usgsPageUrl(gauge.id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-accent">
          Full record on USGS Water Data <ExternalLink size={14} />
        </a>
        <p className="text-xs text-muted">Provisional USGS data, subject to revision. Readings older than {Math.round(STALE_MS / 86400000)} days are hidden.</p>
      </div>
    </Sheet>
  )
}

function TrendIcon({ t }: { t?: Trend }) {
  if (t === 'rising') return <ArrowUpRight size={18} aria-label="rising" className="text-warning" />
  if (t === 'falling') return <ArrowDownRight size={18} aria-label="falling" className="text-cold" />
  if (t === 'steady') return <ArrowRight size={18} aria-label="steady" className="text-muted" />
  return null
}

/** "Clear Creek at Golden, CO" → "Clear Creek". */
export function waterFromGaugeName(name: string): string {
  return name.split(/\s+(?:at|near|nr|above|below|abv|blw)\s+/i)[0].replace(/,.*$/, '').trim()
}
