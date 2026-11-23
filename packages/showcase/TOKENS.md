# Showcase tokens

Source of truth: [DESIGN.md](DESIGN.md). Code: [src/showcase.css](src/showcase.css). Tiers: Primitive → Semantic → Component. Component code uses only semantic or component tokens.

Light and dark swap the semantic → primitive bindings with `light-dark()`. The system theme picks the mode; `data-theme` overrides it.

## Primitives

### Color

| Token             | Value                |
| ----------------- | -------------------- |
| color.white       | #ffffff              |
| color.navy.300    | #a3b1d9              |
| color.navy.600    | #5a6a8e              |
| color.navy.700    | #2a3a6e              |
| color.navy.800    | #1a2f6b              |
| color.navy.900    | #19254d              |
| color.navy.950    | #101a3a              |
| color.sky.400     | #5aa9ff              |
| color.sky.600     | #258dff              |
| color.sun.400     | #ffc83d              |
| color.mint.400    | #34d3a0              |
| color.coral.400   | #ff6f63              |
| color.coral.600   | #c9342a              |
| color.scrim       | rgb(10 18 50 / .75)  |
| color.shadow      | rgb(26 47 107 / .12) |
| color.shadow.dark | rgb(0 0 0 / .35)     |

### Type, space, shape, motion, layers

| Token            | Value                                             |
| ---------------- | ------------------------------------------------- |
| font.family.base | Nunito, ui-rounded, system-ui, sans-serif         |
| font.weight      | 500, 700, 800                                     |
| font.size        | 2xs 11px, sm 14px, md 15px                        |
| font.line-height | tight 1.1, snug 1.25, normal 1.45                 |
| space            | 8, 12, 16px                                       |
| radius           | md 14px, xl 28px, full 999px                      |
| shadow.offset.sm | 0 3px 0 {color.shadow}; dark: {color.shadow.dark} |
| duration         | fast 80ms, base 150ms                             |
| easing.out       | cubic-bezier(.2, .8, .2, 1)                       |
| layer            | sticky 10, safe-area 20, popup 30                 |
| breakpoint       | sm 640px, md 900px, lg 1200px                     |

## Theme slots

Each app sets these on `:root` in its `src/app.css`. The defaults only keep a new app readable.

| Slot (CSS variable)                      | What it drives                          | Jerseys                 | Vinyles                     |
| ---------------------------------------- | --------------------------------------- | ----------------------- | --------------------------- |
| `--theme-page`                           | color.bg.page and color.bg.field, light | sky.50 #eef6ff          | cream.100 #fff3df           |
| `--theme-line`                           | color.border.subtle, light              | sky.100 #d6e4f7         | cream.200 #f0dfc2           |
| `--theme-ink-dark`                       | color.text.primary, dark                | sky.50 #eef6ff          | cream.50 #fff3e2            |
| `--theme-accent`                         | color.bg.accent (light-dark)            | green #1fbf75 / #3fd68c | coral #ff5a4e / #ff6f63     |
| `--theme-icon-accent`                    | color.icon.accent (light-dark)          | #108a52 / #3fd68c       | #f5523f / #ff6f63           |
| `--theme-selected`, `-foreground`        | Pressed Toggle                          | accent (default)        | sun, navy.800               |
| `--display-family`                       | font.family.display                     | Barlow Condensed        | Nunito (default)            |
| `--display-style`, `--display-transform` | Display labels                          | italic, uppercase       | normal, none                |
| `--tracking-label-value`                 | Tab label tracking                      | 0.03em                  | 0                           |
| `--tracking-heading-value`               | Title tracking                          | 0                       | -0.025em                    |
| `--heading-page-size`                    | text.heading.page                       | 28px                    | 24px                        |
| `--heading-popup-size`                   | text.heading.popup                      | 24px                    | 22px                        |
| `--popup-width-max`                      | popup.width.max                         | 560px                   | 420px                       |
| `--shadow-popup`                         | Popup shadow                            | none (default)          | offset 10px and a 34px blur |

## Semantic bindings

| Semantic token                    | Light →           | Dark →            | CSS variable                                                            |
| --------------------------------- | ----------------- | ----------------- | ----------------------------------------------------------------------- |
| color.bg.page                     | theme-page        | navy.950          | `--background`                                                          |
| color.bg.surface                  | white             | navy.900          | `--card`                                                                |
| color.bg.field                    | theme-page        | navy.950          | `--field`                                                               |
| color.border.field                | navy.600          | navy.300          | `--field-border`                                                        |
| color.text.primary                | navy.800          | theme-ink-dark    | `--foreground`                                                          |
| color.text.muted                  | navy.600          | navy.300          | `--muted-foreground`                                                    |
| color.border.subtle               | theme-line        | navy.700          | `--border`                                                              |
| color.bg.accent                   | theme-accent      | theme-accent      | `--primary`                                                             |
| color.text.on-accent              | navy.950          | navy.950          | `--primary-foreground`                                                  |
| color.icon.accent                 | theme-icon-accent | theme-icon-accent | `--icon-accent`                                                         |
| color.bg.highlight                | sun.400           | sun.400           | `--highlight`, `--accent`                                               |
| color.bg.success                  | mint.400          | mint.400          | `--success`                                                             |
| color.bg.info                     | sky.400           | sky.400           | `--info`, `--secondary`                                                 |
| color.text.on-chip                | navy.800          | navy.800          | `--accent-foreground`, `--secondary-foreground`, `--success-foreground` |
| color.text.error, color.bg.danger | coral.600         | coral.400         | `--destructive`                                                         |
| color.text.on-danger              | white             | navy.950          | `--destructive-foreground`                                              |
| color.outline.focus               | sky.600           | sky.400           | `--ring`                                                                |
| color.bg.overlay                  | scrim             | scrim             | `--overlay`                                                             |
| radius.control                    | radius.full       | same              | `rounded-control`                                                       |
| shadow.raised                     | shadow.offset.sm  | dark variant      | `--shadow-raised`                                                       |

Type roles: `text.heading.page` and `text.heading.popup` use the display face (`display-type` utility), weight 800, line height tight, at the theme sizes. Body is Nunito 14/500/1.45.

## Component tokens

| Token                 | Value                              | Scope                     |
| --------------------- | ---------------------------------- | ------------------------- |
| control.size.min      | 44px                               | All controls              |
| tile.radius           | radius.md                          | Tile                      |
| tile.hover.lift, tilt | -3px, -1.5deg                      | Tile, motion allowed only |
| popup.radius          | radius.xl                          | Popup                     |
| popup.width.wide      | 672px                              | Form Popup                |
| popup.picture.size    | 150px                              | Popup                     |
| grid.columns          | 3; 5 from sm; 7 from md; 8 from lg | Tile grid                 |

## Contrast (WCAG 2.2 AA)

Every theme must pass these pairs in light and dark. The core pairs pass for both apps:

| Pair                        | Jerseys light | Vinyles light | Needs |
| --------------------------- | ------------- | ------------- | ----- |
| text.muted on bg.page       | 4.96          | 4.92          | 4.5   |
| text.muted on bg.surface    | 5.40          | 5.40          | 4.5   |
| text.on-accent on bg.accent | 7.12          | 5.54          | 4.5   |
| icon.accent on bg.page      | 4.03          | 3.11          | 3     |
| outline.focus on bg.page    | 3.04          | 3.02          | 3     |
| border.field on bg.field    | 4.96          | 4.92          | 3     |
| text.error on bg.page       | 4.81          | 4.77          | 4.5   |

Dark mode, both apps: text.primary on bg.page 15.6, text.muted 8.00, text.error 6.26.

Text on the accent fill is always on-accent. An accent like green.500 is only 2.2:1 on a light page: use it as a fill, never for icons or thin marks.
