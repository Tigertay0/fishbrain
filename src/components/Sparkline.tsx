import type { Series } from '../lib/usgs'

/** A small line chart with min/max labels. `format` turns a raw value into display text. */
export function Sparkline({ series, format, label, color = 'var(--tl-water)' }: { series: Series; format: (v: number) => string; label: string; color?: string }) {
  if (series.length < 2) return <p className="text-sm text-muted">No {label.toLowerCase()} readings in the last 7 days.</p>
  const W = 320
  const H = 72
  const pad = 4
  const t0 = series[0].t
  const t1 = series[series.length - 1].t
  let min = Infinity
  let max = -Infinity
  for (const p of series) {
    if (p.v < min) min = p.v
    if (p.v > max) max = p.v
  }
  const span = max - min || 1
  const x = (t: number) => pad + ((t - t0) / (t1 - t0 || 1)) * (W - pad * 2)
  const y = (v: number) => H - pad - ((v - min) / span) * (H - pad * 2)
  // Thin the line to ~160 points; a phone can't show more anyway.
  const step = Math.max(1, Math.floor(series.length / 160))
  const pts = series.filter((_, i) => i % step === 0 || i === series.length - 1)
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join('')
  const last = series[series.length - 1]
  return (
    <figure className="flex flex-col gap-1">
      <figcaption className="flex justify-between text-xs text-muted">
        <span>{label}, 7 days</span>
        <span>
          low {format(min)} · high {format(max)}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-20 w-full" role="img" aria-label={`${label} over 7 days: low ${format(min)}, high ${format(max)}, latest ${format(last.v)}`}>
        <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <circle cx={x(last.t)} cy={y(last.v)} r="3.5" fill={color} />
      </svg>
    </figure>
  )
}
