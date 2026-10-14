# Test plan: Tailout

Date: 2026-10-14  Env: `vite preview` build, Chromium, Pixel 7 (mobile) and 1440×900 (desktop)
Network: every external API is mocked (`e2e/mocks.ts`) with response shapes checked against the
live services on 2026-10-14. Tests never call USGS, Open-Meteo, Overpass or Nominatim.

Every spec fails on any console error, page error or 5xx, and runs an axe WCAG 2.1 AA scan on its screens.

| case | flow | type | expected | auto | result |
| --- | --- | --- | --- | --- | --- |
| F01-H1 | check a stream | happy | tap gauge → name, 71.8 cfs, 55°F "Prime", 7-day chart; "Log a catch here" prefills water | e2e | pass |
| F01-E1 | | edge: revisit | second visit within 20 min makes no USGS request | e2e | pass |
| F01-E2 | | edge: basemap host down | app opens, "Basemap unavailable" shown | e2e | pass |
| F01-E3 | | edge: zoomed out | asks to zoom in, spends 0 USGS requests | e2e | pass |
| F01-E4 | | edge: retired / null / sentinel gauges | hidden | unit | pass |
| F02-H1 | log a catch | happy | GPS fix, save, conditions (pressure, nearest gauge) attach | e2e | pass |
| F02-E1 | | edge: privacy hidden | no lat/lon in IndexedDB | e2e + unit | pass |
| F02-E2 | | edge: privacy water only | point rounded to ~1 km, stable when re-saved | e2e + unit | pass |
| F02-N1 | | negative: no species, bad length | inline errors, focus on first, nothing saved | e2e | pass |
| F02-E3 | | edge: double tap save | exactly one catch | e2e | pass |
| F02-E4 | | edge: no signal | saves, "Saved offline", conditions filled on reconnect | e2e | pass |
| F02-H2 | | happy: photo, edit, delete | photo resized and stored; edit keeps one record; delete removes photo too | e2e | pass |
| F03-H1 | forecast | happy | 7 day tabs, rating, best window, per-hour reasons, sun and moon in place time | e2e | pass |
| F03-E1 | | edge: no place | "Use my location" → forecast | e2e | pass |
| F03-E2 | | edge: weather down | still scores sun and moon, says so | e2e | pass |
| F03-U1 | | scoring | storms and warm water lower scores; points sum to score | unit | pass |
| F04-H1 | markers | happy + negative | empty name error, then saved with type | e2e | pass |
| F04-H2 | search | happy | Nominatim result flies the map in, gauges load | e2e | pass |
| F04-H3 | layers | happy | OSM places only requested when switched on | e2e | pass |
| F05-H1 | logbook + stats | happy | species filter, longest fish | e2e | pass |
| F06-U1 | offline area | plan | valley fits under 2,500 tiles at z12+; a state is refused | unit | pass |
| F06-H1 | offline area | download against live tiles | | manual | **not run** (sandbox blocks tile host) |
| F07-H1 | data | happy | back up JSON, wipe, restore | e2e | pass |
| F07-N1 | | negative | non-backup JSON refused | e2e + unit | pass |
| F07-H2 | | CSV | header + formula injection neutralised | e2e + unit | pass |
| PWA-1 | offline shell | happy | after one visit, logbook and logging work with network cut; manifest valid | e2e | pass |
| A11Y | all screens | axe | 0 violations | e2e | pass |

Totals: 21 unit tests, 48 e2e runs (24 specs × 2 viewports), all passing.

## Manual checks still owed

- Stream lines and stream taps against live OpenFreeMap tiles (the `waterway` source layer).
- "Save this area" end to end, then airplane mode in the field.
- Real USGS, Open-Meteo, Overpass and Nominatim responses in a browser (CORS).
- iOS Safari: install to home screen, photo from camera, storage persistence.
