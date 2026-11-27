# Parakeets

Aviary: the decorative art of the login page. `apps/aviary/src/lib/components/Parakeets.svelte`.

Five static inline SVG parakeets peek up from the bottom edge, every second one mirrored; below 640px three, smaller, in the flow under the form so they never cover it. Colours come from `parakeet-body`, `parakeet-outline`, `parakeet-wing` and `parakeet-beak`; outline is 3:1 or more on the page and wing and beak 3:1 or more on the body, in light and dark. `aria-hidden`, no pointer events, no data. The preview shows three.
