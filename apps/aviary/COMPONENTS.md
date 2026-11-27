# Aviary components: "Parakeet"

Sources: [DESIGN.md](DESIGN.md) for the look, [TOKENS.md](TOKENS.md) for values, [GLOSSARY.md](GLOSSARY.md) for names. Components use only semantic or component tokens.

Shared components (StickyBar, EmptyState, Field, Button, Popup, TileGrid and the rest) live in Showcase: [packages/showcase/COMPONENTS.md](../../packages/showcase/COMPONENTS.md). This file lists only what is specific to Aviary.

## Hierarchy

| Level     | Components                                                                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Component | BirdTile, BirdPopup, BirdPicture                                                                                                                        |
| Pattern   | Parakeets (login art), BirdList, SightingList, AddBird, BirdForm, PictureList, CropPicture, SimilarNames, ValueList, BatchEdit, ArchivedList, AdminLink |

The shared StickyBar, TileGrid, Popup, EmptyState, ConfirmDialog, Field and Select are used as Showcase defines them.

## Parakeets

**Hierarchy:** Pattern
**Purpose:** The decorative art of the login page: static parakeets peeking up from the bottom edge.

No props. Five inline SVG parakeets, every second one mirrored, colours from the `parakeet.*` tokens. Below `sm`: three, smaller. The art is in the page flow under the form, so it never covers it. `aria-hidden`, no pointer events, no data.

### States

Static.

## BirdPicture

**Hierarchy:** Component
**Purpose:** One stored Picture as an `<img>`, in the tile, the popup and the similar names.

Props: `pictureId`, `class`, `onFail` (the full Picture failed too). It asks for `/pictures/:id?size=thumb` (a 400 px square JPEG, R2 key `thumb/<key>`). With no thumbnail yet (404) it loads the full Picture once, then draws the centred square at 400 px and stores it with `PUT /pictures/:id`. Deleting a Picture deletes its thumbnail.

## BirdTile

**Hierarchy:** Pattern
**Purpose:** One Bird in the grid.

Props: `bird` (id, name, arrival, seen, flown, lost, nest, pictureId), `labels`. The first Picture fills a square, shown by BirdPicture; with none, or if it fails, the initials on a tinted square. One icon per set flag (Seen, Flown, Lost, Nest) top left, coloured by flag (Nest is sun), with a soft drop shadow and no circle; Roosted is never shown. Caption: name, then the Arrival as a day, a month or a year. Hover tilt only.

Props `onSelect`: gives the Popup the tile to focus on close. The tile is one `<button>`; the image has `alt=""` and each flag icon has a visually hidden label. Flag icons use the `flag.*` tokens.

States: default, hover and focus (lift and tilt, motion allowed only; focus also shows the ring), no Picture or a Picture that fails (initials square).

## BirdList

**Hierarchy:** Pattern
**Purpose:** The body of the Aloft, Grounded and Seen pages.

Props: `view`, `birds`, `labels`, `filters`, `habitats`, `songs`. StickyBar with the three tabs, the search, the Habitat and Songs selects, then Seen on Aloft and Grounded or Nest and Roosted on Seen, AddBird and AdminLink; then a TileGrid of BirdTiles (Arrival newest first). The title row ends with the number of Birds shown (the StickyBar `chips` slot, a live region, with the tab name hidden for screen readers). The filters live in the URL query and reload the tab after a short pause. With no Bird: the Showcase EmptyState; with a filter or search active, an EmptyState with a "clear filters" Button. A tile opens the BirdPopup. Pictures come only through the authenticated `/pictures/:id` route (`Cache-Control: private`).

## Fixed words

The shared components take their fixed words from Showcase `setUiLabels`, set in the root layout from these label code names: SkipToContent, SwitchToLight, SwitchToDark, Cancel, Save, Lists, PickDate (`{label}` stands for the Field label). CropPicture also uses Cancel, Save and Zoom. The optional label `Lang` sets the page `lang`; with none it stays `en`. A missing label shows its code name, as everywhere.

## Login page

`h1` "Log in", Field "Password", Button `success` "Log in", Parakeets. A wrong password shows the Field error. After login the Owner returns to the page in `next`.

## BirdPopup

**Hierarchy:** Pattern
**Purpose:** The whole Bird, opened over its tile (Showcase Popup).

Props: `open` (bindable), `anchor`, `birdId`, `name` (shown while the Bird loads), `labels`, `onChanged` (a Sighting changed Seen: the grid reloads). Loads the Bird from `/api/birds/:id`; a 401 sends the Owner to login. Media column (Showcase Popup `mediaWidth`, `min(popup-picture-size, 40%)`): the shown Picture as a square, then a thumbnail row when there are several (each a toggle Button); with no Picture, the initials square. Subtitle: Habitat and Arrival. Details: flags (Roosted included) and Songs as read-only Badges with no section labels, the notes. Below the media and details, full width under a divider line (Popup `below`): the SightingList. A failed load shows an error line. An Edit Button in the actions row opens a wide Popup with the BirdForm filled from the Bird (`birdToForm`), posting to `?/editBird&id=` with `seenLocked` while the Bird has a Sighting; saving reloads the popup and the grid. The form's `start` holds a danger Archive Button: it opens a ConfirmDialog naming the Bird; confirming posts `?/archiveBird&id=`, then closes the form and the popup and reloads the grid (a refusal shows beside the button).

## SightingList

**Hierarchy:** Pattern
**Purpose:** The Sightings of a Bird, in the popup.

One row per Sighting: a date input (empty means no day; changing or clearing it saves) and a delete Button that asks first. A "+" icon Button under the delete Buttons, bottom right, adds one with today's day. Changes go to `/api/sightings`; the first Sighting turns Seen on, and Seen stays on after the last is deleted.

## BirdForm

**Hierarchy:** Pattern
**Purpose:** The one form for Add and Edit.

Props: `labels`, `habitats`, `songs` (from the Admin lists: pick, never type), `action` (default `?/addBird`), `initial`, `initialPictures`, `seenLocked`, `similar`, `onDone`, `start` (snippet left of Save: Edit puts the Archive Button there). Fields: name; then PictureList with Habitat (pick one or none) and Arrival (a day, a month, a year or empty) to its right; then Songs (multi-pick) and the five flags as two columns, each with an icon (the BirdTile flag icons and colours, a music note for every Song, a moon for Roosted); notes. Below `sm` every row stacks. It posts `buildBirdFormData` to the action and shows a refusal as a Field-style error. Edit reuses it with `?/editBird&id=`, the Bird's values and Pictures, and `similar` off.

## PictureList

**Hierarchy:** Pattern
**Purpose:** The ordered Pictures of the form.

Props: `items` (bindable `PictureItem[]`: a stored Picture has an `id`, a new one a `blob`), `labels`, `error`. Add files: each opens in a CropPicture panel above the list (drag to move the square, slider to zoom 1 to 4, Cancel skips the file, Save adds it), then is resized to 1600 px at most and encoded as JPEG in `image-prep.ts`, remove (a small round X over the top right corner of each Picture). Reorder by dragging a Picture (pointer or touch); with the keyboard, focus a Picture and press the arrow keys. The first Picture is outlined: it is the tile Picture. A file over 25 MB is refused with a clear error before resize.

## CropPicture

**Hierarchy:** Pattern
**Purpose:** Pick the square cut of one new Picture.

Props: `file`, `busy`, `onUse(crop)`, `onSkip`, `onUnreadable`. A square viewport with the file under it (starts on the centred square): drag to move, a range slider to zoom (1 shows the shorter side, 4 a quarter of it). Cancel and Save are the plain Buttons of FormActions. Used only inside PictureList.

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

## BatchEdit

**Hierarchy:** Pattern
**Purpose:** Change the Habitat and flags of several Birds at once, on the Admin page.

Props: `birds` (every Bird not Archived, by name: a tile plus `roosted`), `habitats`, `labels`, `error` (label code name of the last refusal). On the Admin page, from `lg` up, the Habitat and Songs ValueLists take the left third and BatchEdit the right two thirds; below `lg` they stack. A Select for the Habitat (keep, none, or a value) and one per flag (keep, set, clear), all starting on keep. Under the fields and Apply, a SearchField (name, as you type) and a Select (Arrival or Name, default Arrival) with a SortDirection (default descending; a Bird with no Arrival goes last) filter and order the checklist. Select-all and the count work on the Birds shown; a hidden Bird stays selected. The scrolling checklist has a select-all row with the number selected; each Bird row shows a 32px thumbnail of its first Picture (lazy, from `/pictures/:id`; initials on a tint when none or on failure), the name, and on the right one icon per set flag (the BirdTile icons and colours, a moon for Roosted) with a tooltip naming it. The Apply Button is disabled until a Bird is picked and one field is not on keep; it posts `?/editBirds`, then the form and selection reset. Seen cannot be cleared on a Bird that has a Sighting: that Bird keeps Seen and takes the other changes.

## ArchivedList

**Hierarchy:** Pattern
**Purpose:** The Archived Birds on the Admin page.

Props: `birds` (tiles), `labels`, `error` (label code name of the last refusal). One row per Archived Bird: the name, a Restore Button (`?/restore`) and a danger Delete forever Button. Delete forever opens a ConfirmDialog naming the Bird and saying its Pictures and Sightings go too; confirming posts `?/deleteForever`. The Catalog refuses it for a Bird that is not Archived. With none, a quiet empty line.

## AdminLink

**Hierarchy:** Pattern
**Purpose:** The link from the sticky bar to the Admin page.

Props: `label` (visually hidden). An icon-only neutral Button with the settings icon.
