export function formatDateTime(iso: string | number): string {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function formatDate(iso: string | number): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Clock time at a place, given its UTC offset (so a forecast for Montana reads in Montana time). */
export function formatClock(t: number, offsetSec?: number): string {
  if (offsetSec == null) return new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return new Date(t + offsetSec * 1000).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })
}

/** Clock time with "tomorrow" (or the weekday) when it isn't today at that place. */
export function formatClockDay(t: number, offsetSec: number | undefined, now: number = Date.now()): string {
  return withDay(t, formatClock(t, offsetSec), offsetSec, now)
}

/** A time span, naming the day once: "6:10–9:40 PM", "1:05–3:30 AM tomorrow", "11:20 PM–2:10 AM tomorrow". */
export function formatSpan(start: number, end: number, offsetSec: number | undefined, now: number = Date.now()): string {
  if (localDay(start, offsetSec) !== localDay(end, offsetSec)) return `${formatClockDay(start, offsetSec, now)}–${formatClockDay(end, offsetSec, now)}`
  return withDay(start, `${formatClock(start, offsetSec)}–${formatClock(end, offsetSec)}`, offsetSec, now)
}

const offsetMs = (ms: number, offsetSec?: number) => (offsetSec ?? -new Date(ms).getTimezoneOffset() * 60) * 1000
const localDay = (ms: number, offsetSec?: number) => Math.floor((ms + offsetMs(ms, offsetSec)) / 86_400_000)

function withDay(t: number, text: string, offsetSec: number | undefined, now: number): string {
  const diff = localDay(t, offsetSec) - localDay(now, offsetSec)
  if (diff === 0) return text
  if (diff === 1) return `${text} tomorrow`
  return `${new Date(t + offsetMs(t, offsetSec)).toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' })} ${text}`
}

export function formatHour(t: number, offsetSec?: number): string {
  const d = new Date(offsetSec == null ? t : t + offsetSec * 1000)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', ...(offsetSec == null ? {} : { timeZone: 'UTC' }) })
}

export function weekday(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' })
}

export function ago(t: number | string, now = Date.now()): string {
  const ms = now - (typeof t === 'string' ? Date.parse(t) : t)
  const min = Math.round(ms / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const h = Math.round(min / 60)
  if (h < 48) return `${h} h ago`
  return `${Math.round(h / 24)} days ago`
}

/** Value for <input type="datetime-local"> in the device's zone. */
export function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromLocalInput(v: string): string {
  return new Date(v).toISOString()
}

/** The URL if it is a well-formed http(s) link, else undefined: never a javascript: or data: link in an href. */
export function safeHttpUrl(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  try {
    const { protocol } = new URL(v)
    return protocol === 'https:' || protocol === 'http:' ? v : undefined
  } catch {
    return undefined
  }
}
