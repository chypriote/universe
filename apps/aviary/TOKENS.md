# Aviary tokens: "Parakeet"

Aviary is a Showcase theme. Core tokens, semantic bindings and the contrast table: [packages/showcase/TOKENS.md](../../packages/showcase/TOKENS.md). Values in code: [src/app.css](src/app.css). This file lists only what Aviary adds.

## Theme slots

| Slot | Value | Notes |
|---|---|---|
| `--theme-page` | lime.50 #eef9dc | |
| `--theme-line` | lime.200 #d6ecb6 | |
| `--theme-ink-dark` | lime.50 #eef9dc | |
| `--theme-accent` | lime.500 #8fd14f / lime.400 #a3e05f | Active tab |
| `--theme-icon-accent` | lime.700 #3f7d0e / lime.400 #a3e05f | Title dot |
| `--theme-selected`, `-foreground` | accent (default) | Pressed Toggle |
| `--popup-picture-size` | 150px (Showcase default) | Popup media column, at most 40% of the Popup |
| `--display-family` | Lilita One, then Nunito | Weight 400, no faux bold |
| `--tracking-label-value` | 0.02em | |
| `--tracking-caption-value` | 0.02em | |
| `--tracking-heading-value` | 0 | |
| `--heading-page-size` | 28px | |
| `--heading-popup-size` | 24px | |

## Contrast

All pairs of the Showcase table pass in light and dark with these slots. Light: icon.accent on page 4.63, on-accent on accent 9.26, text.muted 4.94. Dark: on-accent on accent 10.87, icon.accent on page 10.87.

## Component tokens

| Token | Value | Scope |
|---|---|---|
| parakeet.body | accent (light-dark) | Login art |
| parakeet.outline | icon accent (light-dark) | Login art, 3:1 or more on the page |
| parakeet.wing | lime.800 #2f6209 / lime.700 #3f7d0e | Login art, 3:1 or more on the body |
| parakeet.beak | navy.800 / navy.950 | Login art, beak and eye, 3:1 or more on the body |
| flag.seen | color.info (sky.400) | BirdTile flag icon |
| flag.flown | color.success (mint.400) | BirdTile flag icon |
| flag.lost | color.destructive (coral.600 / coral.400) | BirdTile flag icon |
| flag.nest | color.highlight (sun.400) | BirdTile flag icon |
| flag.shadow | 0 1px 3px rgb(0 0 0 / .55) | BirdTile flag icons, so they read on any picture |
| tile.initials.bg | bg.highlight, bg.success, bg.info, bg.accent (in this order) | Initials square, picked by name |
| tile.initials.text | text.on-accent | Initials square |
| picture.first.outline | icon.accent, 2px | PictureList, the first Picture (the tile Picture) |
