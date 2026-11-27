# Aviary components: "Parakeet"

Sources: [DESIGN.md](DESIGN.md) for the look, [TOKENS.md](TOKENS.md) for values, [GLOSSARY.md](GLOSSARY.md) for names. Components use only semantic or component tokens.

Shared components (StickyBar, EmptyState, Field, Button, Popup, TileGrid and the rest) live in Showcase: [packages/showcase/COMPONENTS.md](../../packages/showcase/COMPONENTS.md). This file lists only what is specific to Aviary.

## Hierarchy

| Level | Components |
| --- | --- |
| Pattern | Parakeets (login art) |

BirdTile, the Popup media column, BirdForm, SightingList, SimilarNames and the Admin lists are named in the spec (#278) and described here when their slices land.

## Parakeets

**Hierarchy:** Pattern
**Purpose:** The decorative art of the login page: static parakeets peeking up from the bottom edge.

No props. Five inline SVG parakeets, every second one mirrored, colours from the `parakeet.*` tokens. Below `sm`: three, smaller. The art is in the page flow under the form, so it never covers it. `aria-hidden`, no pointer events, no data.

### States

Static.

## Pages in this slice

- **Login:** `h1` "Log in", Field "Password", Button `success` "Log in", Parakeets. A wrong password shows the Field error. After login the Owner returns to the page in `next`.
- **Aloft:** StickyBar (title from the app label, one tab) and the Showcase EmptyState. No login link, no Viewer branch.
