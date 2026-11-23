# Jerseys tokens: "Kit wall"

Jerseys is a Showcase theme. Core tokens, semantic bindings and the contrast table: [packages/showcase/TOKENS.md](../../packages/showcase/TOKENS.md). Values in code: [src/app.css](src/app.css). This file lists only what Jerseys adds.

## Theme slots

| Slot | Value | Notes |
|---|---|---|
| `--theme-page` | sky.50 #eef6ff | |
| `--theme-line` | sky.100 #d6e4f7 | |
| `--theme-ink-dark` | sky.50 #eef6ff | |
| `--theme-accent` | green.500 #1fbf75 / green.400 #3fd68c | Fill only: 2.2:1 on the light page |
| `--theme-icon-accent` | green.700 #108a52 / green.400 #3fd68c | Covered Country, icons |
| `--display-family` | "Barlow Condensed", "Arial Narrow", system-ui, sans-serif | 700 and 800 |
| `--display-style`, `--display-transform` | italic, uppercase | |
| `--tracking-label-value` | 0.03em | Tab labels |
| `--heading-page-size` | 28px | |
| `--heading-popup-size` | 24px | |
| `--popup-width-max` | 560px | |

## Type roles

| Token | Family | Size / weight | Line height | Style |
|---|---|---|---|---|
| text.caption.team | display | 14 / 800 | 1.25 | italic, uppercase, +0.02em (`tracking-caption`) |
| text.caption.kit | base | 11 / 500 | 1.25 | muted |
| text.tile.number | display | 26 / 800 | 1 | italic |

## Component tokens

| Token | Value | Scope |
|---|---|---|
| tile.placeholder | text.muted | Shirt outline when the Kit has no Main Picture |
| map.country.covered | icon.accent | CoverageMap |
| map.country.empty | sky.200 #c9daf1 (light), navy.500 #3a4d88 (dark) | Country of the app with no Jersey |
| map.country.absent | border.subtle | Land that is not a Country of the app |
| map.country.border | bg.surface, 0.5px | CoverageMap |
| map.width.min | 900px | CoverageMap drawing |

## Contrast

| Pair | Light | Dark | Needs |
|---|---|---|---|
| map.country.covered on map.country.empty | 3.09 | 4.32 | 3 (non-text) |
