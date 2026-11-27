# Aviary components: "Parakeet"

Sources: [DESIGN.md](DESIGN.md) for the look, [TOKENS.md](TOKENS.md) for values, [GLOSSARY.md](GLOSSARY.md) for names. Components use only semantic or component tokens.

Shared components (StickyBar, EmptyState, Field, Button, Popup, TileGrid and the rest) live in Showcase: [packages/showcase/COMPONENTS.md](../../packages/showcase/COMPONENTS.md). This file lists only what is specific to Aviary.

## Hierarchy

| Level | Components |
| --- | --- |
| Component | BirdTile, BirdPopup |
| Pattern | Parakeets (login art), BirdList, SightingList, AddBird, BirdForm, PictureList, SimilarNames, ValueList, ArchivedList, AdminLink |

The shared StickyBar, TileGrid, Popup, EmptyState, ConfirmDialog, Field and Select are used as Showcase defines them.

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

Props `onSelect`: gives the Popup the tile to focus on close. The tile is one `<button>`; the image has `alt=""` and each flag icon has a visually hidden label. Flag icons use the `flag.*` tokens.

States: default, hover and focus (lift and tilt, motion allowed only; focus also shows the ring), no Picture or a Picture that fails (initials square).

## BirdList

**Hierarchy:** Pattern
**Purpose:** The body of the Aloft, Grounded and Nest pages.

Props: `view`, `birds`, `labels`, `filters`, `habitats`, `songs`. StickyBar with the three tabs, the search, the Habitat, Songs and Nest selects, AddBird and AdminLink; then a TileGrid of BirdTiles (Arrival newest first). The filters live in the URL query and reload the tab after a short pause. With no Bird: the Showcase EmptyState; with a filter or search active, an EmptyState with a "clear filters" Button. A tile opens the BirdPopup. Pictures come only through the authenticated `/pictures/:id` route (`Cache-Control: private`).

## Login page

`h1` "Log in", Field "Password", Button `success` "Log in", Parakeets. A wrong password shows the Field error. After login the Owner returns to the page in `next`.

## BirdPopup

**Hierarchy:** Pattern
**Purpose:** The whole Bird, opened over its tile (Showcase Popup).

Props: `open` (bindable), `anchor`, `birdId`, `name` (shown while the Bird loads), `labels`, `onChanged` (a Sighting changed Seen: the grid reloads). Loads the Bird from `/api/birds/:id`; a 401 sends the Owner to login. Media column (Showcase Popup `mediaWidth`, `min(popup-picture-size, 40%)`): the shown Picture as a square, then a thumbnail row when there are several (each a toggle Button); with no Picture, the initials square. Subtitle: Habitat and Arrival. Details: flags (Roosted included) and Songs as read-only Badges with no section labels, the SightingList, the notes. A failed load shows an error line. An Edit Button in the actions row opens a wide Popup with the BirdForm filled from the Bird (`birdToForm`), posting to `?/editBird&id=` with `seenLocked` while the Bird has a Sighting; saving reloads the popup and the grid. The form's `start` holds a danger Archive Button: it posts `?/archiveBird&id=`, then closes the form and the popup and reloads the grid (a refusal shows beside the button).

## SightingList

**Hierarchy:** Pattern
**Purpose:** The Sightings of a Bird, in the popup.

One row per Sighting: a date input (empty means no day; changing or clearing it saves) and a delete Button that asks first. A "+" icon Button under the delete Buttons, bottom right, adds one with today's day. Changes go to `/api/sightings`; the first Sighting turns Seen on, and Seen stays on after the last is deleted.

## BirdForm

**Hierarchy:** Pattern
**Purpose:** The one form for Add and Edit.

Props: `labels`, `habitats`, `songs` (from the Admin lists: pick, never type), `action` (default `?/addBird`), `initial`, `initialPictures`, `seenLocked`, `similar`, `onDone`, `start` (snippet left of Save: Edit puts the Archive Button there). Fields: name, PictureList, Habitat (pick one or none), Songs (multi-pick), Arrival (a day, a year or empty), the five flags, notes. It posts `buildBirdFormData` to the action and shows a refusal as a Field-style error. Edit reuses it with `?/editBird&id=`, the Bird's values and Pictures, and `similar` off.

## PictureList

**Hierarchy:** Pattern
**Purpose:** The ordered Pictures of the form.

Props: `items` (bindable `PictureItem[]`: a stored Picture has an `id`, a new one a `blob`), `labels`, `error`. Add files (each cropped to its centred square, resized to 1600 px at most, encoded as JPEG in `image-prep.ts`), move earlier or later, remove. The first Picture is outlined: it is the tile Picture. A file over 25 MB is refused with a clear error before resize.

## SimilarNames

**Hierarchy:** Pattern
**Purpose:** Warn about a repeat while the name is typed.

Props: `text`, `labels`. After 3 characters, small tiles of Birds whose name matches (ignoring case, Archived included and marked), from `/api/similar`. Saving stays possible.

## AddBird

**Hierarchy:** Pattern
**Purpose:** The "+" AddAction of the tab header: a Popup with a BirdForm.

Props: `labels`. Reads the Habitat and Songs lists from the page data.

## ValueList

**Hierarchy:** Pattern
**Purpose:** One Admin list, Habitat or Songs.

Props: `kind` (`habitat` or `song`), `heading`, `values` (name and number of Birds using it), `labels`, `error` (label code name of the last refusal). One row per value: a rename Field with the use count and a Rename Button, and a danger Remove Button. A value nobody uses is removed at once. A value in use opens a ConfirmDialog with a Select of the other values: removing moves every Bird there first. A last Field and Button add a value.

## ArchivedList

**Hierarchy:** Pattern
**Purpose:** The Archived Birds on the Admin page.

Props: `birds` (tiles), `labels`, `error` (label code name of the last refusal). One row per Archived Bird: the name, a Restore Button (`?/restore`) and a danger Delete forever Button. Delete forever opens a ConfirmDialog naming the Bird and saying its Pictures and Sightings go too; confirming posts `?/deleteForever`. The Catalog refuses it for a Bird that is not Archived. With none, a quiet empty line.

## AdminLink

**Hierarchy:** Pattern
**Purpose:** The link from the sticky bar to the Admin page.

Props: `label` (visually hidden). An icon-only neutral Button with the settings icon.
