# AlbumCover

Vinyles: one album on the wall, a square cover and a two-line caption, all one button that opens the detail Popup. `apps/vinyles/src/lib/components/Cover.svelte` and `src/lib/tile.ts` (named AlbumCover here: Cover is this page's own cover).

| Prop | Type | Notes |
|---|---|---|
| album | string | TileCaption line 1, `caption-album` (display face, 14/800, truncated) |
| artist | string | TileCaption line 2, `caption-artist` in `muted-foreground`, truncated. Never the year |
| coverUrl | string or null | Null, or a failed image, shows the initials tile |
| desire | 1 to 5 | Wishlist only: DesireDots under the caption |
| onSelect | `(el) => void` | Gives the Popup the cover to open over and refocus |

- Art: square, fills the tile (album art is the thing itself), `radius-md`, `shadow-raised`, `loading="lazy"`, `alt=""`.
- Initials tile: first letters of the first two words of the artist, `initials` style in `primary-foreground`. Fill: sum of the name's char codes mod 4 → `highlight`, `success`, `info`, `primary`, so one artist always gets one colour.
- Hover and focus: `tile-hover` lift 3px, tilt -1.5deg, only when motion is allowed.
