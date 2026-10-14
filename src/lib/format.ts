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
