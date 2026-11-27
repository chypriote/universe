# Showcase

One wall for every collection. Showcase is the shared design system of Universe, Nico's collection apps: today Jerseys (football shirts) and Vinyles (records), plus the private Aviary list, later films, TV shows and books. Each app is a packed wall of square tiles of the things Nico owns or wants, a sticky bar to search and filter it, and popups for details and forms. The apps share the structure, shapes and controls; each brings its own page tint, accent and display face.

Source: this folder, `packages/showcase/design-system/`, in `chypriote/universe`. Shared code and docs in `packages/showcase` (`src/showcase.css`, DESIGN.md, TOKENS.md, COMPONENTS.md); each app's theme in `apps/<app>/src/app.css` and its DESIGN.md. Where this page and the code disagree, the code wins: fix the page in the same change. The claude.ai page is a rendering of this folder; republish it as `docs/design-system-page.md` says.

## Themes

Pick a theme at the top of the page to see every component as an app shows it.

| Theme | Light page | Accent | Icon accent | Display face | Tabs |
|---|---|---|---|---|---|
| Jerseys, "Kit wall" | sky-50 | pitch green (green-500 / green-400) | green-700 | Barlow Condensed italic, uppercase | pills |
| Vinyles, "Wall" | cream-100 | coral (coral-500 / coral-400) | coral-desire | Nunito (the default) | segmented |
| Aviary, "Parakeet" | lime-50 | lime (lime-500 / lime-400) | lime-700 / lime-400 | Lilita One, weight 400 only | pills |

Dark mode is navy-950 for every app, with the theme's near-white as ink. A theme sets these slots in its `app.css` and nothing else: `--theme-page`, `--theme-line`, `--theme-ink-dark`, `--theme-accent`, `--theme-icon-accent`, `--theme-selected`, the display face (`--display-family`, `--display-style`, `--display-transform`), `--tracking-label-value`, `--tracking-heading-value`, `--tracking-caption-value`, `--heading-page-size`, `--heading-popup-size`. The popup width (560px) and depth are the same in every app, not slots. A new app sets every slot and passes the contrast table below in light and dark.

## Principles

- **The things are the content.** Chrome stays out of their way: no cards around tiles, no decoration, no stickers, no counts or prices on a tile. The thing's own text may show on it (a jersey's print name and number). The page is a full wall.
- **Happy and round.** Every control is a pill (`radius-full`); tiles are 14px (`radius-md`); the Popup is 28px (`radius-xl`).
- **Depth is an offset, not a blur.** `shadow-raised` is a flat 3px drop under tiles and pills; a pressed button sinks into it. The Popup has no shadow: the overlay sets it apart.
- **Packed and uniform.** 8px across, 12px down, the same tile everywhere, the same pill everywhere.
- **Never:** purple, hard borders on pills, monospace type, the muted cream-and-serif look. They were tried and rejected.

## Voice

- Names come from each app's GLOSSARY.md: Jersey, Kit, Main Picture, Print; Record, Album, Desire; Wishlist Item, Store. The UI and the code use the same word.
- Labels are short, plain, sentence case: "Got it", "Drop", "Add", "Save", "Cancel", "Delete", "Log in".
- A confirmation names the thing: "Delete Blue Train?", "Delete Lyon 2023-24 · Home?".
- An empty state is one line: "No records yet", "Nothing on the wishlist", "No match".
- An error starts with "!" and says how to fix it: "! Wrong password", "! Type the price in euros, like 12,50".
- Money is euros in French format ("1 604,20 €"); every number uses tabular figures.
- No "owner only" text: Owner controls simply appear after login, and one login covers every app.

## Colour

- Page `background`; raised things (tiles, Popup, neutral buttons, the tab track) `card`. Ink `foreground`; second lines, subtitles and placeholders `muted-foreground` (#5a6a8e light, on `background` or `card` only).
- One accent per app, `primary`: the current tab and the default button, always under `primary-foreground` (navy-950), never white. Icons, dots and thin marks use `icon-accent`, never `primary`.
- Three happy fills shared by every app, with `on-chip` text: `highlight` (sun) for the count of things, `success` (mint) for total spent and every positive action, `info` (sky) for the Wishlist count.
- Fields fill with `field` (the page colour) and draw a 2px `field-border`, the only border on a control.
- Errors and Delete: `destructive` (coral-600 #c9342a light, coral-400 dark). Focus: a 3px `ring` (sky) on :focus-visible.

| Pair | Jerseys light | Vinyles light | Needs |
|---|---|---|---|
| muted-foreground on background | 4.96 | 4.92 | 4.5 |
| muted-foreground on card | 5.40 | 5.40 | 4.5 |
| primary-foreground on primary | 7.12 | 5.54 | 4.5 |
| icon-accent on background | 4.03 | 3.11 | 3 |
| ring on background | 3.04 | 3.02 | 3 |
| field-border on field | 4.96 | 4.92 | 3 |
| destructive on background | 4.81 | 4.77 | 4.5 |

Dark, both apps: foreground on background 15.6, muted 8.00, destructive 6.26. green-500 is 2.2:1 on the light page: a fill only.

## Type

- Body: Nunito 500, 700, 800 (Google Fonts), fallback ui-rounded, system-ui. `body` 14/500/1.45, `body-detail` 15 in popups, 700 for labels and errors, 800 for buttons and chip values. Numbers in tabular-nums.
- Display: the theme's face, for short labels only: page title, popup title, tab labels, the main tile caption. Jerseys sets Barlow Condensed (700, 800, italic, uppercase) with page and popup titles at 28 and 24px; Vinyles keeps Nunito at 24 and 22px, -0.025em; Aviary sets Lilita One at 28 and 24px, with no faux bold.
- Captions are two short lines under each tile (TileCaption), the same in every app: line 1 in the display face at 14/800, line 2 at 11/500 muted, both truncated. Jerseys `caption-team` over `caption-kit` ("2023-24 · Home"); Vinyles `caption-album` over `caption-artist`.

## Layout

- Mobile first. The wall: 3 columns, 5 from 640px, 7 from 900px, 8 from 1200px. Gaps 8px across, 12px down. Gutter 16px plus the safe-area insets.
- Page order: StickyBar, then the app's extras (the Jerseys CoverageMap), then the wall. The page never scrolls sideways.
- Every control is at least 44px tall, or has a 44px tap area (`icon-sm`).
- Popups: a detail Popup opens over the tapped tile, clamped to the screen; forms open centred. 560px wide at most, in every app.

## Motion

- Static by default. A hovered or focused tile lifts 3px and tilts -1.5deg (`duration-base` 150ms, `easing-out`). A pressed button sinks 3px (`duration-fast` 80ms). Pills get an 8% `currentColor` layer on hover. The Popup fades.
- Under `prefers-reduced-motion: reduce` nothing moves.

## Imagery and iconography

- The pictures of the things are the only imagery. A picture sits contained on a neutral tile (Jerseys Main Pictures; the shirt outline when there is none), except a square picture of the thing itself, which fills the tile (Vinyles album art; an initials tile when there is none). No illustrations, no emoji.
- Lucide icons (`@lucide/svelte`), stroke 2, `currentColor`: 20px in an `icon` Button, 16px in an `icon-sm` one. Every icon-only Button has a visually hidden label.
- Each app keeps its own mark (Logos). Never redraw or recolour it.

## Components

Built in SvelteKit (Svelte 5) on shadcn-svelte and bits-ui with Tailwind 4. The previews here are static HTML recreations styled by `components/bundle.css` (classes `sc-*`) over this page's tokens; the source is the repo.

- Shared, in `packages/showcase`: Button, Chip, Tabs, ToggleGroup, Field, SearchField, Select, StoreSelect, MultiSelectFilter, ThemeToggle, LoginAction, AddAction, ConfirmDialog, EmptyState, ErrorMessage, FormActions, Popup, StickyBar, TileGrid, TileCaption.
- Per app: the Collection and Wishlist forms (their fields are each app's own data; their buttons are FormActions, their errors ErrorMessage), AcquisitionFields (the shared ToggleGroup, then the app's fields) and the picture column each app passes to Popup.
- Jerseys only: Tile, CoverageMap, TeamLookup, the admin pages. Vinyles only: AlbumCover, DesireDots, DesireSelect, the cover picker and import review. Aviary only: BirdTile, BirdPopup, Parakeets (login art), SightingList, and the Bird form, PictureList, CropPicture, SimilarNames and Admin lists, which are described in the repo, not shown.

## Not on this page

- Components are static renditions: there is no `bundle.js`. CoverageMap, the forms and the admin screens are described in the repo, not shown.
- Breakpoints and timing are listed as tokens for reference; the CSS lives in the repo.
- Fonts are Google-hosted, so no font files are stored.
