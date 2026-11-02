# Design

World: a printed chart book. The chart sits on graph paper; ink, graphite and red pencil do the marking. The interface around it stays a plain, standard web tool.

## Color

Restrained: tinted neutrals plus state and series colours that each do one job. Tokens live in `src/styles.css` (`@theme`, with a `prefers-color-scheme: dark` override on `:root`). All values are 6-digit hex because the chart appends alpha.

| Token | Light | Dark | Job |
|---|---|---|---|
| bg | #eef2ec | #0e1613 | page ground (cool paper, never cream) |
| surface | #f8faf6 | #131d19 | panels, chart paper |
| raised | #e4ebe2 | #1a2621 | pressed toggles, quiet fills |
| fg | #16213a | #e5eee7 | blue-black ink: text, primary button, active tab |
| muted | #4f5b73 | #a3b5aa | secondary text, labels |
| pencil | #5d636c | #9aa29d | guides, crosshair, volume swatch |
| up / down | #1c7348 / #c0392b | #4cc38a / #f06b5a | outcomes, candles, hit/miss |
| sma / ema | #1f4fa3 / #a65f00 | #8fb0ff / #f0a64a | indicator lines and their toggle swatches |
| border, grid, grid-major | #c6d4c4, #d9e5d6, #b9cfb8 | #2a3a33, #1a2723, #24372f | rules and the printed grid |

## Type

Archivo (Google Fonts, `wdth 62–125`, `wght 400–700`). Headings bold at `font-stretch: 88%`; `.label` is 12px, 85% width, semibold, muted. Tabular numerals everywhere (`tnum` on body). Scale: 12 / 14 / 16 / 18 / 20 / 24–30.

## Shape and space

Radius 4–8px (`rounded-md`, `rounded-lg`); no shadows — panels separate by 1px borders on the paper ground. Spacing on a 4px step; panels pad 16–20px.

## Components

- Deck switch: segmented tabs, active tab is solid ink.
- Indicator toggles: bordered buttons with `aria-pressed` and a 14px line swatch in the series colour.
- Call buttons: full-width rows with a tinted icon square, label + hint, keyboard hint (`↑ ↓ N`) on desktop.
- Primary action: solid ink button.
- Tally: last 20 calls as 14px boxes — filled green for a hit, red cross for a miss, empty border when unplayed.

## Chart

lightweight-charts on a transparent background over `.graph-paper` (8px minor, 40px major grid; used only under charts). Up candles hollow green, down candles filled red. Call marker is an ink arrow. Guides are dashed pencil.

## Motion

One authored moment: on reveal the hidden candles are plotted left to right over 900ms (ease-out cubic), then the verdict word is circled in pencil (stroke draw, 520ms, after 850ms). Reduced motion shows the final state immediately.
