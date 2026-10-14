import { useSyncExternalStore } from 'react'
import { db, DEFAULT_SETTINGS, type AppSettings } from './db'

// Settings live in memory and persist to IndexedDB behind the scenes, so a
// toggle flips the instant it's tapped instead of waiting on a database round trip.
let current: AppSettings = DEFAULT_SETTINGS
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

const ready: Promise<void> = db.settings
  .get('app')
  .then((row) => {
    current = mergeSettings(row?.value)
    emit()
  })
  .catch(() => {})

export async function getSettings(): Promise<AppSettings> {
  await ready
  return current
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  await ready
  current = { ...current, ...patch }
  emit()
  await db.settings.put({ key: 'app', value: current })
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

function mergeSettings(v: Partial<AppSettings> | undefined): AppSettings {
  return { ...DEFAULT_SETTINGS, ...v, layers: { ...DEFAULT_SETTINGS.layers, ...v?.layers } }
}
