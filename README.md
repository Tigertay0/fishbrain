# Tailout

A free trout-fishing PWA: every stream, live USGS river gauges, a forecast that
explains itself, and a catch log that never leaves your phone. Works offline.

- **Map**: streams and rivers drawn from the basemap's own vector tiles; tap one
  for nearby gauges, your notes, your regulations link and your catches there.
  Street, USGS topo and USGS satellite basemaps. Custom markers (access,
  parking, bridge, good run, camp, note). Optional OpenStreetMap layer of fly
  shops, ramps, campsites, parking and road bridges near streams, always marked
  as unverified access.
- **Gauges**: live flow, gage height and water temperature from the USGS Water
  Data API, colour-coded by trout temperature bands, with 7-day charts.
- **Forecast**: 7 days of weather, sun and moon, and an hourly bite score whose
  every point comes with a reason. Trout-aware when a gauge reports water temp.
- **Logbook**: species, size, fly or lure, photo, and conditions (weather,
  pressure, moon, nearest gauge) attached automatically, even if you logged it
  with no signal. Location privacy per catch: exact, water only (~1 km), or
  hidden (no coordinates stored at all). Stats and personal bests.
- **Offline**: installable; the app, your data and saved map areas (up to
  2,500 tiles each) work with no connection.
- **Yours**: no account, no ads, no rating prompts. Back up to JSON (with
  photos) or CSV, restore on another device.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # typecheck + production build with service worker
npm run preview      # serve the build on :4173
npm test             # unit tests (Vitest)
npm run test:e2e     # end-to-end (Playwright), all external APIs mocked
```

`node scripts/tokens.mjs` regenerates `src/styles/tokens.css` from
`replica/design/tokens*.json`; `node scripts/make-icons.mjs` re-renders the PNG
icons from `public/icons/icon.svg`.

## Stack

Vite 7, React 19, TypeScript, Tailwind 4, MapLibre GL 5, Dexie (IndexedDB),
vite-plugin-pwa with a custom Workbox service worker (`src/sw.ts`). No backend.

## Data sources and limits

| data | source | notes |
| --- | --- | --- |
| basemap, stream lines | OpenFreeMap (OpenMapTiles, © OpenStreetMap contributors) | keyless |
| topo, imagery | USGS The National Map | public domain |
| gauges | USGS Water Data OGC API v1 | 50 requests/hour/IP without a key; add your own free key in Settings for 1,000 |
| weather | Open-Meteo | free for non-commercial use; needs a paid plan (or NWS) before selling |
| places | Overpass API (OpenStreetMap) | on demand, cached 14 days |
| search | Nominatim | on submit only, per its usage policy |

The legacy USGS WaterServices API shuts down on 2027-02-22; this app already
uses its replacement.

## Planning docs

`replica/` holds how this was planned and checked: recon map and feature
matrix, architecture, design tokens with contrast reports, the review research
and fix plan, test plan, bug log, parity report and brand notes.
