# TileGrid

The wall of tiles, shared by every app. `packages/showcase/src/components/TileGrid.svelte`, a `<ul>` whose children are `<li>`s, each keyed by the thing's id (Jersey, Record or Wishlist Item), never by index.

- Columns: 3 on a phone, 5 from 640px, 7 from 900px, 8 from 1200px.
- Gaps: 8px across (`space-200`), 12px down (`space-300`).
- Gutter: 16px plus the safe-area insets on the sides and at the bottom.
- The app puts its own tile in each cell: Tile (Jerseys) or AlbumCover (Vinyles).
