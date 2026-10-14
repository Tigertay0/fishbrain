# Fixes: what the originals' users hate, and what Tailout does instead

Sample: 300 US App Store reviews from Apple's public customer-reviews RSS feed,
150 per app, the three most recent pages each. Fishbrain: 2026-08-14 to
2026-10-12, average 3.33. TroutRoutes: 2024-05-10 to 2026-10-08, average 1.85.
One source only, so `reviews.py` marks every theme **thin**. Treat the counts
as direction, not proof. Full ranked output: `feedback-fishbrain.md`,
`feedback-troutroutes.md`; rows with feed URLs in `reviews*.csv`.

Counts below are reviews matching a theme out of 150 for that app. Themes
overlap (one review can hit "paywall" and "price").

## 1. What they hate

| # | problem | app | reviews | quote (review id) |
| --- | --- | --- | --- | --- |
| 1 | The free tier was cut back until the basics need a subscription | Fishbrain | 53 | "Why would I log my catches only for people who pay to see them?" (14564858599) |
| 1 | same | TroutRoutes | 44 | "can’t even see the names of rivers on the map" (14515318594) |
| 2 | Price | Fishbrain | 43 | "costs $80 a year or $12 a month" (14652258989) |
| 2 | Price, and single-state plans that push the national plan anyway | TroutRoutes | 38 | "the app tells you that you need to upgrade to the nationwide subscription anyway." (13399616022) |
| 3 | The same info is free elsewhere | TroutRoutes | 19 | "And for river flows just use the usgs website." (13539513138) |
| 3 | same | Fishbrain | 13 | "Only useful information is easily available anywhere free." (14507384044) |
| 4 | Wrong access data, sends people onto private land | TroutRoutes | 14 | "The parking and access info is totally wrong." (12494063939) |
| 5 | Map hard to read: stream colour clashes with roads | TroutRoutes | thin (the "map" theme's 27 is inflated) | "The road colors are the same as the trout indicators gold is also a gold road." (14542293402) |
| 6 | App won't open / blank screen | TroutRoutes | 11 | "TroutRoutes blue screen of death…" (13622638409) |
| 7 | Billing and trial charges | TroutRoutes | 15 + 13 | "try charging you even after you delete it" (14065177959) |

## 2. What is missing

| problem | app | reviews | quote |
| --- | --- | --- | --- |
| Whole states not covered (FL, LA, AK) | TroutRoutes | 12 | "No Florida???" (13034996254) |
| Offline maps, and a small tile cap | TroutRoutes | 9 | "limited to 750 tiles" (14265612465) |
| Up-to-date regulations in the app | TroutRoutes | 6 | "it would be nice to actually have up to date regulations right in the app." (14213989271) |
| A private logbook | Fishbrain | thin | "Wish there was private post so you can see what you have caught without letting other people see it" (14487553960) |
| Species lists that fit the region | Fishbrain | 7 | "The new one has a list of fish not even around here." (14432793838) |

## 3. What is unsolved

- **Anglers who don't want their spots on a public map.** Thin (about 4 per
  app) but sharp: "This app has genuinely destroyed the fishing in my
  hometown." (13193757494). Both apps are built around sharing or selling
  location data.
- **Anglers who just want the free public data in one place.** USGS flows,
  OSM streams and weather are public; users resent paying to see them.

## Fix plan

| # | fix | size | where | evidence |
| --- | --- | --- | --- | --- |
| F1 | Everything public stays free: stream names, gauges, weather, offline areas. No paywall in the core loop | S | product rule; replica-launch prices only extras | paywall 53 + 44 |
| F2 | Private by default: the logbook never leaves the device; "hidden" catches store no coordinates at all | S | build (S06, db) | private logbook request, spot-burning theme |
| F3 | Nationwide from day one: USGS + OSM cover all 50 states, incl. FL, LA, AK | S | build (data layer) | coverage 12 |
| F4 | Offline areas up to 2,500 tiles each, several areas, free | M | build (offline.ts, SW) | offline 9, "750 tiles" |
| F5 | Access honesty: OSM amenities and road bridges labelled "unverified, check it's legal to access"; markers are the angler's own | S | build (place sheet copy) | wrong access 14 |
| F6 | Streams drawn in a water colour with a casing, never a road colour | S | design (map layer) | map readability |
| F7 | Your own regs link and notes per stream, with the date you checked | S | build (S03) | regs 6 |
| F8 | No review prompts, no nags, ever | S | product rule | nags theme |
| F9 | If paid tiers ever ship: one-tap cancel, no trial that bills silently | S | replica-launch | billing 15 + 13 |

F1–F8 are added to `features.csv` with `original` = `no`.

## Angle

Recommended:

```
For trout anglers who are tired of paying to see public river data and
don't want their spots on someone else's map,
Tailout puts every stream, USGS gauge and forecast on one free map that
works offline, with a logbook that never leaves your phone.
Evidence: paywall/price, 97 reviews across both apps (one source, thin).
```

Alternatives: "the private logbook" (spot-burning theme, thin) and "the
nationwide map" (coverage, 12 reviews, TroutRoutes only).
