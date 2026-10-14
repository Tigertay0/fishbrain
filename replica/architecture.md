# Architecture: Tailout (a rebuild of Fishbrain's logbook/forecast and TroutRoutes' stream map)

"Tailout" is a working name until replica-brand runs.

The skill's default stack (Next.js + Supabase + Stripe) assumes accounts and a
server. v1 has neither: the job is a map, public data, and a private logbook
that must work with no signal. So v1 is a static, local-first PWA, and the
Postgres schema below is the sync milestone, not v1.

## Stack

| layer | choice | why |
| --- | --- | --- |
| web | Vite 7 + React 19 + TypeScript | static build, fast HMR, no server to run or pay for |
| styling | Tailwind 4, tokens from `replica/design` as CSS variables | `@theme` maps tokens straight to utilities |
| map | MapLibre GL 5 | open source, vector tiles, `queryRenderedFeatures` for tapping streams |
| basemap | OpenFreeMap "liberty" (vector), USGS National Map imagery + topo (raster) | all keyless; USGS layers are US public domain |
| stream lines | the basemap's own OpenMapTiles `waterway` layer, restyled | no extra API, cached with the tiles, works offline |
| gauges | USGS Water Data OGC API v1 (`latest-continuous`, `monitoring-locations`, `continuous`) | the legacy WaterServices API shuts down 2027-02-22 |
| weather | Open-Meteo forecast API | keyless, hourly pressure/cloud/wind, `past_days=1` for pressure trend |
| amenities | Overpass API (OpenStreetMap) on demand | fly shops, slipways, campsites, parking and road bridges near streams |
| search | Nominatim, on submit only | its usage policy forbids autocomplete |
| sun/moon | suncalc (in-browser) | solunar periods with no API |
| storage | IndexedDB via Dexie 4 | catches, photo blobs, markers, notes, API caches |
| offline | vite-plugin-pwa (Workbox) | precached shell, runtime caches for tiles and API JSON |
| hosting | any static host (Cloudflare Pages, Netlify, Vercel) | replica-deploy picks; nothing server-side |
| auth, payments, email, jobs | none in v1 | no accounts; see sync milestone |

## Schema

v1 tables (IndexedDB, `src/lib/db.ts`):

| table | key | indexes | notes |
| --- | --- | --- | --- |
| catches | id (uuid) | caughtAt, species | metric units stored, converted on display |
| photos | id | | full JPEG (max 1600px) + 400px thumb, as Blobs |
| markers | id | kind | |
| streamNotes | key (normalized name + 0.25° cell) | | the angler's own class, species, regs link, notes |
| apiCache | key | savedAt | gauge cells, gauge names, weather, amenities, with TTLs |
| offlineAreas | id | | saved tile areas |
| settings | key | | units, default privacy, USGS key, last view |

Access rules: single user, single device in v1, so none. Sync milestone below
uses Postgres RLS; see `replica/schema.sql`.

## API (external, read-only)

| method path | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| GET api.waterdata.usgs.gov/ogcapi/v1/collections/latest-continuous/items | latest flow + temp per series in a 1° cell | anyone, 50 req/h/IP keyless | bbox, parameter_code=00060,00010, properties, api_key? | GeoJSON points | F01 |
| GET …/monitoring-locations/items | gauge names in the cell | same | bbox, site_type_code=ST, properties | GeoJSON | F01 |
| GET …/continuous/items | 7-day history for one gauge | same | monitoring_location_id, parameter_code, time=P7D | GeoJSON | F01 |
| GET api.open-meteo.com/v1/forecast | hourly + daily weather | anyone, fair use | lat, lon, hourly, daily, past_days=1, timezone=auto | JSON | F02, F03 |
| POST overpass-api.de/api/interpreter | amenities near streams | anyone, fair use | Overpass QL for a ≤0.15° bbox | JSON | F01 |
| GET nominatim.openstreetmap.org/search | place search | anyone, 1 req/s | q, format=jsonv2, countrycodes=us | JSON | S13 |

Webhooks: none. Jobs: none (no server). Background refresh happens on view.

## The parts that bite

- **USGS rate limit**: 50 requests/hour/IP without a key. Gauges load only at
  zoom ≥ 8, by 1° cell, cached 20 minutes (names 30 days), so a normal session
  spends single digits. Settings takes the user's own free key (sent as the
  `api_key` query param, not a header, so there's no CORS preflight).
- **Dead gauges**: `latest-continuous` returns series that stopped in 1981.
  Anything older than 3 days or with a null value is treated as offline.
- **Storage eviction**: Safari can wipe IndexedDB for sites not added to the
  home screen after about 7 days without a visit. The app asks for persistent
  storage, nudges install, and makes export one tap.
- **Offline**: tiles are cached as they're viewed (capped) and "Save this area"
  prefetches a bounded tile set. Catch saving never touches the network;
  conditions are attached from cache and filled in later if missing.
- **Time zones**: catches store UTC ISO strings; forecast uses the location's
  zone from Open-Meteo (`timezone=auto`).
- **Units**: everything stored metric; display converts. One function, tested.
- **Bite score honesty**: a heuristic from solunar timing, dawn/dusk, pressure
  trend, cloud, and (for trout) water temperature. The UI says so and shows
  the inputs, not a magic number.
- **Location privacy**: "hidden" catches never store coordinates at all, not
  just hide them. "Water" keeps the water name and a 1 km-rounded point.
- **Open-Meteo terms**: free for non-commercial use. If this is sold, switch to
  their paid plan or the NWS API (api.weather.gov) before launch.
- **Tile etiquette**: offline downloads are capped (default 2,500 tiles) and
  never exceed zoom 15.

## Build order

1. Vertical slice: S01 map with streams + gauges, S04 gauge sheet, S06 log a
   catch, S07 logbook. Tables: catches, photos, apiCache.
2. Must-haves: S05 forecast, S08 catch detail, privacy levels, markers (S10),
   search (S13), offline shell.
3. Should-haves: layers + satellite/topo (S02), stream sheet + notes (S03),
   amenities, stats (S09), edit/delete, offline areas, units.
4. Could-haves: species guide (S11), export/import (S12), dark mode, install
   prompt, USGS key.
5. Fixes from replica-entrepreneur.

## Sync milestone (not v1)

Supabase Postgres + Auth + Storage. Tables mirror v1 with `user_id` and RLS so
each angler sees only their own rows (`replica/schema.sql`). Photos go to a
private bucket. A sharing feature, if it ever ships, publishes a copy with the
privacy level applied server-side, never the raw row.
