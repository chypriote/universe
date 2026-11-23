# Universe components

Components every design family uses. Each has one spec here, its markup kept the same in every wrapper, and a thin wrapper per framework, written when an app needs it: `src/svelte/*.svelte`, `src/astro/*.astro`, React only for islands.

## Koala

Nico's mark (`src/koala.svg`) as an image.

- Props: `size` in px (default 20), `label` (default empty: decorative, next to text that names the app).
- Wrappers: `@universe/universe/svelte/Koala.svelte`, `@universe/universe/astro/Koala.astro`.
- Only in a footer or signature line. Never recoloured, never a button or a logo.
