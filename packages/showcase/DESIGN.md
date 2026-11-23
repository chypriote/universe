# Showcase design system

The shared design language of every collection app in Universe. An app is a packed wall of square tiles (the things Nico owns or wants), a sticky bar to search and filter it, and popups for details and forms. Each app keeps the same structure, shapes and controls, and brings its own page tint, accent and display face.

Decided by Nico on 2026-11-23. Tokens: [TOKENS.md](TOKENS.md). Components: [COMPONENTS.md](COMPONENTS.md).

## 1. Theme

**Theme statement:** happy, round, packed.

**Dials:** Creativity=Balanced, Density=Packed, Variance=Uniform, Motion=Static (hover tilt only).

## 2. What is shared, what an app sets

| Shared by every app (Showcase)                               | Set by each app (its theme)                                     |
| ------------------------------------------------------------ | --------------------------------------------------------------- |
| Navy neutrals, white surface, dark mode on navy.950          | Light page tint and line colour                                 |
| Muted text #5a6a8e (light), #a3b1d9 (dark)                   | Text colour on the dark page (a near-white of the tint)         |
| Chips: sun, mint, sky; chip text navy.800                    | Accent (active tab, primary button) and icon accent             |
| Error and danger coral, focus ring sky                       | Which colour marks a pressed Toggle (accent by default)         |
| Nunito for all body text, tabular numbers                    | Display face for short labels (Nunito by default) and its style |
| Spacing, radii, offset shadow, motion, breakpoints           | Page and popup title sizes, which depend on the display face    |
| Grid: 3, 5, 7, 8 columns; tiles, popup, sticky bar, controls | Domain components (map, desire dots, forms)                     |

A new app sets every theme slot in its `src/app.css` and lists them in its own DESIGN.md. It passes the contrast table in [TOKENS.md](TOKENS.md) in light and dark.

## 3. Typography

- Body: Nunito 500, 700, 800. Fallback: ui-rounded, system-ui, sans-serif.
- Display: the app's face, for short labels only: page title, popup title, tabs, the main tile caption. Nunito when the app sets none.
- Numbers use tabular-nums.

## 4. Components

- **Tile:** square, 14px radius, raised shadow, on a neutral surface. The thing's picture sits contained on it. The thing's own colour never fills the tile.
- **Popup:** a native-feeling dialog, 28px radius, X at top right; tap outside or Esc closes it. The detail popup opens over the tapped tile, clamped to the screen 16px from each edge, and shows the tile's picture next to the details. Forms (add, edit, Got it, confirm) open centred.
- **StickyBar:** title, chips, tabs, search, filters, sort.
- **Controls:** Button, Chip, Tabs, SearchField, Select, ToggleGroup are pills with the raised shadow and no hard border. Text fields and selects have a 2px field border (WCAG 1.4.11).

## 5. Layout

- Grid: 3 columns on phone, 5 from 640px, 7 from 900px, 8 from 1200px. Gap 8px across, 12px down.
- Gutter: 16px plus safe-area insets. Space values: 8, 12, 16px.
- Every control is at least 44px tall, or has a 44px tap area (`icon-sm`).

## 6. Depth and motion

- Depth is a soft offset shadow (0 3px 0), never a blur. Pressed: shadow 0, down 3px.
- Durations: 80ms (press), 150ms (hover). Easing: cubic-bezier(.2, .8, .2, 1).
- Hover or focus on a tile: lift 3px, tilt -1.5deg. Nothing moves under `prefers-reduced-motion: reduce`.

## 7. Do's and don'ts

### Do

- Use semantic tokens. Never a raw hex or pixel value in component code.
- Use the icon accent for icons and thin marks, not the accent fill.
- Show the 3px focus ring on `:focus-visible`.
- Follow the system theme; `data-theme` overrides it.

### Don't

- Never use purple, hard borders on pills, mono type or the muted cream look.
- Never fill a tile with the thing's colour, or put a number or sticker on a tile.
- Never let the page scroll sideways.

## 8. Voice

- Names come from each app's GLOSSARY.md.
- Labels are short and plain: "Got it", "Drop", "Add", "Save", "Cancel", "Delete".
- No "owner only" text in the UI.

## 9. Agent prompt guide

- UI that two apps use goes in this package. An app keeps only its theme and domain components.
- Use a component from [COMPONENTS.md](COMPONENTS.md) before you propose one. A new shared component goes into COMPONENTS.md first.
- A difference between apps is a theme slot (a CSS variable the app sets) or a prop, never a copy of the component.
