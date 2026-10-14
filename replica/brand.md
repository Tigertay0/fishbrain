# Brand: Tailout

**Tailout**: the shallow tail of a pool, where the current slows and trout sit
to feed. It names the place anglers look, not either original app.

## How we got here

The working name was "Seamline". The first screening search found **"Seamline:
Trout Fishing Map" already live on the App Store** in exactly this category, so
it was dropped before anything shipped. That's the reason this step exists.

| candidate | result of a web search, 2026-10-14 |
| --- | --- |
| Seamline | **conflict**: live App Store app "Seamline: Trout Fishing Map" |
| Pocketwater | **conflict risk**: L.L.Bean "Pocket Water" fly rod, same category |
| Undercut | no fishing app found; generic word, hard to own |
| Holdwater | no fishing app found; weak meaning |
| **Tailout** | **no app or fishing brand found** |

## Checks for Tailout

These are screening checks, not legal clearance. "Tailout" is a fishing term,
so a trademark examiner may call it descriptive for fishing software. Talk to a
trademark lawyer before spending money on it.

| check | where | result |
| --- | --- | --- |
| web | search "Tailout app fishing" | run 2026-10-14: only articles about fishing tailouts |
| US trademark | tmsearch.uspto.gov, classes 9 and 42 | to run |
| EU trademark | euipo.europa.eu eSearch / TMview | to run |
| Canada | ised-isde.canada.ca | to run |
| global | WIPO Global Brand Database | to run |
| domain | tailout.app, tailout.com, gettailout.com | to run |
| App Store and Play | search the exact name | to run |
| handles | X, Instagram, TikTok, GitHub | to run |

## Palette

Warm paper and copper (brown-trout colours), light and dark themes in
`design/tokens*.json`, **0 WCAG AA failures** in either (`contrast.py`). The
originals' brand colours were not measured (no screenshots of their apps were
taken), so `brand.json` lists none and the sweep checks names and domains only.

## Logo brief

- Idea: two currents meeting at a seam, with a dot where the fish holds.
  Reads as water first, as a fish second.
- Mark: symbol in a rounded square, wordmark set in the system UI font.
- Current draft: `public/icons/icon.svg` (placeholder made for this build, good
  enough for a PWA; commission a proper one before a store launch).
- Must work at 16 px and 1024 px; maskable version keeps the art in the
  central 80%.
- Must not resemble either original's mark: no brain, no route line, no map
  pin, no their colour pairs.

## Voice

Plain, outdoorsy, straight. Like a friend at the fly shop who doesn't upsell.

- Say what the data is and where it's from ("From OpenStreetMap. Not verified
  public access."), never oversell it.
- Short sentences, US spelling, real units (cfs, °F, inHg by default).
- Never nag: no rating prompts, no streaks, no "go Pro".
- Be honest about guesses: the bite score is "a rule of thumb, not a
  prediction".
- Safety beats engagement: "Trout are stressed. Consider fishing another day."

## Sweep

`python3 replica-brand/sweep.py . --config replica/brand.json` → **Clean**
(2026-10-14). One hit was found and fixed first: a code comment naming an
original app.
