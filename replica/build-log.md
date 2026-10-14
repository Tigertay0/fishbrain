# Build log: Tailout

| ID | screen | date | status | missing / notes |
| --- | --- | --- | --- | --- |
| S01 | Map | 2026-10-14 | done | live-tile stream rendering untested in sandbox |
| S02 | Layers sheet | 2026-10-14 | done | offline download untested against live tiles |
| S03 | Stream sheet | 2026-10-14 | done | unnamed streams can't hold notes (by design: no stable id) |
| S04 | Gauge sheet | 2026-10-14 | done | |
| S05 | Forecast | 2026-10-14 | done | |
| S06 | Log a catch | 2026-10-14 | done | no map picker for location; comes from GPS or a map sheet |
| S07 | Logbook | 2026-10-14 | done | |
| S08 | Catch detail | 2026-10-14 | done | |
| S09 | Stats | 2026-10-14 | done | |
| S10 | Marker editor | 2026-10-14 | done | |
| S11 | Species guide | 2026-10-14 | done | 12 species |
| S12 | Settings | 2026-10-14 | done | |
| S13 | Search | 2026-10-14 | done | on submit only, per Nominatim policy |

Harder than expected:
- USGS keyless limit (50 requests/hour/IP) shaped the whole data layer: 1° cells,
  20-minute cache, names fetched only on tap, optional user key.
- `latest-continuous` returns series dead since 1981; filtering on age was required.
- OpenFreeMap rolls a build id into tile URLs weekly; the service worker caches
  under a version-free key so saved areas survive the roll.
- Open-Meteo returns local wall-clock times; all solunar math runs from the
  place's own midnight so the device's time zone never leaks in.

Not built: sync and accounts (milestone in architecture.md; dropped for now:
the app has a single user).

Added 2026-10-14, after launch:
- Map opens on the angler's location; OSM shops, ramps and access on by default.
- What to use: full bait, lure and fly lists per fish with season picks
  marked, and a combined "Bring these" list.
- Public land layer (USGS PAD-US tiles by manager; tap for name, agency and
  public access from the fee and access services).
- Saltwater advice: 15 inshore fish, NOAA tides, Open-Meteo sea temperature,
  tide-aware ranking and windows, three saltwater rigs.
- Offline "Save this area" checked against live OpenFreeMap and PAD-US tiles.
