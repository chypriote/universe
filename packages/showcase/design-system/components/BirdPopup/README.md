# BirdPopup

Aviary: the whole Bird, opened over its tile (Showcase Popup). `apps/aviary/src/lib/components/BirdPopup.svelte`.

- Media column on the left, `min(popup-picture-size, 40%)`: the shown Picture as a square, then a thumbnail row when there are several (each a toggle Button); with none, the initials square.
- Right: name, subtitle (Habitat and Arrival), the flags (Roosted included) and Songs as small read-only tags (text-xs, tight gap) set a little below the name, with no section labels, the notes.
- Under the media and details, full width, below a divider line: the SightingList.
- The actions row holds Edit, which opens the wide form Popup with the BirdForm; the Edit form has a danger Archive Button left of Save.
