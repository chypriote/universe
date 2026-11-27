# SkipLink

The first focusable element of every page, in the app's root layout. Showcase `SkipLink.svelte`.

"Skip to content" stays visually hidden until it has focus. Then it shows as a pill on `card` at the top start corner, above the StickyBar (`layer.popup`), with the focus outline. It jumps to `<main id="main">`, so every page's `<main>` has that id.
