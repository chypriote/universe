# Showcase components

Sources: [DESIGN.md](DESIGN.md) for the look, [TOKENS.md](TOKENS.md) for values. Components use only semantic or component tokens.

Stack: SvelteKit (Svelte 5), shadcn-svelte on bits-ui, Tailwind CSS v4. "Snippet" is a Svelte 5 slot. Props are camelCase; callbacks start with `on`.

## Using the package

- In `src/app.css`: `@import 'tailwindcss';`, `@import '@universe/showcase/showcase.css';`, `@source '../../../packages/showcase/src';`, then the app's theme slots on `:root`.
- Components: `import Button from '@universe/showcase/components/Button.svelte'`.
- shadcn-svelte parts: `import { Button } from '@universe/showcase/ui/button'`.
- `cn()` and the shadcn helper types: `@universe/showcase/utils`.
- A new shadcn-svelte part: add it with the CLI in a scratch app, move it to `src/components/ui/<name>/`, and make its imports relative.

## Shared rules

- Touch target: every control is at least `control.size.min` (44px), or has a 44px tap area.
- Focus: `outline.focus.width` in `color.outline.focus`, on `:focus-visible` only.
- Motion: hover tilt and lift only under `prefers-reduced-motion: no-preference`.
- Pills use `radius.control` and `shadow.raised`, with no border. Fields and selects add a 2px `color.border.field` border.
- Numbers use tabular-nums.
- Components set no outer margin and no width. The app's pattern sets the layout.
- The display face (`display-type` utility) only on short labels: titles, tabs, the main tile caption.

## Primitives

### Button

Intents `success` (Got it, Save, Log in), `neutral` (Drop, Cancel) and `danger` (`color.bg.danger`). Sizes: `default`, `sm`, `icon` (a 44px round pill) and `icon-sm` (a 28px pill with a 44px tap area, for packed bars). An icon Button needs a visually hidden label.

States: default, hover (8% state layer of the text colour), focus, pressed (shadow to 0, down 3px), disabled (50% opacity, no shadow), loading.

### Chip

A count or total in the StickyBar. Not interactive. Built on the `badge` part.

| Prop    | Type                                 | Default | Description                               |
| ------- | ------------------------------------ | ------- | ----------------------------------------- |
| tone    | `'highlight' \| 'success' \| 'info'` | —       | Sun, mint or sky                          |
| label   | string                               | —       | "jerseys", "spent"                        |
| value   | string                               | —       | Already formatted ("67", "4 120,00 €")    |
| icon    | Component                            | —       | Shown in place of the label below `sm`    |

### SearchField

Native `<input type="search">` with a visually hidden label.

### Select

Native `<select>`, styled as a field pill.

### Field

Visible label, native input, `error` text in `color.text.error` linked with `aria-describedby`. Types: `text`, `password`, `number`, `date`. `date` is a text input that takes `YYYY` or `YYYY-MM-DD`, with a calendar button: native date inputs cannot hold a year only. `list` links a `<datalist>`.

### ToggleGroup

Radio pills, `type="single"`: one option is always picked. Pressed: `--theme-selected` (the accent unless the app sets another).

### ErrorMessage

A form or action error in `color.text.error`, 14px / 700, `role="alert"`. It adds the leading "!". Field shows its own error the same way.

| Prop    | Type   | Default | Description               |
| ------- | ------ | ------- | ------------------------- |
| message | string | —       | "Wrong password"          |
| class   | string | —       | Grid or flex placement    |

## Components

### Tabs

Links between an app's lists, not an ARIA tab widget, on one raised track. Current tab: `color.bg.accent`, `aria-current="page"`. Label in the display face at `text-sm`, `--tracking-label`, upright: the theme's `--display-style` applies to titles and captions only.

| Prop    | Type                     | Default | Description                |
| ------- | ------------------------ | ------- | -------------------------- |
| current | string                   | —       | Key of the current list    |
| links   | `{ key, href, label }[]` | —       | `href` resolved by the app |

### TileGrid

The wall of tiles: `grid.columns` per breakpoint, gap 8px across and 12px down, gutter 16px plus safe-area insets. Children are `<li>`, keyed by the thing's id.

### TileCaption

The two lines under a tile: `title` in the display face, 14px / 800, `--tracking-caption`; `subtitle` 11px / 500, muted. Both lines truncate.

### MultiSelectFilter

A `<details>` pill with checkboxes, in the StickyBar `controls`. Summary: "All {label} ({n})" or "{label} ({picked})". The list opens under the pill from its start edge. A neutral Button "Clear filter" stays at the top while the list scrolls; it is disabled when nothing is picked. Esc closes the list and returns focus to the pill. A group with a `label` has a heading checkbox that picks or clears its options (indeterminate when some are picked).

| Prop   | Type                                                    | Default | Description                        |
| ------ | ------------------------------------------------------- | ------- | ---------------------------------- |
| value  | string[]                                                | `[]`    | Bindable. Empty = all              |
| label  | string                                                  | —       | Plural, capitalised: "Countries"   |
| groups | `{ label?, options: { value, label }[] }[]`             | —       | One group with no label for a flat list |

### FormActions

The footer row of a form. The `start` snippet (Delete, other actions on the thing) sits on the left; "Cancel" (when `onCancel` is set) then the `success` Button "Save" sit on the right. The row wraps on a narrow screen.

| Prop     | Type         | Default | Description              |
| -------- | ------------ | ------- | ------------------------ |
| busy     | boolean      | false   | Save shows `loading`     |
| disabled | boolean      | false   | Save is disabled         |
| onCancel | `() => void` | —       | Shows "Cancel"           |

### ConfirmDialog

The shadcn-svelte alert dialog, over the Popup. Title "Delete {what}?", a line on what goes, then "Cancel" and the action. Esc and "Cancel" change nothing. The action closes it and runs `onConfirm`.

| Prop           | Type         | Default | Description                      |
| -------------- | ------------ | ------- | -------------------------------- |
| open           | boolean      | false   | Bindable                         |
| title          | string       | —       | "Delete Lyon 2023-24 · Home?"    |
| text           | string       | —       | What the action does             |
| actionLabel    | string       | —       | "Delete"                         |
| onConfirm      | `() => void` | —       |                                  |
| actionDisabled | boolean      | false   |                                  |
| children       | Snippet      | —       | Between the text and the buttons |

### Popup

The dialog for one thing's details, or for a form. Built on `ui/dialog` (bits-ui), portalled to `<body>` at `layer.popup`. Each app wraps it to supply its picture column (Jerseys: the Main Picture and its thumbnails; Vinyles: the cover or initials tile).

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| open | boolean | false | Bindable |
| anchor | HTMLElement \| null | null | The tile that opened it. A detail Popup opens over it; focus goes back to it on close |
| title | string | — | `text.heading.popup` in the display face |
| subtitle | string | `''` | Under the title of a detail Popup, 15px / 700, muted |
| wide | boolean | false | Form Popup: `popup.width.wide`, no media |
| large | boolean | false | A bigger detail card (`max-w-3xl`); the actions sit bottom right of the details |
| mediaWidth | string | `var(--popup-picture-size)` | CSS width of the media column |
| stackMedia | boolean | false | Below `sm`, the media sits above the details |
| class | string | — | Extra classes on the dialog (a width) |
| onDismiss | `() => void` | — | X button, Esc, tap on the backdrop |

Snippets: `media` (set it for a detail Popup), `details`, `below` (full width under the media and details), `actions`.

Placement: a detail Popup (`media` set, not `wide`) opens over `anchor`, clamped to the screen with a 16px gutter, and stays clamped when it grows (a picture loads) or the window resizes (`ui/dialog` Content `placeOver`). A form Popup is centred.

### StickyBar

The top of every list page, sticky at `layer.sticky` on `color.bg.page`. Title row: the `title` snippet in the `<h1>`, then Chips, LoginAction and ThemeToggle. Tabs row: Tabs and the Owner's `action`, then below `sm` the search and filter icon toggles (an `icon-accent` dot marks a set search or filter). Third row: `searchBox` and `controls`, each behind its toggle below `sm`. Icon Buttons are `icon-sm`; the title row never wraps on a phone.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| title | Snippet | — | The page title |
| current | string | — | Key of the current list |
| links | `{ key, href, label }[]` | — | The app's lists, `href` already resolved |
| searchActive, filtersActive | boolean | false | Show the dot on a closed toggle |

Snippets: `title`, `chips`, `login`, `action`, `searchBox`, `controls`.

### AddAction

The Owner's `success` Button "Add" next to the Tabs. It opens a form Popup titled `title` and renders `form(close)` in it; the form calls `close` when it is done. `wide` gives the form two columns from `sm`.

### StoreSelect

A Select over the Stores, plus a last option "Add a store…". That option shows a Field for the new name and an "Add" Button; the new Store joins the list at once, before the page data reloads.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| value | string | `''` | Bindable Store id |
| stores | `{ id, name }[]` | — | |
| onAddStore | `(name) => Promise<{ id }>` | — | Creates the Store |
| label | string | "Store" | |

### SortDirection

An `icon` Button that flips `value` between `asc` and `desc`.

### ThemeToggle

An `icon-sm` Button that switches light and dark and saves the choice.

### EmptyState

A short message, and an optional action ("Clear filters"). No illustration.

### SkipLink

The first focusable element of every page, in the app's root layout: "Skip to content", visually hidden until focused, then a pill at the top start corner above the StickyBar. It jumps to `<main id="main">`, so every page's `<main>` has that id.

### Signature

The line at the bottom of every page: the koala (`packages/universe/COMPONENTS.md`) and the app's name, "Nico's jerseys". Muted, centred, after the last tile.

### LoginAction

The Owner login in the StickyBar title row. Viewer: a lock `icon-sm` Button (hidden label "Owner login") that opens a Popup with LoginForm. Owner: a gear icon link to the admin page (hidden label "Admin"). No "owner only" text.

| Prop      | Type    | Default | Description         |
| --------- | ------- | ------- | ------------------- |
| isOwner   | boolean | —       | From the page data  |
| adminHref | string  | —       | `resolve('/admin')` |

### LoginForm

The Owner login form, shown in the LoginAction Popup: one password Field and a `success` Button "Log in". It posts to the app's `/login` action.

| Prop      | Type       | Default | Description                                                                              |
| --------- | ---------- | ------- | ---------------------------------------------------------------------------------------- |
| onSuccess | () => void | —       | Called after the page data reloaded (`isOwner` flips); LoginAction closes the Popup here |

States: default, loading (the Button shows loading while the request runs), error (Field error "Wrong password", the password stays). On success the password clears and the page data reloads.
