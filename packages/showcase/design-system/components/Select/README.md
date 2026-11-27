# Select

A native `<select>` drawn as a field pill with a chevron, for filters and sort keys. Showcase `Select.svelte` over `ui/native-select`.

The consumer gives `label` (as `aria-label`), `options` (`{ value, label }[]`) and a bindable `value`. Same box as Field; chevron-down 16px in `muted-foreground`. Keep it native: the platform picker is the right control on a phone.
