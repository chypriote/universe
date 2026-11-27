# StoreSelect

Pick the Store of a Purchase, or add a new one. Showcase `StoreSelect.svelte`.

A Select over the Stores, plus a last option "Add a store…". Picking it shows a Field for the new name and an "Add" Button; the new Store joins the list at once, before the page data reloads.

| Prop | Type | Notes |
|---|---|---|
| value | string | Bindable Store id |
| stores | `{ id, name }[]` | |
| onAddStore | `(name) => Promise<{ id }>` | Creates the Store |
| label | string | "Store" by default |
