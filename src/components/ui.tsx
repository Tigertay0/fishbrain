import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Navigation, X } from 'lucide-react'
import { directionsUrl, type LngLat } from '../lib/geo'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-strong',
  secondary: 'bg-raised text-text border border-border hover:bg-surface',
  ghost: 'text-text hover:bg-surface',
  danger: 'bg-raised text-danger border border-border hover:bg-surface',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  busy,
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md'; busy?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      aria-busy={busy || undefined}
      disabled={rest.disabled || busy}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        size === 'sm' ? 'min-h-9 px-3' : 'min-h-11 px-4'
      } ${VARIANT[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function IconButton({
  label,
  className = '',
  floating,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; floating?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={`inline-flex size-11 items-center justify-center rounded-full text-text ${
        floating ? 'bg-raised shadow-pop' : 'hover:bg-surface'
      } aria-pressed:text-accent ${className}`}
    >
      {children}
    </button>
  )
}

export function Field({
  label,
  hint,
  error,
  children,
  id,
}: {
  label: string
  hint?: ReactNode
  error?: string
  id: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export const inputClass =
  'min-h-11 w-full rounded-md border border-border-input bg-raised px-3 text-text placeholder:text-muted aria-invalid:border-danger'

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string; hint?: string }[]
  onChange: (v: T) => void
}) {
  const name = useId()
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 text-sm font-semibold">{label}</legend>
      <div role="radiogroup" className="flex flex-wrap gap-1 rounded-md bg-surface p-1">
        {options.map((o) => (
          <label
            key={o.value}
            className={`flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-sm px-3 text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus ${
              value === o.value ? 'bg-raised text-accent shadow-card' : 'text-muted'
            }`}
            title={o.hint}
          >
            <input
              type="radio"
              className="sr-only"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-h-9 shrink-0 rounded-full border px-3 text-sm font-semibold ${
        on ? 'border-accent bg-accent text-on-accent' : 'border-border bg-raised text-text'
      }`}
    >
      {children}
    </button>
  )
}

export type Tone = 'neutral' | 'good' | 'caution' | 'bad' | 'cold'
const TONE: Record<Tone, string> = {
  neutral: 'text-text',
  good: 'text-success',
  caution: 'text-warning',
  bad: 'text-danger',
  cold: 'text-cold',
}

export function StatTile({ label, value, hint, tone = 'neutral', loading }: { label: string; value: ReactNode; hint?: ReactNode; tone?: Tone; loading?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-md bg-surface p-3">
      <span className="text-xs font-medium text-muted">{label}</span>
      {loading ? <span className="skeleton h-7 w-20" role="status" aria-label="Loading" /> : <span className={`text-lg font-semibold ${TONE[tone]}`}>{value}</span>}
      {hint && !loading ? <span className="text-xs text-muted">{hint}</span> : null}
    </div>
  )
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="text-muted">{icon}</div>
      <p className="text-base font-semibold">{title}</p>
      {children}
    </div>
  )
}

export function Sheet({ title, onClose, children, actions }: { title: ReactNode; onClose: () => void; children: ReactNode; actions?: ReactNode }) {
  const headingId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  // Callers pass a fresh onClose on every render; depending on it would re-run the
  // effect and pull focus back to the heading mid-typing whenever the map re-renders.
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    headingRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return (
    <section
      aria-labelledby={headingId}
      className="bottom-tabbar absolute inset-x-0 z-20 mx-auto flex max-h-[70dvh] max-w-xl flex-col rounded-t-lg bg-raised shadow-pop"
    >
      <div className="flex items-start gap-2 border-b border-border px-4 pt-3 pb-2">
        <h2 id={headingId} ref={headingRef} tabIndex={-1} className="min-w-0 flex-1 pt-2 text-lg font-semibold outline-none">
          {title}
        </h2>
        <IconButton label="Close" onClick={onClose}>
          <X size={20} />
        </IconButton>
      </div>
      <div className="overflow-y-auto px-4 py-3">{children}</div>
      {actions ? <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">{actions}</div> : null}
    </section>
  )
}

/** Hands a point to the phone's own maps app, for a sheet's action row. */
export function DirectionsLink({ point }: { point: LngLat }) {
  return (
    <a className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold text-accent" href={directionsUrl(point)} target="_blank" rel="noreferrer">
      <Navigation size={18} /> Directions
    </a>
  )
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <header className="pt-safe sticky top-0 z-10 border-b border-border bg-bg/95 backdrop-blur">
      <div className="mx-auto flex min-h-14 max-w-3xl items-center gap-2 px-4">
        <h1 className="flex-1 text-xl font-bold">{title}</h1>
        {action}
      </div>
    </header>
  )
}

export function Page({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="pb-tabbar h-full overflow-y-auto">
      <PageHeader title={title} action={action} />
      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-4">{children}</main>
    </div>
  )
}
