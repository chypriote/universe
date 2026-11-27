# Tile

Jerseys: one Jersey or Wishlist Item on the wall, a square tile and a two-line caption, all one button that opens the detail Popup. `apps/jerseys/src/lib/components/Tile.svelte`.

| Prop | Type | Notes |
|---|---|---|
| team | string | TileCaption line 1, `caption-team` |
| season, kitType | string | TileCaption line 2 "{Season} · {Kit Type}", `caption-kit` |
| mainPictureUrl | string or null | Null, or a failed image, shows the shirt outline (Marks) in `muted-foreground` |
| name | string or null | The Print without its number ("NICOLAS 4" gives "NICOLAS"): bottom centre, one line, ellipsis, 28px in from each side, `tile-print` |
| number | string or null | The Print's trailing digits: bottom right, 8px in, `tile-number` |
| onSelect | `(el) => void` | Gives the Popup the tile to open over and refocus |

- Square `card` frame, `radius-md`, `shadow-raised`; the Main Picture contained with padding, `loading="lazy"`, `alt=""`.
- Print name and number in `foreground` with a halo in the tile colour (3px and 4px), `aria-hidden`: the Popup lists the full Print. The Print is the jersey's own text, so Showcase allows it; no count, price or sticker.
- Never fill a tile with the kit's colour.
- Hover and focus: lift 3px, tilt -1.5deg, only when motion is allowed.
