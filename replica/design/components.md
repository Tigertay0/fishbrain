# Components: Tailout

Tokens: `tokens.json` (light), `tokens.dark.json` (dark), emitted to
`src/styles/tokens.css` by `scripts/tokens.mjs`. Icons: Lucide (ISC). Font:
the platform's system UI font (no licensed or downloaded font, nothing to
fetch offline).

```
Button
  variants  primary (accent), secondary (raised + border), ghost, danger
  sizes     md 44px (default, the outdoor touch target), sm 36px
  states    default, hover, active, focus-visible (2px ring, focus), disabled, busy
  tokens    bg accent, text on-accent, radius md, font sm/600
  a11y      real <button>; busy keeps the label and sets aria-busy
  used on   S03, S04, S06, S08, S10, S12

IconButton
  variants  floating (raised, shadow pop, 44px round), plain
  states    default, pressed (aria-pressed), focus-visible
  a11y      aria-label always set
  used on   S01 (layers, locate, add marker), sheets (close)

Sheet
  variants  peek (auto height, max 70vh), full (screen, on small viewports)
  states    open, scrolled
  tokens    bg raised, radius lg top corners, shadow pop
  a11y      <section aria-labelledby>, Escape closes, focus moves to its heading on open
  used on   S02, S03, S04, S10, place details

TabBar
  items     Map, Forecast, Log (raised center action), Logbook, More
  states    active (aria-current="page"), focus-visible
  tokens    bg raised, border top, active text accent
  used on   every screen

StatTile
  variants  neutral, good (success), caution (warning), bad (danger), cold
  parts     label (xs muted), value (lg/600), hint (xs)
  states    loading (skeleton), empty ("—" + reason)
  used on   S04, S05, S08, S09

Chip / Segmented
  variants  filter chip (toggle), segmented control (single select, radio group)
  states    on, off, focus-visible, disabled
  a11y      segmented = role radiogroup with real radio inputs
  used on   S02, S06, S07, S10, S12

Field
  variants  text, number + unit suffix, textarea, datalist combobox, datetime-local, file
  states    default, focus, invalid (danger border + message), disabled
  a11y      <label for>, error text tied with aria-describedby
  used on   S06, S10, S12, S13

Sparkline
  parts     line (accent or water), min/max labels, last value dot
  states    loading, empty ("no data in the last 7 days"), error
  a11y      role img + aria-label summarising min, max, latest
  used on   S04

ActivityBars
  parts     24 hourly bars (score 0–100), now marker, shaded major/minor windows
  a11y      a table alternative listed below the chart
  used on   S05

CatchCard
  parts     thumbnail (or species initial), species, size, date, water, privacy icon
  states    no photo, hidden location
  used on   S07

EmptyState
  parts     icon, one line, one action
  used on   S07, S09, gauge history

Toast
  variants  info, error
  a11y      role status (info) / alert (error), auto-dismiss 4 s
