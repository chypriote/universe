# DesireSelect

Vinyles: picks a Desire. The Wishlist filter ("Any desire", then 5 to 1) and the Desire field of the Wishlist form (3 at first). `apps/vinyles/src/lib/components/DesireSelect.svelte`.

A Select pill. Options run from "5 (most wanted)" down to "1 (least wanted)". `placeholder` adds the empty option for a filter. The consumer gives `value`, `label`, `placeholder` and `onPick(level or null)`.
