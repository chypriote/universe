# Jerseys components: "Kit wall" v1

Sources: [DESIGN.md](DESIGN.md) for the look, [TOKENS.md](TOKENS.md) for values, [GLOSSARY.md](GLOSSARY.md) for names. Components use only semantic or component tokens.

Accepted by Nico on 2026-11-23.

Shared components (Button, Chip, Field, SearchField, Select, ToggleGroup, Tabs, ConfirmDialog, SortDirection, ThemeToggle, EmptyState, LoginAction, Popup, StickyBar, AddAction, StoreSelect) and the shared rules live in Showcase: [packages/showcase/COMPONENTS.md](../../packages/showcase/COMPONENTS.md). This file lists only what is specific to Jerseys.

## Hierarchy

| Level     | Components                                                                                                                         |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Component | Tile, Popup, StoreSelect, TeamLookup                                                                                               |
| Pattern   | StickyBar, TileGrid, CoverageMap, AddAction, DeleteAction, AcquisitionFields, JerseyForm, WishlistItemForm, GotItForm              |

## Components

### Tile

**Purpose:** One Jersey (Collection) or one Wishlist Item (Wishlist) in the grid. It opens the Popup.

| Prop           | Type                        | Default | Description                                                                  |
| -------------- | --------------------------- | ------- | ---------------------------------------------------------------------------- |
| team           | string                      | —       | Caption line 1, `text.caption.team`                                          |
| season         | string                      | —       | Already formatted ("2023-24", "2024")                                        |
| kitType        | string                      | —       | "Home", "Away"… Caption line 2 is "{season} · {kitType}", `text.caption.kit` |
| mainPictureUrl | string \| null              | null    | The Kit's Main Picture. Null shows the shirt outline                         |
| name | string \| null | null | The Print without its number ("NICOLAS 4" gives "NICOLAS"). Null when nothing is left, for a Jersey without a Print and for a Wishlist Item |
| number | string \| null | null | Shirt number of the Jersey's Print: its trailing digits ("NICOLAS 4" gives "4"). Null for a Print without a number, a Jersey without a Print and a Wishlist Item |
| onSelect       | `(el: HTMLElement) => void` | —       | Gives the Popup the Tile to focus on close                                   |

- The whole Tile is one `<button>`. The image has `alt=""`, because the caption names the Kit.
- Square box: `tile.bg`, `tile.radius`, `tile.shadow`. The Main Picture is `object-fit: contain` with padding, so a shirt photo on any background reads on the neutral tile. `loading="lazy"`.
- No Main Picture, or the image fails to load: a shirt outline SVG in `tile.placeholder`, `aria-hidden`.
- The Print name sits bottom center of the square box on one line, truncated with an ellipsis, 28px in from each side so it never reaches the number, 8px from the bottom, `text.tile.print`, `color.text.primary`, 3px halo in `tile.bg`. `aria-hidden`.
- The number sits at the bottom right of the square box, 8px from the right and the bottom, `text.tile.number` (same size as the name), `color.text.primary`, with a 4px halo in `tile.bg` so it reads on every shirt. It is `aria-hidden`: the Popup lists the full Print.
- Never fill the tile with a kit colour (DESIGN.md).

States: default, hover and focus (`tile.hover.lift`, `tile.hover.tilt`, motion allowed only; focus also shows the ring), no Main Picture.

### Popup

Wraps the Showcase Popup: the Main Picture column (portrait 3:4, `min(popup.picture.size, 40%)`) and its thumbnails are the `media` snippet, shown when `subtitle` is set and the Popup is not `wide`. A Tile Popup opens over `anchor`, clamped to the screen; a form Popup is centred. Focus goes back to `anchor` on close. Title: `text.heading.popup`.

| Prop           | Type                | Default | Description                                                                                                                 |
| -------------- | ------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------- |
| open           | boolean             | false   | Bindable                                                                                                                    |
| anchor         | HTMLElement \| null | null    | The Tile. Gets the focus back on close                                                                                      |
| title          | string              | —       | The Team name                                                                                                               |
| subtitle       | string              | —       | "{season} · {kitType}", `text.body.detail`, muted                                                                           |
| mainPictureUrl | string \| null      | null    | `popup.picture.size`, contained, or the shirt outline                                                                       |
| pictureUrls    | string[]            | `[]`    | The Kit's extra Pictures, in the order they were added (see "Popup content")                                                |
| wide           | boolean             | false   | Form Popup: width `popup.width.wide`, no Main Picture. From `breakpoint.sm` the fields sit in two columns                   |
| onDismiss      | `() => void`        | —       | X button, Esc, tap on the backdrop                                                                                          |
| pictureAction  | Snippet (index)     | —       | Owner only: under the thumbnails while a Picture (not the Main Picture) is shown. Gets the Picture's index in `pictureUrls` |

Vinyles names the title prop `album`. Here it is `title`, because a Popup also holds forms.

Slots:

- `details`: a `<dl>` of rows. The page fills it (see "Popup content").
- `actions`: optional, Owner only.
- `findPicturesUrl`: optional, Owner only: the "Find pictures on Football Kit Archive" link under the Buttons. The Edit Kit and Set main picture Popups pass it.

### Country filter

The Showcase MultiSelectFilter, label "Countries", one group per Continent. Only Countries that have at least one Tile on this page are listed. A Jersey matches its Country by Coverage rules: the National Team's Country, or the Club's League's Country.

| Prop   | Type                                                                 | Default | Description                       |
| ------ | -------------------------------------------------------------------- | ------- | --------------------------------- |
| value  | string[]                                                             | `[]`    | Bindable Country ids. Empty = all |
| groups | `{ continent: string; countries: { id: string; name: string }[] }[]` | —       |                                   |

### TeamLookup

**Purpose:** Pick a known Team, or add a new Team on the fly, in JerseyForm and WishlistItemForm.

- A text Field "Team" with the ARIA combobox pattern (`role="combobox"`, `aria-autocomplete="list"`, a `role="listbox"` under it).
- Typing filters the known Teams by name (contains, any case), up to 8 options, each with its Country in `color.text.muted`.
- When the text matches no Team exactly, the last option is "Add “{name}” as a new team", in `color.icon.accent`.
- Keys: Up and Down move, Enter picks, Esc closes the list (not the Popup). A click picks.
- Picking the new option opens a block under the Field: kind (ToggleGroup Club / National Team, default Club) and Country (Select, grouped by Continent, required). Text under it: "The League follows the Country." Save creates the Team with the Jersey or Wishlist Item.
- A new Team name is searched on TheSportsDB (`/api/teams/search`) on the first Save of the form, and in the Teams page "Add a team" Popup. When no Team matches (case, accents and punctuation ignored; one name inside the other counts), the form shows "“{name}” is not on TheSportsDB. Save again to add it anyway." and a second Save adds it. A failed search never blocks. Football Kit Archive cannot be the check: it refuses server requests.
- Typing again after a pick closes the block until a new pick.
- The list is a `color.bg.surface` card, `tile.radius`, `shadow.raised`. Options are 44px pills; the active one has `color.bg.page`.

| Prop      | Type                                                                                    | Default | Description                         |
| --------- | --------------------------------------------------------------------------------------- | ------- | ----------------------------------- |
| value     | `{ teamId: string } \| { name: string; kind: 'club' \| 'national'; countryId: string }` | —       | Bindable. A known Team or a new one |
| teams     | `{ id: string; name: string; country: string }[]`                                       | —       | Known Teams                         |
| countries | `{ continent, countries: { id, name }[] }[]`                                            | —       | For the new Team's Country          |

### EmptyState

Showcase EmptyState. Messages: "No jerseys yet", "Nothing on the wishlist", "No match" with a "Clear filters" Button. No illustration.

---

## Patterns

### StickyBar

The Showcase StickyBar.

- Title: "Jerseys". The chips, the LoginAction and the ThemeToggle sit on the right of it; they wrap under the title when the row is too narrow.
- Collection chips: `highlight` jersey count, `success` total spent (`compact`). Filters: Country filter. Sorts: Team, Season, Acquired (Bought date or Gift date). Default: Acquired, newest first.
- Wishlist chips: `info` item count. Filters: Country filter. Sorts: Team, Season. Default: Season, newest first.
- Search covers Team name and Print.

### TileGrid

The Showcase TileGrid. Key each Tile by Jersey id or Wishlist Item id. Two Jerseys of one Kit are two Tiles with the same Main Picture.

### CoverageMap

**Purpose:** Shows which Countries are covered. Collection page only, between the StickyBar and the TileGrid.

- A surface card (`color.bg.surface`, `tile.radius`, `tile.shadow`) with an inline SVG world map. Height follows the map's aspect ratio.
- Size: small Countries must be easy to see (Nico, 2026-11-22). The map is cropped to 56°S–72°N (no Antarctica, no far north). It is drawn at least `map.width.min` (900px) wide. On a narrower screen the card scrolls sideways (`overflow-x: auto`) and opens centred on Europe; the page itself never scrolls sideways.
- Small Countries: a Country less than 8px across at the drawn size also gets a dot (r 4px) at its centre, in its state colour, with a 1px `map.country.border` ring. This covers Hong Kong, Luxembourg, Malta and the like.
- Two states per Country (jerseys-model): covered fills `map.country.covered`; empty (a Country of the app with no Jersey) fills `map.country.empty`, a bit darker than land that is not a Country of the app (`map.country.absent`). Country borders: `map.country.border`, 0.5px.
- The UK is four Countries: England, Scotland, Wales, Northern Ireland.
- Heading above the map: "{covered} of {total} countries", `text.body`, value in extrabold. It is the button of an accordion with a chevron: it opens and closes the map (`aria-expanded`). The map starts open; the choice is kept in `localStorage` (`coverage-map-open`) and applied after mount. `total` is the number of Countries in the app, not in the world.
- The SVG is `role="img"` with `aria-label` "Countries covered: {names}". No zoom in v1: sideways scroll only.
- Click or tap on a covered Country: the page's Country filter becomes that Country alone, the search is cleared, and the page scrolls smoothly to the first Tile shown, which stops just under the StickyBar. The Tile area is at least as tall as the screen under the StickyBar, so the scroll works even for a Country with one Tile. Covered Countries show a pointer cursor; others do nothing.
- Hover (mouse and pen only): over a Country of the app, a tooltip follows the pointer with the Country name in extrabold and one line per Jersey of that Country, "{Team} {Season} {Kit Type}", or "No jersey yet". Surface card, `tile.shadow`, `text.body.detail`; it flips to the other side of the pointer in the far half of the screen. Countries not in the app show nothing.
- The map reads all Jerseys, not the filtered list.

New component tokens (add to TOKENS.md):

| Token               | → Semantic          | Scope               |
| ------------------- | ------------------- | ------------------- |
| map.country.covered | color.icon.accent   | CoverageMap         |
| map.country.empty   | sky.200 / navy.500  | CoverageMap         |
| map.country.absent  | color.border.subtle | CoverageMap         |
| map.country.border  | color.bg.surface    | CoverageMap         |
| map.width.min       | 900px               | CoverageMap drawing |

Contrast, covered against empty: 3.41 light, 5.81 dark (needs 3, non-text). Empty against the card is low (1.29 light, 1.36 dark), but it shows only the land shape; the covered state and the text label carry the information.

### Popup content

Rows are `<dt>` label, `<dd>` value, `text.body.detail`. A row with no value is not shown.

- **Jersey:** Version, Print, Size, Fit, then the Acquisition. Purchase: Store, Price, Bought, Sent, Received. Gift: "Gift", Date, From. Dates show as stored: "2024" or "12 May 2024".
- **Wishlist Item:** Version (or "Any version"). Owner `actions`: Button `success` "Got it", Button `neutral` "Drop". Drop acts at once, with no confirmation, as in Vinyles.
- Owner on a Jersey: a `neutral` Button "Edit" and a `danger` Button "Delete" in `actions`. "Edit" opens JerseyForm in the same Popup. "Delete" (DeleteAction) removes the Jersey and closes the Popup; the Kit stays, even with no Jersey left.
- **Pictures** (Jersey and Wishlist Item): when the Kit has extra Pictures, a row of small contained thumbnails (`control.size.min` square, `color.bg.page` tile) sits under the Main Picture: the Main Picture first, then the Pictures in the order they were added. A tap shows that Picture in place of the Main Picture; the shown thumbnail has the focus outline (`aria-pressed`). Every Jersey and the Wishlist Item of a Kit show the same Pictures.
- Owner, while a Picture is shown: a `neutral` Button "Delete" under the thumbnails (DeleteAction, "Delete this picture?"). It removes the Picture and its image for every Jersey and the Wishlist Item of the Kit.
- Owner on a Jersey or a Wishlist Item: a file input "Add pictures" (multiple, JPEG, PNG or WebP) after the Buttons in `actions`. Each file is shrunk like the Main Picture and added at once, in the order picked; a refused file shows its error under the input.

### AddAction

The Showcase AddAction, `wide`. It opens JerseyForm (Collection) or WishlistItemForm (Wishlist).

### DeleteAction

A `danger` Button "Delete" (visually hidden: the row's name) that opens ConfirmDialog. After "Delete" it runs the delete. A refused delete shows its error under the Buttons, in `color.text.error`, and the row stays: "Kitbag is still used by 2 Purchases", "France is still used by 3 Teams", "Lyon is still used by 4 Kits", "Lyon 2023-24 Home is still used by 1 Jersey and 1 Wishlist Item", "The Official Store cannot be deleted".

Delete fixes a mistake (Nico, 2026-11-23). It refuses, never cascades: a Store with Purchases, a Country with Teams, a Team with Kits, a Kit with Jerseys or a Wishlist Item stay. Deleting a Country deletes its League. Deleting a Kit deletes its Pictures and its Main Picture and Picture images. No undo, no trash.

### Admin sections

Owner only. `/admin` redirects to `/admin/countries`. One page per section: `/admin/countries`, `/admin/stores`, `/admin/teams`, `/admin/kits`, `/admin/main-pictures` (Kits without a Main Picture). A nav under the title (AdminNav, styled like Tabs) links the pages and marks the current one with `aria-current="page"`. Each page has a SearchField above its list that filters the loaded rows by every word typed (page state, not in the URL). The Countries, Stores and Teams rows end their subtitle with the Jersey count ("3 jerseys"; Jerseys only, a Gift counts for no Store). The Edit team Popup lists the Team's Kits under the form, each a link to `/admin/kits?search=<Team Season Kit Type>`; the Kits page starts with that text in its SearchField. On the Kits and Teams pages the address follows the SearchField: a text sets `?search=`, an empty field removes it (no new history entry), so a refresh keeps only what is typed. The Edit kit Popup ends with a link "Edit {Team name}" to `/admin/teams?search=<Team name>`; the Teams page starts with that text in its SearchField. The Teams page has a `success` Button "Add a team" next to its heading: the same Popup as Edit team, with no DeleteAction and no Kits list; Save creates the Team (no Kit) and goes to `/admin/kits?addKit=<Team id>`, which opens the Add kit Popup with that Team pre-filled. The Edit team Popup has the same link, "Add a kit to {Team name}", above its Kits list. The Kits page has a `success` Button "Add a kit" next to its heading: a wide Popup with the Kit fields of JerseyForm (Team, Season, Kit Type, Comment for a Special Kit, Main Picture) and FormActions; Save creates the Kit, with the Main Picture lookup unless a picture is sent. A Kit that exists is refused. Next to the Kits SearchField, a Toggle "No main picture" (`aria-pressed`, off at first) keeps only the Kits with no Main Picture; it combines with the search. The Kits rows show the Main Picture in a small square tile on the left (the shirt outline when there is none), with no subtitle. The Stores are small cards in a grid, two per row on a phone and three from `breakpoint.sm`: name and Jersey count on the left, then a round pencil icon Button (`size="icon"`, label "Edit {store name}") on the right, vertically centred. The Name of a new Country is a typeahead (CountryNameLookup, the TeamLookup pattern) over the Countries of the map, 8 options at most, and the server refuses a name that is not one of them; editing a Country keeps a plain Name field. Each row has a Button that opens its form in a Popup ("Edit"). The Popup of an existing Country, Store, Team or Kit ends with one footer row (FormActions): DeleteAction on the left, `success` Button "Save" on the right, each at its natural width. The Add Popups have the Save Button alone, on the right. The Edit Kit Popup also has the "Find pictures on Football Kit Archive" link. A delete closes the Popup.

### AcquisitionFields

Like Vinyles, plus dates:

- ToggleGroup Purchase / Gift.
- Purchase: StoreSelect, Price (Field `number`, step 0.01, required), Bought (date Field, required), Sent (date Field, optional), Received (date Field, optional).
- Gift: Date (date Field, required), From (Field, optional).

### JerseyForm

Add and edit a Jersey. Fields, in order:

1. Team: TeamLookup.
2. Existing kits: shown when an existing Team is chosen and has Kits (ExistingKits). One pill Button per Kit, with its Main Picture in a small round thumbnail and "Season · Kit Type" (`aria-pressed` for the one that matches the fields). A tap fills Season, Kit Type and Comment. The Owner can still type a new Season and Kit Type. The same block shows in WishlistItemForm (both use KitFields).
3. Season: Select of the Seasons that Kits already have in the Team's Season Format (any Team's), plus the current and the next Season ("2026-27" and "2027-28" for Season, "2026" and "2027" for Calendar; a Season starts in July), newest first. The Season of the Kit being edited stays in the list. An older Season that no Kit has cannot be entered. First option "Choose a season"; with no Team chosen, or a new Team with no Country yet, the Select is disabled and says "Choose a team first". Changing the Team to one of the other format clears the Season. The Add and Edit Kit Popups and WishlistItemForm use the same Select.
4. Kit Type: Select (Home, Away, Third, Fourth, Cup, Special).
5. Main Picture: file input "Main picture", shown when the Kit has no Main Picture yet. One Main Picture per Kit.
6. Version: ToggleGroup Fan / Player / Tracksuit.
7. Size: ToggleGroup S / M / L.
8. Fit: ToggleGroup Too small / Good / Too big.
9. Print: Field, optional, any script.
10. AcquisitionFields.

Buttons: `success` "Save", `neutral` "Cancel". Delete is in the Jersey Popup (see "Popup content"), not in the form.

### WishlistItemForm

Team, Season, Kit Type (as in JerseyForm), Main Picture (same rule), Version (ToggleGroup Any / Fan / Player / Tracksuit). If Nico already owns a Jersey of the Kit: notice "Already owned" and a Button "Add anyway" before it saves.

### GotItForm

Opens from "Got it". Version (pre-set from the Wishlist Item, if any), Size, Fit, Print, AcquisitionFields. Save removes the Wishlist Item and creates the Jersey.

---

## Governance note

One owner, no Figma library, no ticket tool. Nico accepts this file, then the code follows it. Versioning starts when the first component ships.
