import { cellKey } from './geo'

/**
 * Streams come from the basemap's vector tiles, which have no stable ids, so a
 * note is keyed by the stream's name plus a 0.25° cell. Two different "Mill
 * Creeks" in two states never share notes; one long river gets a note per
 * stretch, which matches how regulations change along a river anyway.
 */
export function streamKey(name: string, lat: number, lon: number): string {
  return `${normalizeWater(name)}@${cellKey(lat, lon, 0.25)}`
}

export function normalizeWater(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

export type StreamHit = { name?: string; kind: string; lat: number; lon: number; intermittent?: boolean }
