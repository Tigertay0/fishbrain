# Recon map: Fishbrain + TroutRoutes (iOS, Android, web) → one PWA

Scope: the trout angler's loop that the two apps split between them. Find
moving water and a way onto it (TroutRoutes), check whether it's fishable now
(TroutRoutes gauges + Fishbrain forecast), then log what you caught (Fishbrain
logbook). Social network, crowd catch data, depth charts, and curated stream
data are out of scope (see bottom).
For: the repo owner's own product, a PWA aimed at US stream and fly anglers.
Date: 2026-10-14

Method: public pages and store listings only. No account was used, no app
code or network traffic was inspected, and no screenshot is shipped.

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | Fishbrain marketing home | https://fishbrain.com/ | logbook, spots, local reports, location privacy FAQ (3 levels) |
| 2 | Fishbrain features | https://fishbrain.com/features | catch locations, depth maps, 7-day weather, BiteGuide, BiteTime, BiteScore, lure recs |
| 3 | Fishbrain fishing spots | https://fishbrain.com/features/fishing-spots | waters list by distance, species filter (Pro), layers (Pro), regs via sister app |
| 4 | Fishbrain Play listing | https://play.google.com/store/apps/details?id=com.fishbrain.app | spots, forecasts, catch log |
| 5 | TroutRoutes App Store | https://apps.apple.com/us/app/troutroutes-fly-fishing-app/id1423989574 | 50k classified streams, 280k access points, public land, USGS gauges, offline maps, markups, regs, fly shops, elevation charts, pricing |
| 6 | TroutRoutes site | https://troutroutes.com/ | Basic vs PRO feature split |
| 7 | TroutRoutes "Regulations PRO" post | https://troutroutes.com/2022/04/06/introducing-regulations-pro/ | regs overlay, per-section classes (e.g. WI Class I-III) |
| 8 | TroutRoutes user guide (PDF) | https://troutroutes.com/wp-content/uploads/2023/04/Trout-Routes-User-Guide_04_23.pdf | map layers, gauge charts |
| 9 | USGS Water Data APIs | https://api.waterdata.usgs.gov/docs/ogcapi/ | the public gauge API both apps' gauge layers rely on |

## Core loop

Open the map near you, tap a stream or gauge to see if it's fishable today
(flow, water temp, weather, bite window), go fish, log the catch with the
conditions filled in automatically.

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Map | `/` (home tab) | find water, see gauges, my catches, my markers | basemap, stream lines, gauge pins, catch pins, locate button, search, FAB | loading, filled, offline (cached tiles), no location permission, API error |
| S02 | Layers sheet | Map → layers button | toggle what the map shows | toggles, basemap choice | default, all off |
| S03 | Stream sheet | Map → tap a stream | name, type, nearest gauges, my notes and class, regs link, my catches on it | bottom sheet, chips, list | unnamed stream, no gauge nearby, has notes |
| S04 | Gauge sheet | Map → tap a gauge | current flow, water temp, trout-temp verdict, 7-day chart, link out | stat tiles, sparkline | no temp sensor, stale reading, chart loading, chart error |
| S05 | Forecast | `/forecast` tab | 7-day weather, bite windows, sun and moon, pressure trend | day strip, hourly activity bars, solunar list | loading, no location, offline (cached) |
| S06 | Log a catch | `/log` (center button) | photo, species, size, fly/lure, location, privacy | photo picker, species combobox, number inputs, mini map, segmented privacy | empty, validating, saving, no GPS |
| S07 | Logbook | `/logbook` tab | my catches, newest first, species filter | catch cards, filter chips | empty, filled, filtered empty |
| S08 | Catch detail | `/catch/:id` | full record + conditions snapshot | photo, stat grid, mini map, edit/delete | hidden location, no photo |
| S09 | Stats | `/stats` | totals, by species, personal bests, best hours, best flows | stat tiles, bar lists | empty, filled |
| S10 | Marker editor | Map → long-press or "Add marker" | access, parking, bridge, campsite, run, note | type chips, name, notes | new, edit |
| S11 | Species guide | `/species` | ID tips, temp ranges, typical flies | species cards | n/a |
| S12 | Settings | `/settings` | units, default privacy, USGS key, export/import, offline areas, storage | form, file input | first run, has data |
| S13 | Search | Map → search field | jump to a place by name | text input, results list | no results, error |

## Flows

```
F01 Check a stream before going
    S01 -> S03 (tap stream) -> S04 (tap nearest gauge)
    happy path clicks: 2
    edge: no gauge within 25 km, gauge has flow but no temp, reading older than 6 h,
          USGS rate limit hit (50/h without key), offline
F02 Log a catch at the water
    S01 -> S06 (center button) -> fill species + size -> save -> S08
    happy path clicks: 4 (photo optional)
    edge: no GPS fix, denied location, huge photo, offline (must still save),
          double tap on save, back mid-form, metric vs imperial
F03 Plan a trip by forecast
    S05 -> pick day -> read best window
    happy path clicks: 1
    edge: no location (fallback to map center / last place), offline (cached)
F04 Mark access and parking
    S01 -> long-press -> S10 -> save
    happy path clicks: 3
    edge: edit and delete, marker on top of a catch pin
F05 Review my season
    S07 -> filter species -> S08 ; S09
    happy path clicks: 2
    edge: zero catches, 500 catches, hidden-location catches
F06 Prepare for no signal
    S12 -> "Save this map area" (from S01 view) -> confirm tile count
    happy path clicks: 2
    edge: area too large, storage quota exceeded, mid-download offline
F07 Move my data
    S12 -> export JSON / CSV, import JSON
    edge: import of a malformed file, duplicate ids
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Button | primary, secondary, ghost, danger, icon | default, hover, focus, disabled, busy | all |
| Bottom sheet | peek, full | open, closing | S02, S03, S04, S10 |
| Tab bar | 5 items with raised center action | active, focus | all |
| Stat tile | default, good, caution, bad | loading, empty | S04, S08, S09 |
| Chip / segmented | toggle, single-select | on, off, focus | S02, S06, S07, S10 |
| Field | text, number with unit, textarea, select/combobox, file | error, disabled | S06, S10, S12 |
| Sparkline chart | line | loading, empty, error | S04 |
| Activity bars | 24 hourly bars | today highlight | S05 |
| Catch card | with photo, without photo | hidden location | S07 |
| Toast | info, error | auto-dismiss | all |
| Empty state | with action | | S07, S09 |

## Inferred data model

```
Catch      id, caught_at, species, length, weight, lure/fly, method, notes, photo,
           lat, lon, water_name, privacy (exact | water | hidden),
           conditions {air temp, pressure, pressure trend, wind, cloud, moon phase,
                       flow, water temp, gauge id}
           evidence: fishbrain.com logbook ("fetch weather conditions from your
           catches"), FAQ on three privacy levels
           confidence: high
Marker     id, kind (access | parking | bridge | camp | run | note), name, notes, lat, lon
           evidence: TroutRoutes "custom markups", "personal waypoints, notes, photos"
           confidence: high
StreamNote stream key, class (user label), species, regs url, notes
           evidence: TroutRoutes stream classes + regs detail; recreated as the
           user's own notes because the curated data is theirs
           confidence: medium (a deliberate replacement, see out of scope)
Gauge      id, name, lat, lon, latest flow, latest water temp, observed_at
           evidence: TroutRoutes USGS gauge layer; USGS monitoring-locations
           confidence: high
Settings   units, default privacy, usgs api key, last map view
           confidence: guess
OfflineArea id, name, bbox, zooms, tile count, saved_at
           evidence: TroutRoutes "download maps by river or region"
           confidence: medium
```

Relationships: Catch n-1 (optional) Gauge via conditions; StreamNote 1-1 stream
(by OSM way name + id); everything else stands alone. No users table in v1:
the data lives on the device.

## Feature matrix

See `features.csv`. Must: 17, should: 13, could: 7, skip: 11.

## Out of scope (cannot or should not be cloned)

- Fishbrain's network: feed, followers, comments, 20M crowd catch locations,
  local fishing reports, gear reviews. These are its users' data.
- Fishbrain's AI spot prediction and species photo recognition (trained on
  their data; an on-device model is possible later, not a clone item).
- Garmin depth charts (licensed).
- TroutRoutes' 50,000 classified streams, 280,000 hand-curated access points
  and regulations overlay: their curated dataset. Replaced by OpenStreetMap
  waterways + amenities and the angler's own classes, notes and regs links.
- Public land parcels: public data (PAD-US) exists, but a nationwide vector
  layer needs hosting; marked as a later milestone, not v1.
- Fish Rules regulations (sister app / partner data).

## Size

Screens 13, flows 7, entities 6. Hard parts: offline (tiles + data + photo
blobs), USGS rate limit without a key (50 requests/hour/IP), stream geometry
from Overpass at the right zoom without hammering it, a forecast score that's
honest about being a heuristic. Size: M for v1 (local-first, no backend). Sync,
accounts and sharing push it to L.
