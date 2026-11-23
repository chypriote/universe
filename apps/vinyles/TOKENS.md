# Vinyles tokens: "Wall"

Vinyles is a Showcase theme. Core tokens, semantic bindings and the contrast table: [packages/showcase/TOKENS.md](../../packages/showcase/TOKENS.md). Values in code: [src/app.css](src/app.css). This file lists only what Vinyles adds.

## Theme slots

| Slot | Value | Notes |
|---|---|---|
| `--theme-page` | cream.100 #fff3df | |
| `--theme-line` | cream.200 #f0dfc2 | |
| `--theme-ink-dark` | cream.50 #fff3e2 | |
| `--theme-accent` | coral.500 #ff5a4e / coral.400 #ff6f63 | Active tab |
| `--theme-icon-accent` | #f5523f / coral.400 #ff6f63 | Desire dots, title dot |
| `--theme-selected`, `-foreground` | sun.400, navy.800 | Pressed desire filter |
| Display face | Nunito (Showcase default) | |
| `--tracking-heading-value` | -0.025em | |
| `--heading-page-size` | 24px | |
| `--heading-popup-size` | 22px | |
| `--popup-width-max` | 420px | Login, confirm |
| `--shadow-popup` | 0 10px 0 shadow, 0 14px 34px rgb(26 47 107 / .3) (dark: rgb(0 0 0 / .5)) | |

## Type roles

| Token | Size / weight | Color |
|---|---|---|
| text.caption.album | 12 / 800 | text.primary |
| text.caption.artist | 11 / 500 | text.muted |

## Component tokens

| Token | Value | Scope |
|---|---|---|
| cover.radius | radius.md | Cover |
| cover.tile.bg | bg.highlight, bg.success, bg.info, bg.accent (in this order) | Initials tile, picked by artist |
| cover.tile.text | text.on-accent | Initials tile, 5.5:1 or more on all four |
| popup.cover.size | 150px | Popup |
| popup.cover.size.large | 280px | Collection record Popup |
