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
| compact | boolean                              | false   | Hide the label below `sm`, keep the value |

### SearchField

Native `<input type="search">` with a visually hidden label.

### Select

Native `<select>`, styled as a field pill.

### Field

Visible label, native input, `error` text in `color.text.error` linked with `aria-describedby`. Types: `text`, `password`, `number`, `date`. `date` is a text input that takes `YYYY` or `YYYY-MM-DD`, with a calendar button: native date inputs cannot hold a year only. `list` links a `<datalist>`.

### ToggleGroup

Radio pills, `type="single"`: one option is always picked. Pressed: `--theme-selected` (the accent unless the app sets another).

## Components

### Tabs

Links between an app's lists, not an ARIA tab widget. Current tab: `color.bg.accent`, `aria-current="page"`. Label in the display face at `text-sm`, `--tracking-label`.

| Prop    | Type                     | Default   | Description                                |
| ------- | ------------------------ | --------- | ------------------------------------------ |
| current | string                   | —         | Key of the current list                    |
| links   | `{ key, href, label }[]` | —         | `href` resolved by the app                 |
| variant | `'pills' \| 'segmented'` | `'pills'` | Separate raised pills, or one raised track |

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

### SortDirection

An `icon` Button that flips `value` between `asc` and `desc`.

### ThemeToggle

An icon Button that switches light and dark and saves the choice. `size`: `icon` or `icon-sm`.

### EmptyState

A short message, and an optional action ("Clear filters"). No illustration.

### LoginAction

The Owner login in the StickyBar title row. Viewer: a lock icon Button (hidden label "Owner login") that opens a Popup with LoginForm. Owner: a gear icon link to the admin page (hidden label "Admin"). No "owner only" text.

| Prop      | Type                  | Default  | Description         |
| --------- | --------------------- | -------- | ------------------- |
| isOwner   | boolean               | —        | From the page data  |
| adminHref | string                | —        | `resolve('/admin')` |
| size      | `'icon' \| 'icon-sm'` | `'icon'` | Icon Button size    |

LoginForm: one password Field and a `success` Button "Log in". It posts to the app's `/login` action. Wrong password: Field error "Wrong password". On success the page data reloads, so `isOwner` flips.
