## Parity: 97.9 / 100

features 97.9  (41 counted, must-haves 20 of 20 done)

## By area, weakest first
- offline                       80.0  (2 features)
- forecast                      94.4  (8 features)
- map                          100.0  (11 features)
- gauges                       100.0  (3 features)
- logbook                      100.0  (7 features)
- markers                      100.0  (1 features)
- stats                        100.0  (1 features)
- streams                      100.0  (2 features)
- settings                     100.0  (2 features)
- species                      100.0  (2 features)
- platform                     100.0  (2 features)

## Missing, in build order
- [should] offline: Download a map area for offline use, partial  (TroutRoutes offline maps; built (2,500-tile areas, version-free tile cache keys) but not run against live OpenFreeMap tiles yet)
- [could] forecast: Saltwater advice, no  (not built: tides needed; the app says so instead of guessing)

## Left out on purpose (not scored)
- Elevation profile of a stream: needs a DEM service; later
- Social feed followers and comments: their network
- Crowd-sourced catch locations from other anglers: their users' data
- Classified trout streams (national classes): TroutRoutes curated dataset
- Hand-curated public access points: TroutRoutes curated dataset; OSM amenities used instead
- Regulations overlay: curated / partner data; user regs links instead
- Public land boundaries: public PAD-US data but needs hosted tiles; later milestone
- Garmin depth maps: licensed
- AI spot prediction: trained on their catch data
- Species recognition from a photo: needs a model; later
- Pro subscription and paywall: v1 is free and local; pricing is replica-launch's call

## Yours, not in the original (not scored)
- Import my data
- Optional own USGS API key for higher limits
- F1 Public data never paywalled (stream names gauges weather offline)
- F2 Private by default; hidden catches store no coordinates
- F3 Nationwide coverage incl. FL LA AK
- F4 Offline areas up to 2500 tiles each
- F5 Unverified-access warning on OSM amenities and bridges
- F6 Streams drawn in a water colour distinct from roads
- F7 Per-stream regs link with date checked
- F8 No review prompts or nags
- Rig guide with diagrams and steps
- Public fish records layer on the map
- State stocking reports
- Water temperature estimate when nothing measures it
- French national fish surveys (Hub'Eau)

## What the number leaves out

- 11 features are `skip`, and they include what users pay the originals for:
  the 50,000 classified trout streams and 280,000 hand-curated access points,
  the regulations overlay, and the crowd-sourced catch map. Those are the
  originals' data, not features, so they can't be cloned. Tailout replaces them
  with OpenStreetMap streams and places plus the angler's own notes, which is
  weaker data. The parity score does not measure that gap.
- No layout diff: no screenshots of the original apps were taken (no account
  was used), so `imgdiff.py` has nothing to compare. Clone screens are in
  `clone-screens/` for a later comparison.

## Behaviour differences

| flow | originals | Tailout | keep or fix |
| --- | --- | --- | --- |
| see a river's name | paid tier in one original (per its reviews) | always free | keep (F1) |
| check flows | gauge layer in the app | same, plus trout temp bands and 24 h trend | keep |
| log a catch | 4+ taps, shared to a network by default | 4 taps, never leaves the device | keep (F2) |
| hide a spot | three privacy levels | three levels; "hidden" stores no coordinates at all | keep |
| offline maps | paid; reviewers cite a 750-tile cap | free, 2,500 tiles per area, no area limit | keep (F4) |
| forecast | proprietary score | open heuristic with the reasons for every hour | keep |

## Verdict

**Shippable as a beta, pending the live-data checks in `test-plan.md`.** All
must-haves done, feature score 97.6, no open S1 or S2 bugs, and the fixes from
`fixes.md` are built in. It is not a full replacement for either original
until the stream-classification and access data gap is closed.

Top five next:
1. Run the manual live-data checks (tiles, USGS, Open-Meteo, Overpass, iNaturalist, Hub'Eau, stocking endpoints, CORS) in a real browser.
2. Field-test "Save this area" and the advice on real water.
3. Saltwater: tides (NOAA CO-OPS), inshore species, surf and pier rigs.
4. More stocking states (NH, UT history) and lake surveys (MN LakeFinder) where the APIs allow.
5. Public-land layer (PAD-US) as hosted vector tiles.
