# TileCaption

The two short lines under every tile. `packages/showcase/src/components/TileCaption.svelte`.

| Prop | Type | Notes |
|---|---|---|
| title | string | Line 1: the theme's display face, 14px / 800, `--tracking-caption` (Jerseys 0.02em, Vinyles 0). Jerseys: Team; Vinyles: Album |
| subtitle | string | Line 2: 11px / 500, `muted-foreground`. Jerseys: "{Season} · {Kit Type}"; Vinyles: Artist |

- Both lines stay on one line and end in an ellipsis, so every row of the wall keeps the same height.
- 8px above, 2px in from each side. The tile button names the thing, so the picture keeps `alt=""`.
- Vinyles puts DesireDots under it on the Wishlist.
