# Aviary design language: "Parakeet"

Theme: happy, round, green. A packed wall of square tiles. A theme of [Showcase](../../packages/showcase/DESIGN.md), the shared design system: Showcase sets the structure, shapes and controls; Aviary sets its palette and domain components. Dials: Creativity=Balanced, Density=Packed, Variance=Uniform, Motion=Static (hover tilt only).

Aviary is private: every page is behind the Owner login. It has no Viewer, no "Log in" link and no read-only view. Every displayed word is read at runtime from the private `labels` table; the code name shows when a label is missing. Nothing in this repository holds a real word.

## Color tokens

| Token | Light | Dark |
|---|---|---|
| bg (page) | #eef9dc | #101a3a |
| line | #d6ecb6 | #2a3a6e |
| ink | #1a2f6b | #eef9dc |
| accent | #8fd14f | #a3e05f |
| icon accent | #3f7d0e | #a3e05f |
| on-accent | #101a3a | #101a3a |

- Pressed Toggle: the accent. The Nest flag colour stays sun.
- Every pair of the Showcase contrast table passes in light and dark (checked by `src/lib/theme.test.ts`). Tiers: [TOKENS.md](TOKENS.md).
- Follow the system theme. `data-theme` overrides it.

## Type

Display face: Lilita One at weight 400, never a faux bold (`font-synthesis-weight: none`). Body: Nunito, as in Showcase.

| Role | Size | Tracking |
|---|---|---|
| Page title | 28px | 0 |
| Popup title | 24px | 0 |
| Labels (tabs) | Showcase | 0.02em |
| Tile caption | Showcase | 0.02em |

## Login page

A bare password form titled "Log in", with a generic page title. Static parakeets peek up from the bottom edge: five on desktop; on a phone three, smaller, in the flow below the form so they never cover it. Inline SVG, colours from CSS variables, wing and beak checked on the dark page.

## Not decided

Tile, Popup and form looks come with the slices that build them: see [COMPONENTS.md](COMPONENTS.md).
