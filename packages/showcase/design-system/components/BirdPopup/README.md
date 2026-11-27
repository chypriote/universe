# BirdPopup

Aviary: the whole Bird, opened over its tile (Showcase Popup). `apps/aviary/src/lib/components/BirdPopup.svelte`.

- Media column on the left, `min(popup-picture-size, 40%)`: the shown Picture as a square, then a thumbnail row when there are several (each a toggle Button); with none, the initials square.
- Right: name, subtitle (Habitat and Arrival), the flags (Roosted included) and Songs as read-only tags with no section labels, the SightingList, the notes.
- The actions row holds Edit, which opens the wide form Popup with the BirdForm; the Edit form has a danger Archive Button left of Save.
