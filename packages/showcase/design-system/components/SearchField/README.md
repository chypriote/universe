# SearchField

The StickyBar search: a native `<input type="search">` in the Field box, with a visually hidden label. Showcase `SearchField.svelte`.

The consumer gives `label` (also the placeholder, e.g. "Search team or print", "Search artist or album") and a bindable `value`. It grows to fill the row (`flex: 1`, basis 192px). Below 640px it sits behind a search icon toggle in the StickyBar.
