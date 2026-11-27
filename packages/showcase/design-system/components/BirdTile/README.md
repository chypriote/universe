# BirdTile

Aviary: one Bird on the wall, a square picture and a two-line caption, all one button that opens the BirdPopup. `apps/aviary/src/lib/components/BirdTile.svelte`; details in `apps/aviary/COMPONENTS.md`.

- Square picture that fills the tile, loaded only through the authenticated `/pictures/:id` route. With none, or if it fails, the initials of the first two words on a tinted square (`highlight`, `success`, `info`, `primary`, picked by the name's character codes).
- Flag icons top left, one per set flag, coloured by flag, with a soft drop shadow and no circle: Seen `info` (eye), Flown `success` (plane), Lost `destructive` (map pin off), Nest `highlight` (egg). Roosted is never shown on a tile. Each icon has a visually hidden label.
- Caption (TileCaption): the name in the display face, then the Arrival as a day or a year.
- Hover and focus: lift 3px, tilt -1.5deg, only when motion is allowed.

The preview reuses the Vinyles `sc-cover` classes: the tile has the same shape.
