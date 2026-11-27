# Popup

The dialog for one thing's details, or for a form. Showcase `Popup.svelte` on `ui/dialog` (bits-ui), portalled to `<body>` at `layer-popup`. Each app wraps it only to supply its picture column as the `media` snippet; `mediaWidth`, `stackMedia` (Vinyles stacks the cover on a phone) and `large` cover the rest.

## Placement

- **Detail Popup** (opened from a tile): opens over the tapped tile, clamped to the screen 16px from each edge (`placeOver`). It stays clamped when it grows (a picture loads) or the window resizes.
- **Form Popup** (Add, Edit, Got it, login, confirm): centred.

## Box

`card`, `radius-xl` (28px), 18px padding, `popup-width-max` (560px in every app; a Vinyles cover Popup 672px, its large Collection one 768px), form Popup `popup-width-wide` (672px). No shadow: depth is never a blur. Over `overlay`.

## Content

- Title in the theme's popup heading (`--heading-popup-size`, display face), balanced, room left for the close button. Subtitle 15px / 700 `muted-foreground`. Details are a `<dl>` in `body-detail`.
- Jerseys: the Main Picture in a portrait 3:4 column, `popup-picture-size` (180px, at most 40% on a phone), extra Pictures as 44px thumbnails under it.
- Vinyles: the cover (or initials tile) in a `popup-cover-size` column; the Collection Popup is large (`popup-cover-size-large`), actions bottom right.
- Close: a round 44px button top right on `background`, `muted` on hover. The X, Esc and a tap outside all close it. Focus goes back to the tile that opened it. It fades in over 150ms.
