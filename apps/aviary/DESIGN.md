# Aviary design language: "Parakeet"

Theme: happy, round, green. A packed wall of square tiles. A theme of [Showcase](../../packages/showcase/DESIGN.md), the shared design system: Showcase sets the structure, shapes and controls; Aviary sets its palette and domain components. Dials: Creativity=Balanced, Density=Packed, Variance=Uniform, Motion=Static (hover tilt only).

Aviary is private: every page is behind the Owner login. It has no Viewer, no "Log in" link and no read-only view. Every displayed word is read at runtime from the private `labels` table; the code name shows when a label is missing. Nothing in this repository holds a real word.

## Color tokens

Only what differs from Showcase. Surface, muted, chips and the focus ring are the Showcase values.

| Token | Light | Dark |
|---|---|---|
| bg (page) | #eef9dc | #101a3a |
| line | #d6ecb6 | #2a3a6e |
| ink | #1a2f6b | #eef9dc |
| accent (lime) | #8fd14f | #a3e05f |
| icon accent | #3f7d0e | #a3e05f |
| on-accent | #101a3a | #101a3a |

- Pressed Toggle: the accent.
- Flag icons on a tile: Seen sky, Flown mint, Lost coral, Nest sun. Roosted has no icon.
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

## Layout

- Sticky bar: title, tabs (Flock, Aloft, Grounded, Seen), search on the name, Habitat and Songs selects, then Seen (all, only, not) on Aloft and Grounded, or Nest (all, only, not) and Roosted (all, only) on Seen, the "+" AddAction and the Admin link.
- Above the Seen select (the Nest select on the Seen tab): a sun Chip with the number of Birds shown in the tab, after search and filters.
- Caption under each tile: name, then the Arrival as a day, a month or a year.
- Tiles are sorted by Arrival, newest first; Birds with no Arrival come last.

## Components

- **Tile:** a square Picture that fills the tile, or the initials on a tinted square. Flag icons top left with a soft shadow and no circle. Roosted is never shown on a tile.
- **Popup:** Pictures as squares in the media column on the left (a thumbnail row when there are several). Right: name, Habitat and Arrival, flags and Songs as read-only tags with no section labels, Sightings, notes.
- **Forms:** one Bird form for Add and Edit. Habitat and Songs are picked, never typed; new values live on the Admin page.
- **Archive:** the Edit form has a danger Archive Button left of Save. An Archived Bird leaves every tab, filter and search, and shows only, marked, in similar names while a name is typed.
- **Admin:** the Habitat and Songs lists, then the Archived Birds. A value in use is removed only after another value is picked and every Bird moves to it. An Archived Bird is restored at once, or deleted for good after a confirm that says its Pictures and Sightings go too. This is the only delete of a Bird.

## Login page

A bare password form titled "Log in", with a generic page title. Static parakeets peek up from the bottom edge: five on desktop; on a phone three, smaller, in the flow below the form so they never cover it. Inline SVG, colours from CSS variables, wing and beak checked on the dark page.

## Don't

- Never put a real word, picture or link in code, tests or fixtures: code names only.
- Never add an Open Graph or Twitter tag, or a public picture URL.
- Never fake a bold on the display face.

Component details: [COMPONENTS.md](COMPONENTS.md).
