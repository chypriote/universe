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
| `npm run china`  | Search flight prices (`china.js`, SerpApi)       |

## Environment

`.env` in this folder, never committed:

- `PHOTOS_URL`: public base URL of the photo bucket, no trailing slash. The build fails without it. CI reads the `PHOTOS_URL` repository variable.
- `API_KEY`: SerpApi key for `npm run china`.

Photos: `docs/photos.md`.
