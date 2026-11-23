# Vinyles components: "Wall" v1

Sources: [DESIGN.md](DESIGN.md) for the look, [TOKENS.md](TOKENS.md) for values, [GLOSSARY.md](GLOSSARY.md) for names. Components use only semantic or component tokens.

Accepted by Nico on 2026-11-20.

Shared components (Button, Chip, Field, SearchField, Select, ToggleGroup, Tabs, ConfirmDialog, SortDirection, ThemeToggle, EmptyState, LoginAction, Popup, StickyBar, AddAction, StoreSelect) and the shared rules live in Showcase: [packages/showcase/COMPONENTS.md](../../packages/showcase/COMPONENTS.md). This file lists only what is specific to Vinyles.

## Hierarchy

| Level     | Components                                                                  |
| --------- | --------------------------------------------------------------------------- |
| Primitive | DesireDots                                                                  |
| Component | Cover, DesireSelect, Popup, StoreSelect                                     |
| Pattern   | StickyBar, RecordForm, WishlistItemForm, GotItForm, ImportReview            |

Nico accepted the Owner UI, EmptyState and ImportReview sections on 2026-11-20. They add no token: they reuse the tokens above.

## DesireDots

**Hierarchy:** Primitive
**Purpose:** Shows the Desire of a Wishlist Item, 1 to 5, and lets the Owner set it.

### Props API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| value | `1` to `5` | — | Number of filled dots |
| onPick | `(level) => void` | — | Owner: each dot becomes a Button that sets it |
| disabled | boolean | false | While a save runs |

Dots: `color.icon.accent`. Without `onPick`: `value` dots, `aria-hidden`, and the visually hidden text "Desire {value} of 5". With `onPick`: five 44px-tall dot Buttons in a group labelled "Desire", each "Set desire to {level}" with `aria-pressed`; hovering a dot previews that level (unfilled dots at 25%).

### States

Default, hover preview, focus, disabled.

---

## Cover

**Hierarchy:** Component
**Purpose:** One Album in the grid: cover image and caption. It opens the Popup.

### Variant Matrix

| Dimension | Type          | Values                              |
| --------- | ------------- | ----------------------------------- |
| desire    | optional prop | absent (Collection), 1–5 (Wishlist) |

### Props API

| Prop     | Type                        | Default | Description                                         |
| -------- | --------------------------- | ------- | --------------------------------------------------- |
| album    | string                      | —       | Album title, TileCaption line 1 (`text.caption.album`) |
| artist   | string                      | —       | Artist name, caption line 2 (`text.caption.artist`) |
| coverUrl | string \| null              | null    | Image from R2. Null shows the initials tile         |
| desire | `1` to `5` | — | When set, DesireDots show under the caption |
| onSelect | `(el: HTMLElement) => void` | —       | Gives the Popup the element to open over            |

The whole Cover is one `<button>`. The image has `alt=""`, because the caption names the album. Image: square, `cover.radius`, `loading="lazy"`.

Initials tile: first letters of the first two words of the artist name, in `text.heading.page` weight, color `cover.tile.text`. The background is one of the four `cover.tile.bg` colors. The artist name picks it: sum of the name's character codes, modulo 4. All albums by one artist get the same color.

### States

- Default.
- Hover and focus: `tile.hover.lift` and `tile.hover.tilt`, motion allowed only. Focus also shows the focus ring.
- No cover: initials tile.
- Image load fails: initials tile.

### Slots

None.

---

## DesireSelect

**Hierarchy:** Component
**Purpose:** Picks a Desire: the Wishlist filter ("Any desire", then 5 to 1) and the Desire field of WishlistItemForm (3 at first).

A Showcase native-select pill. Options run from 5 ("5 (most wanted)") down to 1 ("1 (least wanted)"). `placeholder` adds the empty option.

### Props API

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| value | Desire \| null | null | The chosen level |
| label | string | — | Visually hidden label |
| placeholder | string | — | Label of the empty option, for a filter |
| onPick | `(level \| null) => void` | — | Called with the new level, or null |

### States

Default, focus, disabled.

---

## Popup

**Hierarchy:** Component
**Purpose:** Shows the details of one Record or Wishlist Item over its Cover.

Wraps the Showcase Popup: the cover (or initials tile) is the `media` snippet, `min(popup.cover.size, 28vw)` wide, or `min(popup.cover.size.large, 34vw)` for the `large` Collection Popup, stacked above the details below `sm`. A Cover Popup is 672px wide and opens over the Cover, clamped to the screen; a form Popup is centred. The dialog gives the focus trap, Esc, the `inert` page and the backdrop (`color.bg.overlay`). On close, focus goes back to the Cover.

### Props API

| Prop      | Type                | Default | Description                                               |
| --------- | ------------------- | ------- | --------------------------------------------------------- |
| open      | boolean             | false   | Bindable                                                  |
| anchor    | HTMLElement \| null | null    | The Cover. The Popup opens over it, clamped to the screen |
| album     | string              | —       | Title (`text.heading.popup`)                              |
| artist    | string              | —       | Under the title (`text.body.detail`, muted)               |
| coverUrl  | string \| null      | null    | `popup.cover.size` image, or the initials tile            |
| onDismiss | `() => void`        | —       | X button, Esc, tap on the backdrop                        |

Box: `color.bg.surface`, `popup.radius`, max width `popup.width.max`. The X button is at top right, label "Close" (visually hidden), 44px target.

### States

Open, closed.

### Slots

- `details`: a `<dl>` of rows. Collection: year, variant, acquisition (Purchase: store and price; Gift: from). Wishlist: year, variant, desire (DesireDots), one Price Quote per Store.
- `actions`: optional. Wishlist, Owner only: Button `success` "Got it" and Button `neutral` "Drop". Viewers do not get the snippet.

The page fills the snippets. Popup does not know Records from Wishlist Items.

---

## StickyBar

The Showcase StickyBar. Title "Vinyles." with the period in `color.icon.accent`.

- Collection: Chip `highlight` record count (a disc icon below `sm`), Chip `success` total spent (`compact`). Filters: artist (Showcase MultiSelectFilter, label "Artists"). Sorts: artist, album, release year, acquired. Covers sit in the Showcase TileGrid, keyed by Record id.
- Wishlist: Chip `info` item count, label "wanted". Filters: artist, DesireSelect. Sorts: artist, album, release year.
- The Owner's AddAction opens RecordForm ("Add a record") or WishlistItemForm ("Add to wishlist").

---

## Owner UI

Viewers see only the lock Button. After login, the Owner sees an "Add" Button in its place. Every form opens in Popup with `anchor` null: centered, same box, same X button and Esc. Forms use native inputs and a native `<form>`; the buttons are the Showcase FormActions; errors are ErrorMessage.

### RecordForm

Fields: Artist (Field, with the existing artists as native `<datalist>`), Album (Field), Variant (Field, optional), Acquisition (two radio pills: Purchase, Gift), Date (Field `date`). Purchase shows StoreSelect and Price. Gift shows "From" (Field, optional). Edit mode fills the values and adds, left of FormActions, a `danger` Button "Delete record" and a Button "Change cover". "Delete record" opens ConfirmDialog. Release year and cover come from the lookup on save.

### WishlistItemForm

Fields: Artist, Album, Variant (optional), Desire (DesireSelect, 1 to 5 dots, 3 at first), Price quotes (rows of StoreSelect + Price, "Add a quote" Button). If the Album is already a Record: a notice "Already owned" with a "Add anyway" Button before the form saves.

### GotItForm

Opens from the "Got it" Button. Same Acquisition fields as RecordForm. Save removes the Wishlist Item and creates the Record.

### EmptyState

Showcase EmptyState. Three cases: empty Collection ("No records yet"), empty Wishlist ("Nothing on the wishlist"), no match for the search or filters ("No match", with a "Clear filters" Button). Owner only: an "Add" Button on an empty list.

### ImportReview

**Hierarchy:** Pattern
**Purpose:** The one-time import screen. Owner only, route `/import`.

1. One `success` Button "Import from the sheet". While it runs, text shows the count: "Imported 40 of 96".
2. After it, a list of the albums with no MusicBrainz match: artist, album, and a Field "Release year" per row. A Cover in the initials tile shows if no cover was found.
3. A `success` Button "Save years" stores the typed years and ends the review.

The route is removed from the app once the sheet is retired.

---

## Governance note

One owner, no Figma library, no ticket tool. The contribution steps reduce to: Nico accepts this file, then the code follows it. Versioning starts when the first component ships.
