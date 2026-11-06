---
name: Personal Command Center
description: A dark, glanceable morning instrument panel for weather, snow, drive times, markets, news and video.
colors:
  ink-black: "#0b0c0f"
  graphite-surface: "#14161b"
  raised-graphite: "#1b1e25"
  hairline-slate: "#262a33"
  frost-white: "#ecedef"
  pewter-muted: "#8b909c"
  ash-faint: "#5b606b"
  signal-blue: "#6ea8fe"
  gain-green: "#3ecf8e"
  loss-coral: "#f4685b"
  amber-caution: "#f5b84a"
  powder-cyan: "#8fd3ff"
  paper-bg-light: "#f5f6f8"
  white-surface-light: "#ffffff"
  mist-surface-light: "#f0f1f4"
  hairline-light: "#e1e4ea"
  ink-fg-light: "#14161b"
  slate-muted-light: "#5f6573"
  silver-faint-light: "#9aa0ad"
  signal-blue-light: "#2563eb"
  gain-green-light: "#12875a"
  loss-red-light: "#d23a2d"
  amber-caution-light: "#b7791f"
  powder-cyan-light: "#1b84c4"
typography:
  display:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  readout:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.025em"
    fontFeature: "tnum"
  clock:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "1.5rem"
    fontWeight: 500
    lineHeight: 1
    fontFeature: "tnum"
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.43
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.375
    fontFeature: "tnum"
  meta:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.33
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.025em"
  micro:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.625rem"
    fontWeight: 400
    lineHeight: 1.4
    fontFeature: "tnum"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "32px"
components:
  widget-panel:
    backgroundColor: "{colors.graphite-surface}"
    textColor: "{colors.frost-white}"
    rounded: "{rounded.xl}"
    padding: "20px"
  inner-card:
    backgroundColor: "{colors.raised-graphite}"
    textColor: "{colors.frost-white}"
    rounded: "{rounded.lg}"
    padding: "16px"
  stat-tile:
    backgroundColor: "{colors.raised-graphite}"
    textColor: "{colors.frost-white}"
    rounded: "{rounded.md}"
    padding: "12px"
  icon-button:
    backgroundColor: "transparent"
    textColor: "{colors.pewter-muted}"
    rounded: "{rounded.md}"
    padding: "8px"
  icon-button-hover:
    backgroundColor: "{colors.raised-graphite}"
    textColor: "{colors.frost-white}"
  segmented-option:
    backgroundColor: "transparent"
    textColor: "{colors.pewter-muted}"
    typography: "{typography.meta}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
  segmented-option-active:
    backgroundColor: "{colors.raised-graphite}"
    textColor: "{colors.frost-white}"
  filter-chip:
    backgroundColor: "{colors.raised-graphite}"
    textColor: "{colors.pewter-muted}"
    typography: "{typography.meta}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  filter-chip-active:
    backgroundColor: "{colors.frost-white}"
    textColor: "{colors.ink-black}"
  link-pill:
    backgroundColor: "transparent"
    textColor: "{colors.pewter-muted}"
    typography: "{typography.meta}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  text-input:
    backgroundColor: "transparent"
    textColor: "{colors.frost-white}"
    typography: "{typography.meta}"
    rounded: "{rounded.md}"
    padding: "4px 8px"
  status-badge-powder:
    backgroundColor: "{colors.signal-blue}"
    textColor: "{colors.signal-blue}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
---

# Design System: Personal Command Center

## Overview

**Creative North Star: "The Morning Instrument Panel"**

The Command Center is read the way a pilot reads a cluster of gauges: in quick looks, from a little distance, trusting that every needle is labeled and current. The page is a near-black field of graphite panels, each one a self-contained instrument with its own title, source, update time and refresh control. Numbers are the content, set in Geist Mono with tabular figures so columns hold still as values tick over through the day.

The system is refined and restrained. Panels are separated by hairline borders and one step of tonal lift, not by shadows. Color is almost absent from the chrome and is reserved for meaning: blue for interaction and the Front Range, cyan for snow and forecasts, green and coral for gains and losses, amber for caution and stale data. Density is high but ordered; a 1500px desktop column fits weather for eight places, four resorts, markets, drive times, news and video without crowding, because hierarchy comes from size and weight, not decoration.

Honesty is a visual concern here. Model estimates, forecasts and observations are distinguished by color and by label in the same glance, and degraded states (stale, needs setup, error) have their own calm, tinted treatments rather than disappearing.

**Key Characteristics:**
- Dark by default (ink black field, graphite panels), with a full light theme swapped through the same token names.
- Tabular, monospaced numerals for every reading; sans for words.
- Flat, tonal layering: border plus one surface step; shadows only on floating menus.
- Semantic-only color; neutral chrome.
- Every panel shows source and "Updated" time in quiet meta text.
- Small, subtle motion: content fades up 4px, skeletons shimmer, refresh icons spin.

## Colors

A cool graphite neutral ramp carries the page; six saturated signal hues appear only where they mean something. Each token has a light-theme twin (suffixed `-light`) applied via `data-theme="light"`; components always use the role name, never a raw value.

### Primary
- **Signal Blue** (dark `signal-blue`, light `signal-blue-light`): The one interaction color. Hover state for links and headlines, focus border on inputs, accent on widget icons, the "today" marker on snow charts, Front Range bars in the temperature comparison, and the Powder Alert badge.

### Secondary
- **Powder Cyan** (`powder-cyan` / `powder-cyan-light`): Snow and the future. Forecast snowfall values and bars, precipitation chances, mountain-region bars, the Ski & snow icon, and the "best snow" resort highlight.

### Tertiary (semantic status)
- **Gain Green** (`gain-green` / `gain-green-light`): Positive market moves, "US market open" pill, "no delay" drive times.
- **Loss Coral** (`loss-coral` / `loss-red-light`): Negative market moves, severe NWS alerts, widget error states, heavy traffic (+15 min), YouTube icon, remove-hover.
- **Amber Caution** (`amber-caution` / `amber-caution-light`): Stale-data banners, "setup needed" key icon, non-severe NWS alerts, moderate traffic, partial feed failures.

### Neutral
- **Ink Black** (`ink-black` / `paper-bg-light`): Page background.
- **Graphite Surface** (`graphite-surface` / `white-surface-light`): Widget panels, settings menu, detail modal.
- **Raised Graphite** (`raised-graphite` / `mist-surface-light`): One step up: inner cards (often at 40–60% opacity), stat tiles, hover fills, inactive chips, track backgrounds for bars.
- **Hairline Slate** (`hairline-slate` / `hairline-light`): Every border and divider; also the skeleton shimmer highlight and scrollbar thumb.
- **Frost White** (`frost-white` / `ink-fg-light`): Primary text and readings; inverted as the active-chip fill.
- **Pewter Muted** (`pewter-muted` / `slate-muted-light`): Secondary text, meta lines, inactive controls, section labels.
- **Ash Faint** (`ash-faint` / `silver-faint-light`): Tertiary text: footnotes, micro timestamps, briefing labels, past-snow bars.

### Named Rules
**The Meaning-Only Color Rule.** Chrome is neutral. A hue appears only to say something (interactive, snow/forecast, up, down, caution). If a colored element can't name what it means, it goes neutral.

**The Estimate Is Not Measurement Rule.** Past snowfall is model estimate and renders in Ash Faint at 70% opacity; forecast renders in Powder Cyan. The two must never share a color, and each carries a text label ("model estimate", "forecast").

**The Tint, Don't Fill Rule.** Status surfaces use the status hue at 10% fill with a 40–50% border (`warn/10` + `warn/40`, `down/10` + `down/40`). Solid status fills are not used.

## Typography

**Body Font:** Geist Sans (with system-ui, sans-serif)
**Numeric Font:** Geist Mono (with ui-monospace, monospace), applied through the `.num` class
**Character:** A neutral grotesk for words and a matching mono for readings; the pairing reads like a precision instrument face. Tabular numerals are on globally (`font-variant-numeric: tabular-nums` on body).

### Hierarchy
- **Display** (600, 30px at ≥640px / 24px below, tight tracking): The greeting ("Good morning, Brian"). Appears once.
- **Readout** (Mono 600, 36px, tight): The hero number on weather location cards (current temperature).
- **Clock** (Mono 500, 24px, line-height 1): The live Mountain Time clock in the header.
- **Title** (600, 14px, tight tracking): Widget titles and resort names, paired with a 16px icon.
- **Body** (400–500, 14px): Headlines, briefing lines, list rows, drive destinations.
- **Meta** (400, 12px): Source · Updated lines, secondary row details, chips and segmented controls.
- **Label** (500, 11px, +0.025em, UPPERCASE): Section labels ("Temperature comparison · now", "Past · model estimate", briefing keys).
- **Micro** (Mono 400, 10px): Per-quote timestamps, day-range ends, snow cell headers, video duration.

### Named Rules
**The Mono for Numbers Rule.** Any value a user reads as a measurement (temperature, inches, price, percent, time, minutes) is set in the `.num` mono face. Words stay in sans.

**The Quiet Provenance Rule.** Source and time labels are always present but always small (12px or less) and muted; they must stay legible, never louder than the reading they describe.

## Layout

A single centered column, max 1500px, with 16 / 24 / 32px side padding at base / 640px / 1024px. Vertical rhythm between top-level blocks is 20px (`space-y-5`, `gap-5`).

Order is fixed: header (greeting + date left, clock + theme + settings right), Daily briefing strip, then a two-column grid at ≥1280px. Weather, Ski & snow and YouTube span both columns; News sits left, with Markets and Drive stacked right. Below 1280px everything is one column.

Inside panels, grids step up by breakpoint: weather location cards 1 → 2 (640px) → 4 (1280px); resort cards 1 → 2 (1024px); briefing 1 → 2 → 3; video grid 1 → 2 → 4; index tiles 2 → 4. Inner card gaps are 12px; panel padding is 16px, 20px from 640px. Wide charts (24-hour forecast) scroll horizontally with a 560px minimum instead of squashing.

On phones, the header meta line ("Source · Updated") drops below the widget title, the detail view becomes a bottom sheet, and watchlist rows collapse to symbol · price · change.

## Elevation & Depth

The system is flat and tonal. Depth comes from one surface step (Ink Black page → Graphite Surface panel → Raised Graphite inner card) plus a 1px Hairline Slate border at every level. Resting panels and cards carry no shadow.

### Shadow Vocabulary
- **Floating menu** (Tailwind `shadow-xl`: `0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`): Only the settings dropdown, which overlaps other content.
- **Modal scrim** (`rgb(0 0 0 / 0.6)` backdrop): Behind the weather detail sheet.

### Named Rules
**The Flat-At-Rest Rule.** Nothing that sits in the page flow casts a shadow. Only a surface that floats above other content (menu, modal) earns elevation.

**The Hover Is a Border Rule.** Clickable cards respond by shifting the border to Signal Blue at 60% and lifting the fill one tonal step, never by lifting off the page.

## Shapes

Soft, consistent rounding that steps down as surfaces nest: outer panels 16px, inner cards and menus 12px, stat tiles, inputs and link pills 8px, segmented-control options and small icon buttons 6px. Chips, pills, status badges, bar tracks and legend dots are fully rounded. Chart bars use a 2px corner. Borders are always 1px hairlines; there are no thick rules or accent stripes.

## Components

### Widget Panel (signature)
The instrument housing every data source shares.
- **Shape:** 16px corners, 1px Hairline Slate border, Graphite Surface fill, 16/20px padding.
- **Header:** Title (14px semibold) with a 16px semantic-colored icon on the left; on the right, "Source · Updated 9:24 PM" in muted meta, optional actions, and a refresh icon button whose glyph spins while revalidating.
- **States:** Shimmer skeleton (6px-rounded bars) while loading; coral-tinted error box; amber "Setup needed" box with a key icon on Raised Graphite; centered inbox-icon empty line; amber stale banner above content ("Refresh failed — showing older data from…"); optional faint footnote below.
- **Motion:** Loaded content fades in and rises 4px over 250ms ease-out.

### Buttons
- **Icon button:** Transparent, Pewter Muted glyph (14–16px), 6–8px corners; hover fills Raised Graphite and brightens to Frost White. Header variants add a hairline border.
- **Segmented control:** Hairline-bordered 8px group with 2px inset; options are 6px-rounded meta text; active option fills Raised Graphite with Frost White text.
- **Link pill:** Hairline-bordered, muted meta text with a trailing external-link glyph; hover turns the border Signal Blue at 60% and text Frost White. Used for every off-site source (OpenSnow, resort pages).

### Chips
- **Style:** Fully rounded, Raised Graphite fill, Pewter Muted meta text, 12px horizontal padding.
- **State:** Active chip inverts to Frost White fill with Ink Black text. Removable chips carry a 50%-opacity × that brightens on hover.

### Cards / Containers
- **Inner card:** 12px corners, hairline border, Raised Graphite at 40–60% opacity, 16px padding. Clickable variants (weather locations) use the Hover Is a Border rule.
- **Highlighted card:** "Best snow" resort uses a Powder Cyan border at 60% and a 5% cyan wash.
- **Stat tile:** 8px corners, Raised Graphite at 60%, 12px padding, muted label over a mono reading.
- **Status banner / alert:** Tinted per the Tint, Don't Fill rule; NWS alerts are expandable `<details>` rows with a triangle icon.

### Inputs / Fields
- **Style:** Transparent fill, hairline border, 8px corners (fully rounded inside chip rows), 12px meta text; ticker input uses mono uppercase.
- **Focus:** Border shifts to Signal Blue; no glow ring.

### Navigation
There is no app navigation. The header is the only chrome: display greeting and date, live mono clock with "Mountain Time" caption, a bordered theme toggle (sun/moon) and a bordered settings button opening a 12px-rounded floating menu (uppercase "Preferences" label, Export/Import JSON rows).

### Data Marks
- **Comparison bars:** 8px fully rounded tracks in Raised Graphite; fill is Signal Blue (Front Range) or Powder Cyan (mountains); bars start at or below 0°F so lengths aren't exaggerated.
- **Snow bars:** 14-day SVG bars, past in Ash Faint at 70%, forecast in Powder Cyan, today framed by a dashed Signal Blue outline.
- **Day-range track:** 6px track with a 10px Frost White dot marking the current price.
- **Status pill:** Fully rounded 11px pill with a 6px dot (green when the market is open, faint when closed).

## Do's and Don'ts

### Do:
- **Do** put every reading in the `.num` mono face with tabular figures.
- **Do** give every new widget the Widget Panel housing, including source, Updated time, refresh, and all five non-happy states.
- **Do** label estimates and forecasts in text and color (Ash Faint "model estimate" vs Powder Cyan "forecast").
- **Do** use role tokens (`bg-surface`, `text-muted`, `border-line`) so both themes work without extra code.
- **Do** separate surfaces with a 1px hairline plus one tonal step; nest radii 16 → 12 → 8 → 6px.
- **Do** keep motion to 250ms fades, shimmer skeletons and spinning refresh glyphs.

### Don't:
- **Don't** add shadows to panels or cards in the page flow; only floating menus and modals get elevation.
- **Don't** use color decoratively; a hue that doesn't mean interactive, snow/forecast, up, down or caution doesn't belong.
- **Don't** fill status surfaces with solid color; tint at 10% with a 40–50% border.
- **Don't** let provenance text (source, time, footnotes) grow louder than 12px or brighter than Pewter Muted.
- **Don't** render past model estimates and forecasts in the same color.
- **Don't** hard-code hex values in components; light mode depends on the CSS variables.
