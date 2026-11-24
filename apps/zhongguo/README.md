# Zhongguo

Nico's travel site about China and nearby Asia: trips day by day, guides, a photo gallery and a flight price planner. Astro 7 with React islands and Tailwind CSS v4, served by the `zhongguo` Cloudflare Worker (`zhongguo.nicolastemeni.workers.dev`). Home, `/trips`, `/trips/<slug>` and `/gallery` render on each request from D1 through the Journal (`src/lib/journal`); guides and the Planner are prerendered. Domain: GLOSSARY.md. Design: DESIGN.md. Decision: `docs/adr/0001-d1-and-on-request-pages.md`.

## Commands

Run from the repo root with `-w apps/zhongguo`, or from this folder.

| Command          | What it does                                     |
| ---------------- | ------------------------------------------------ |
| `npm run dev`    | Dev server                                       |
| `npm run build`  | Build into `dist/` (prerendered pages and the Worker) |
| `npm run check`  | `astro check`                                    |
| `npm test`       | Vitest on the Journal, in the Workers runtime on a local D1 |
| `npm run ci`     | `check`, `test` and `build`; the command GitHub Actions runs |
| `npm run types`  | Regenerate `worker-configuration.d.ts` after changing `wrangler.jsonc` |
| `npm run db:migrate:local` / `db:migrate:remote` | Apply `migrations/` to the local or the remote `zhongguo` D1 |
| `npm run deploy` | Build and `wrangler deploy`                      |
| `npm run china`  | Search flight prices (`china.js`, SerpApi) into D1 |

## Environment

`.env` in this folder, never committed:

- `PHOTOS_URL`: public base URL of the photo bucket, no trailing slash. It is a runtime value of the Worker, read by the Journal: a Worker secret in production (`npx wrangler secret put PHOTOS_URL`), and in `.dev.vars` for `npm run dev`.
- `API_KEY`: SerpApi key for `npm run china`.
- `D1_API_TOKEN`: Cloudflare API token with Account · D1 · Edit. The build reads the flight searches from the `zhongguo` D1 database with it (the Planner is prerendered), and `npm run china` writes them. Only the Planner build needs it. CI reads the `D1_API_TOKEN` repository secret; Workers Builds needs it as a build variable.

Photos: `docs/photos.md`.

## Trips and Photos

They live in the `zhongguo` D1 database (`migrations/0002_journal.sql`; `0003_journal_data.sql` holds the content moved from the old JSON files). After a deploy that adds a migration, run `npm run db:migrate:remote -w apps/zhongguo`. The Journal (`src/lib/journal`) is the only reader: pages hold no rules. Its tests seed their own rows (`src/lib/journal/seed.test-helper.ts`) and leave out the data migration.

## Flight searches

They live in the `zhongguo` D1 database (`wrangler.jsonc`), table `flight_searches` (`migrations/`). `npm run china` reuses a search younger than 3 days and stores new ones; the Planner shows what is there at build time, so rebuild after a search.
