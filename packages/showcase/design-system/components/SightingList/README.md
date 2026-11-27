# SightingList

Aviary: the Sightings of a Bird, in the BirdPopup. `apps/aviary/src/lib/components/SightingList.svelte`.

One row per Sighting: the day as text in the app's date format ("3 Jan 2026", or "No day"), a round neutral `icon-sm` calendar Button that opens a hidden date input (changing or clearing the date saves) and a danger `icon-sm` delete Button that opens a ConfirmDialog first. "Add a sighting" adds a row with today's day. The first Sighting turns Seen on, and Seen stays on after the last is deleted.
