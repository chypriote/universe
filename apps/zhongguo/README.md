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
| `npm run china`  | Search the plans' Fare windows (`china.js`, SerpApi) into D1 |

## Environment

`.env` in this folder, never committed:

- `PHOTOS_URL`: public base URL of the photo bucket, no trailing slash. It is a runtime value of the Worker, read by the Journal: a Worker secret in production (`npx wrangler secret put PHOTOS_URL`), and in `.dev.vars` for `npm run dev`.
- `OWNER_PASSWORD` and `JWT_SECRET`: the Owner password and the key that signs the login token, the same values as in the other Universe apps so one login covers them all. Worker secrets (`npx wrangler secret put OWNER_PASSWORD`, `npx wrangler secret put JWT_SECRET`) and in `.dev.vars` for `npm run dev`. Without them nobody can log in.
- `OWNER_COOKIE_DOMAIN`: a var in `wrangler.jsonc`, not a secret: the parent domain all the apps share. Empty keeps the login on this app only.
- `API_KEY`: SerpApi key for `npm run china`.
- `D1_API_TOKEN`: Cloudflare API token with Account · D1 · Edit. The build reads the flight searches from the `zhongguo` D1 database with it (the Planner is prerendered), and `npm run china` writes them. Only the Planner build needs it. CI reads the `D1_API_TOKEN` repository secret; Workers Builds needs it as a build variable.

Photos: `docs/photos.md`.

## Admin

`/admin` is behind the Owner login (`/admin/login`, same cookie as the other apps through `packages/owner`). The Journal holds the login and token check; `src/middleware.ts` refuses every `/admin` page and `/api/admin` request without a valid token (pages redirect to the login, the API answers 401). Admin pages render on request and are `noIndex`; no public page links to them. `/admin/photos` uploads, edits and deletes Photos and adds Cities (`docs/photos.md`); `/admin/cities` picks a City and edits it, moves its Photos to another City and deletes it when nothing uses it (changing its Province clears the Province Cover of the old Province when that cover is one of its Photos); `/admin/trips` lists every Trip with its on/off switch, and `/admin/trips/<slug>` adds a Day to any Trip, a plan included (date, main City, title, notes; one Day per date; Days stay in date order; the Trip dates become the first and last Day date; Photos of that date on no Day join it; no migration) and edits a Trip with Days (Trip Cover, Highlight Photos, each Day's switch, title, notes, main City and Photos, placed by drag and drop with `@dnd-kit`); `/admin/provinces` sets each Province's Season, adds Cities to it and edits the Airports of its Cities with their direct-flight weekdays; `/admin/home` lists the Visited Provinces and picks or clears each Province Cover from the Photos of its Cities and, by dragging the cover in the home map frame (mouse or touch), sets its focal point (saved on release, applied as `object-position`; a new cover resets it to the centre; a cover shows on the home map at once; a Province that stops being visited leaves the list and keeps its cover).

## Trips and Photos

They live in the `zhongguo` D1 database (`migrations/0002_journal.sql`; `0003_journal_data.sql` holds the content moved from the old JSON files). After a deploy that adds a migration, run `npm run db:migrate:remote -w apps/zhongguo`. The Journal (`src/lib/journal`) is the only reader and writer: pages and API routes hold no rules. Its tests seed their own rows (`src/lib/journal/seed.test-helper.ts`) and leave out the data migration.

## Flight searches

They live in the `zhongguo` D1 database (`wrangler.jsonc`), table `flight_searches` (`migrations/`). `npm run china` reads the visible plans, their Days' Seasons and Gateways from D1, lists their Fare windows (`scripts/fare-windows.js`, rules in `docs/adr/0002-fare-windows-from-plans.md`) and searches them never-searched first, then oldest first, until the SerpApi account has no searches left. A window with no flight is stored without a price. The Planner shows what is there at build time, so rebuild after a search.
