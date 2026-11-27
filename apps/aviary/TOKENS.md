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
| `--display-family` | Lilita One, weight 400 | No faux bold |
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
