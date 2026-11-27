# Chip

One count or total in the StickyBar, on a sun, mint or sky pill. Showcase `Chip.svelte` over `ui/badge`.

| Prop | Type | Notes |
|---|---|---|
| tone | `highlight`, `success`, `info` | Sun: the count of things. Mint: total spent. Sky: the Wishlist count |
| label | string | "jerseys", "records", "spent", "wanted" |
| value | string | Already formatted: "67", "1 604,20 €" |
| icon | component | Shown in place of the label below 640px |
| compact | boolean | Hide the label below 640px, keep the value |

Text is always `on-chip` (navy-800) in every theme: value in 800, label in 700. Chips sit in an `aria-live="polite"` group. Not interactive: no hover, no focus.

Aviary does not use the StickyBar `chips` slot: its sun Chip (the Birds shown, with the tab name) sits above the Seen select, or the Nest select on the Seen tab, inside the filter row.
