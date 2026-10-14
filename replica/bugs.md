# Bugs: Tailout

Found while building and testing on 2026-10-14. Every one was reproduced, fixed,
and has a test that would catch it again.

### BUG-001: map collapses to 0 px tall
- Severity: S1 (core flow blocked: no map)
- Screen: S01  Browser: Chromium, 412 px
- Steps: open `/`.
- Expected: full-screen map with zoom and locate controls. Actual: blank screen, no controls.
- Cause: MapLibre's CSS sets `position: relative` on its container, overriding `absolute inset-0`.
- Status: fixed (container sized with `h-full w-full`); covered by every map e2e test.

### BUG-002: "water only" catches drift ~400 m on every edit
- Severity: S2 (data wrong, conditions wiped on edit)
- Flow: F02-E2
- Steps: log a catch with "Water only", edit it, save; repeat.
- Expected: the rounded point stays put. Actual: longitude shifts each save.
- Cause: the longitude grid step used the unrounded latitude.
- Status: fixed; unit test "coarsen … is stable".

### BUG-003: layer toggles snap back for a moment
- Severity: S3
- Screen: S02
- Steps: open Layers, tap a checkbox.
- Expected: it ticks immediately. Actual: it unticks until IndexedDB answers (flaky test F04-H3).
- Cause: settings were read through a live database query.
- Status: fixed (in-memory settings store, persisted behind).

### BUG-004: offline areas accepted whole states at overview zoom
- Severity: S3
- Steps: zoom out to a state, Layers → Save this area.
- Expected: refused (useless offline). Actual: saved only zooms 5–7, no streams visible on the water.
- Status: fixed (needs zoom 12+ detail); unit test "refuses a state".

### BUG-005: pressure shown as station pressure (23.9 inHg at altitude)
- Severity: S3 (visibly wrong to any angler with a barometer)
- Screen: S05, S08
- Cause: Open-Meteo `surface_pressure` is pressure at ground level; anglers read sea-level.
- Status: fixed (`pressure_msl`).

### BUG-006: "Show on map" took ~5 s to fly across the country
- Severity: S4
- Status: fixed (`maxDuration: 1500`).

### Smaller fixes
- Gauge sheet showed an empty "Gage height" tile for gauges that don't measure it.
- Catch detail read "0 ft" for a gauge at the catch; now "at the gauge".
- The raised centre tab button covered the last button on long pages.

### BUG-007: a warm week in fall read as the spring spawn
- Severity: S3 (wrong advice: "spawning" for bass in October)
- Flow: F08
- Cause: spawn phase used only the 2-week air trend.
- Status: fixed (needs the trend and the calendar half to agree); unit test "a warm spell in fall is not the spring spawn".

## To check (not reproduced)

- Live OpenFreeMap tiles: confirm the `waterway` layer carries `class` river/stream and names at z12+.
- Overpass `around` queries can be slow in dense cities; 30 s timeout may need tuning.
