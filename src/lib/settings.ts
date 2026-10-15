import { useSyncExternalStore } from 'react'
import { db, DEFAULT_SETTINGS, type AppSettings } from './db'

// Settings live in memory and persist to IndexedDB behind the scenes, so a
// toggle flips the instant it's tapped instead of waiting on a database round trip.
let current: AppSettings = DEFAULT_SETTINGS
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

// Until the stored row has been read, writing would replace it with defaults plus one
// change (losing the API key and everything else), so a failed read blocks writes.
let loaded = false
const load = (): Promise<void> =>
  db.settings
    .get('app')
    .then((row) => {
      current = mergeSettings(row?.value)
      loaded = true
      emit()
    })
    .catch(() => {}) // IndexedDB unavailable: run on defaults in memory
const ready = load()
let retry: Promise<void> | undefined

export async function getSettings(): Promise<AppSettings> {
  await ready
  return current
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  await ready
  // One shared retry, so writes that arrive together all land on top of the same read.
  if (!loaded) await (retry ??= load().finally(() => (retry = undefined)))
  current = { ...current, ...patch }
  emit()
  if (loaded) await db.settings.put({ key: 'app', value: current })
  return current
}

export function useSettings(): AppSettings {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
  )
}

/** Bumped when a default layer changes for people who already have saved settings. */
export const LAYERS_REV = 2

export function mergeSettings(v: Partial<AppSettings> | undefined): AppSettings {
  const merged = { ...DEFAULT_SETTINGS, ...v, layers: { ...DEFAULT_SETTINGS.layers, ...v?.layers } }
  // Rev 2: shops, ramps and access points are on by default, so the map shows what's near you.
  if (v && (v.layersRev ?? 1) < 2) merged.layers = { ...merged.layers, amenities: true }
  return { ...merged, layersRev: LAYERS_REV }
}
