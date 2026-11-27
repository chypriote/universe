# Aviary components: "Parakeet"

Sources: [DESIGN.md](DESIGN.md) for the look, [TOKENS.md](TOKENS.md) for values, [GLOSSARY.md](GLOSSARY.md) for names. Components use only semantic or component tokens.

Shared components (StickyBar, EmptyState, Field, Button, Popup, TileGrid and the rest) live in Showcase: [packages/showcase/COMPONENTS.md](../../packages/showcase/COMPONENTS.md). This file lists only what is specific to Aviary.

## Hierarchy

| Level | Components |
| --- | --- |
| Pattern | Parakeets (login art), BirdTile, AddBird, BirdForm, PictureList, SimilarNames |

The Popup media column, BirdForm, SightingList, SimilarNames and the Admin lists are named in the spec (#278) and described here when their slices land.

## Parakeets

**Hierarchy:** Pattern
**Purpose:** The decorative art of the login page: static parakeets peeking up from the bottom edge.

No props. Five inline SVG parakeets, every second one mirrored, colours from the `parakeet.*` tokens. Below `sm`: three, smaller. The art is in the page flow under the form, so it never covers it. `aria-hidden`, no pointer events, no data.

### States

Static.

## BirdTile

**Hierarchy:** Pattern
**Purpose:** One Bird in the grid.

Props: `bird` (id, name, arrival, seen, flown, lost, nest, pictureId), `labels`. The first Picture fills a square, loaded from `/pictures/:id`; with none, or if it fails, the initials on a tinted square. One icon per set flag (Seen, Flown, Lost, Nest) top left, coloured by flag (Nest is sun), with a soft drop shadow and no circle; Roosted is never shown. Caption: name, then the Arrival as a day or a year. Hover tilt only.

## Pages in this slice

- **Login:** `h1` "Log in", Field "Password", Button `success` "Log in", Parakeets. A wrong password shows the Field error. After login the Owner returns to the page in `next`.
- **Aloft, Grounded, Nest:** StickyBar with three tabs, then a TileGrid of BirdTiles (Arrival newest first), or the Showcase EmptyState when the tab has no Bird. Pictures come only through the authenticated `/pictures/:id` route (`Cache-Control: private`).

## BirdPopup

**Hierarchy:** Pattern
**Purpose:** The whole Bird, opened over its tile (Showcase Popup).

Props: `birdId`, `name`, `labels`, `anchor`. Loads the Bird from `/api/birds/:id`. Pictures as squares on the left (a thumbnail row when there are several). Right: name, then Habitat and Arrival; flags (Roosted included) and Songs as read-only tags with no section labels; the SightingList; the notes. An Edit Button in the actions row opens a wide Popup with the BirdForm filled from the Bird (`birdToForm`), posting to `?/editBird&id=` with `seenLocked` while the Bird has a Sighting; saving reloads the popup and the grid.

## SightingList

**Hierarchy:** Pattern
**Purpose:** The Sightings of a Bird, in the popup.

One row per Sighting: a date input (empty means no day; changing or clearing it saves) and a delete Button that asks first. "Add a sighting" adds one with today's day. Changes go to `/api/sightings`; the first Sighting turns Seen on, and Seen stays on after the last is deleted.

## BirdForm

**Hierarchy:** Pattern
**Purpose:** The one form for Add and Edit.

Props: `labels`, `habitats`, `songs` (from the Admin lists: pick, never type), `action` (default `?/addBird`), `initial`, `initialPictures`, `seenLocked`, `similar`, `onDone`, `start` (snippet, for Edit's Archive). Fields: name, PictureList, Habitat (pick one or none), Songs (multi-pick), Arrival (a day, a year or empty), the five flags, notes. It posts `buildBirdFormData` to the action and shows a refusal as a Field-style error. Edit reuses it with `?/editBird&id=`, the Bird's values and Pictures, and `similar` off.

## PictureList

**Hierarchy:** Pattern
**Purpose:** The ordered Pictures of the form.

Props: `items` (bindable `PictureItem[]`: a stored Picture has an `id`, a new one a `blob`), `labels`, `error`. Add files (each cropped to its centred square, resized to 1600 px at most, encoded as JPEG in `image-prep.ts`), move earlier or later, remove. The first Picture is outlined: it is the tile Picture. A file over 25 MB is refused with a clear error before resize.

## SimilarNames

**Hierarchy:** Pattern
**Purpose:** Warn about a repeat while the name is typed.

Props: `text`, `labels`. After 3 characters, small tiles of Birds whose name matches (ignoring case, Archived included and marked), from `/api/similar`. Saving stays possible.

## AddBird

The "+" AddAction of the tab header: a Popup with a BirdForm. Reads the Habitat and Songs lists from the page data.
