import { db } from './db'

export class FetchError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'FetchError'
  }
}

export async function fetchJson<T>(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const { timeoutMs = 12000, ...rest } = init
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...rest, signal: rest.signal ?? ctrl.signal })
    if (res.status === 429) throw new FetchError('Rate limited. Try again later.', 429)
    if (!res.ok) throw new FetchError(`Request failed (${res.status})`, res.status)
    return (await res.json()) as T
  } catch (e) {
    if (e instanceof FetchError) throw e
    if ((e as Error).name === 'AbortError') throw new FetchError('Timed out')
    throw new FetchError(navigator.onLine ? 'Network error' : 'Offline')
  } finally {
    clearTimeout(timer)
  }
}

/**
 * For APIs that ask for at most one request per `gapMs`: each call waits for its own
 * slot, so calls that start together still go out one at a time.
 */
export function rateGate(gapMs: number): () => Promise<void> {
  let next = 0
  return () => {
    const now = Date.now()
    const at = Math.max(now, next)
    next = at + gapMs
    return at > now ? new Promise((r) => setTimeout(r, at - now)) : Promise.resolve()
  }
}

export type Cached<T> = { data: T; savedAt: number; stale: boolean }

/**
 * Returns a cached value while it is younger than ttlMs, otherwise fetches.
 * If the fetch fails and an older copy exists, returns that copy marked stale,
 * so the app keeps working offline. Throws only when there is nothing at all.
 */
export async function cachedFetch<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<Cached<T>> {
  const row = await db.apiCache.get(key)
  if (row && Date.now() - row.savedAt < ttlMs) return { data: row.data as T, savedAt: row.savedAt, stale: false }
  try {
    const data = await fetcher()
    const savedAt = Date.now()
    await db.apiCache.put({ key, savedAt, data })
    return { data, savedAt, stale: false }
  } catch (e) {
    if (row) return { data: row.data as T, savedAt: row.savedAt, stale: true }
    throw e
  }
}

export async function peekCache<T>(key: string): Promise<Cached<T> | undefined> {
  const row = await db.apiCache.get(key)
  return row ? { data: row.data as T, savedAt: row.savedAt, stale: false } : undefined
}

/** Drops cache rows older than maxAgeMs, so IndexedDB doesn't grow forever. */
export async function pruneCache(maxAgeMs: number): Promise<number> {
  return db.apiCache.where('savedAt').below(Date.now() - maxAgeMs).delete()
}

export const MINUTE = 60_000
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR
