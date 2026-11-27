# MultiSelectFilter

A filter that picks several values, in the StickyBar `controls`. `packages/showcase/src/components/MultiSelectFilter.svelte`, a native `<details>` pill with checkboxes. Jerseys filters by Country (one group per Continent); Vinyles by Artist (one flat group).

| Prop | Type | Notes |
|---|---|---|
| value | string[] | Bindable. Empty means all |
| label | string | Plural, capitalised: "Countries" |
| groups | `{ label?, options: { value, label }[] }[]` | A group with no label is a flat list |

- Summary: "All {label} ({n})" when nothing is picked, else "{label} ({picked})". The pill is `card` with `shadow-raised` and the focus ring.
- The list opens under the pill from its start edge, at most 320px wide and 60vh tall.
- A neutral Button "Clear filter" stays at the top while the list scrolls; it is disabled when nothing is picked.
- A group heading is in the display face, `muted-foreground`, with a checkbox that picks or clears all its options (indeterminate when some are). Checkboxes are 20px in `icon-accent`, each row 44px tall.
