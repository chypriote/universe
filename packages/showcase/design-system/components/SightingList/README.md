# SightingList

Aviary: the Sightings of a Bird, in the BirdPopup. `apps/aviary/src/lib/components/SightingList.svelte`.

One row per Sighting: a date input (empty means no day; changing or clearing it saves) and a danger `icon-sm` delete Button that opens a ConfirmDialog first. "Add a sighting" adds a row with today's day. The first Sighting turns Seen on, and Seen stays on after the last is deleted.
