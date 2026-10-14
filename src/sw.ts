/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import type { WorkboxPlugin } from 'workbox-core'

declare const self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

const ok = new CacheableResponsePlugin({ statuses: [0, 200] })

// OpenFreeMap puts a build id in tile paths (/planet/20251015_001001_pt/z/x/y.pbf)
// and rolls it weekly. Caching under a version-free key means a saved offline
// area keeps working after the style moves to a new build.
const versionless: WorkboxPlugin = {
  cacheKeyWillBeUsed: async ({ request }) => {
    const url = new URL(request.url)
    url.pathname = url.pathname.replace(/^\/planet\/[^/]+\//, '/planet/_/')
    return url.href
  },
}

registerRoute(
  ({ url }) => url.hostname === 'tiles.openfreemap.org' && url.pathname.startsWith('/planet/') && url.pathname.endsWith('.pbf'),
  new CacheFirst({
    cacheName: 'vector-tiles',
    plugins: [versionless, ok, new ExpirationPlugin({ maxEntries: 12000, maxAgeSeconds: 60 * 60 * 24 * 60, purgeOnQuotaError: true })],
  }),
)

// Fonts and sprites never change for a given URL.
registerRoute(
  ({ url }) => url.hostname === 'tiles.openfreemap.org' && (url.pathname.startsWith('/fonts/') || url.pathname.startsWith('/sprites/')),
  new CacheFirst({ cacheName: 'map-assets', plugins: [ok, new ExpirationPlugin({ maxEntries: 400, purgeOnQuotaError: true })] }),
)

// Style JSON and TileJSON: serve the cached copy instantly, refresh behind it.
registerRoute(
  ({ url }) => url.hostname === 'tiles.openfreemap.org',
  new StaleWhileRevalidate({ cacheName: 'map-styles', plugins: [ok] }),
)

// USGS topo and imagery raster tiles, as viewed.
registerRoute(
  ({ url }) => url.hostname === 'basemap.nationalmap.gov',
  new CacheFirst({
    cacheName: 'raster-tiles',
    plugins: [ok, new ExpirationPlugin({ maxEntries: 3000, maxAgeSeconds: 60 * 60 * 24 * 30, purgeOnQuotaError: true })],
  }),
)

// USGS PAD-US public land vector tiles, as viewed and from "Save this area".
// Boundaries change about once a year, so a long cache is safe.
registerRoute(
  ({ url }) => url.hostname === 'tiles.arcgis.com' && url.pathname.includes('/PADUS_') && url.pathname.includes('/VectorTileServer/tile/'),
  new CacheFirst({
    cacheName: 'land-tiles',
    plugins: [ok, new ExpirationPlugin({ maxEntries: 8000, maxAgeSeconds: 60 * 60 * 24 * 90, purgeOnQuotaError: true })],
  }),
)

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting()
})
