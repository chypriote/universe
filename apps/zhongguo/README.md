# Zhongguo

Nico's travel site about China and nearby Asia: trips day by day, guides, a photo gallery and a flight price planner. Static Astro 7 with React islands and Tailwind CSS v4, served by the `zhongguo` Cloudflare Worker (`zhongguo.nicolastemeni.workers.dev`). Domain: GLOSSARY.md. Design: DESIGN.md.

## Commands

Run from the repo root with `-w apps/zhongguo`, or from this folder.

| Command          | What it does                                     |
| ---------------- | ------------------------------------------------ |
| `npm run dev`    | Dev server                                       |
| `npm run build`  | Static build into `dist/`                        |
| `npm run check`  | `astro check`                                    |
| `npm run ci`     | `check` and `build`; the command GitHub Actions runs |
| `npm run deploy` | Build and `wrangler deploy`                      |
| `npm run china`  | Search flight prices (`china.js`, SerpApi) into D1 |

## Environment

`.env` in this folder, never committed:

- `PHOTOS_URL`: public base URL of the photo bucket, no trailing slash. The build fails without it. CI reads the `PHOTOS_URL` repository variable.
- `API_KEY`: SerpApi key for `npm run china`.
- `D1_API_TOKEN`: Cloudflare API token with Account · D1 · Edit. The build reads the flight searches from the `zhongguo` D1 database with it, and `npm run china` writes them. CI reads the `D1_API_TOKEN` repository secret; Workers Builds needs it as a build variable.

Photos: `docs/photos.md`.

## Flight searches

They live in the `zhongguo` D1 database (`wrangler.jsonc`), table `flight_searches` (`migrations/`). `npm run china` reuses a search younger than 3 days and stores new ones; the Planner shows what is there at build time, so rebuild after a search.
