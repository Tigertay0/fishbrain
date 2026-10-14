import { useSyncExternalStore } from 'react'
import type { Gauge } from './usgs'
import type { Place } from './overpass'

/** A tiny observable id → item map, shared by the map, sheets and forecast. */
function createStore<T extends { id: string }>() {
  const items = new Map<string, T>()
  let snapshot: T[] = []
  const listeners = new Set<() => void>()
  return {
    upsert(list: T[]) {
      if (!list.length) return
      for (const x of list) items.set(x.id, x)
      snapshot = [...items.values()]
      listeners.forEach((l) => l())
    },
    get: (id: string) => items.get(id),
    getSnapshot: () => snapshot,
    subscribe(l: () => void) {
      listeners.add(l)
      return () => listeners.delete(l)
    },
  }
}

export const gaugeStore = createStore<Gauge>()
export const placeStore = createStore<Place>()

export const useGauges = () => useSyncExternalStore(gaugeStore.subscribe, gaugeStore.getSnapshot)
export const usePlaces = () => useSyncExternalStore(placeStore.subscribe, placeStore.getSnapshot)
