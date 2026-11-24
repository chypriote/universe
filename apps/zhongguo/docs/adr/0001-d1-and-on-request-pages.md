# 1. Trips and Photos in D1, pages rendered on request

Date: 2026-11-24. Decided by Nico.

Nico wants an online admin at `/admin` to edit Trips and Days, upload and edit Photos, and pick Province Covers from any device. The site was static and read Trips from JSON files in `itineraries/` and Photos from `src/data/photos.json`, so every change needed a commit and a rebuild. We move Trips, Days, Cities, Photos and covers into the `zhongguo` D1 database and delete the JSON files, so D1 is the only source. Home, Trips and Gallery render on each request from D1, so a save shows at once. Guides and the Planner stay static.

## Considered options

- **Local admin that edits the JSON files** (like `scripts/photo-admin.mjs`): no runtime, but only on Nico's PC and every change needs a commit.
- **Online admin that commits the JSON to GitHub**: keeps git as the source, but each save waits for a deploy and the Worker needs a GitHub token.
- **D1 with static pages and a rebuild on each save**: pages stay static, but each save waits some minutes for the build.

## Consequences

- The admin uploads originals and browser-made `.webp` thumbnails straight to R2. The Worker cannot run `sharp`.
- `packages/owner` needs an Astro adapter beside its SvelteKit one.
