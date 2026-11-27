# Aviary

Private app, Owner login only.

## Commands

Run from the repo root with `-w apps/aviary`, for example `npm run ci -w apps/aviary`.

| Command                    | What it does                                                          |
| -------------------------- | --------------------------------------------------------------------- |
| `npm run dev`              | Dev server                                                            |
| `npm run ci`               | `verify`, `test` and `build`; the same command GitHub Actions runs    |
| `npm test`                 | Vitest in the Workers runtime (real D1 with migrations, real R2)      |
| `npm run types`            | Regenerate `worker-configuration.d.ts` after editing `wrangler.jsonc` |
| `npm run db:generate`      | New Drizzle migration from `src/lib/server/db/schema.ts`              |
| `npm run db:migrate:local` | Apply migrations to the local D1                                      |
| `npm run db:seed:local`    | Fake labels (each word equals its code name) into the local D1        |
| `npm run db:migrate:remote`| Apply migrations to the production D1                                 |

## Cloudflare setup (the Owner runs these)

1. Create the D1 database: `npx wrangler d1 create aviary`, then put the `database_id` in `wrangler.jsonc`.
2. Create the private R2 bucket: `npx wrangler r2 bucket create aviary`. Do not add a public URL or a custom domain.
3. Run the remote migration: `npm run db:migrate:remote -w apps/aviary`. The `labels` table is created empty.
4. Set the secrets, with the SAME values as the other Universe apps (one login covers them all), from `apps/aviary`:
   - `npx wrangler secret put OWNER_PASSWORD`
   - `npx wrangler secret put JWT_SECRET`
5. Workers Builds (Workers & Pages, the Worker, Settings, Build): repository `chypriote/universe`, branch `master`, root directory `apps/aviary`, build command `npm run build`, deploy command `npx wrangler deploy`, build watch paths `apps/aviary/*`, `packages/showcase/*`, `packages/owner/*`, `package-lock.json`.
6. Open the app: it shows the login page. Log in on another Universe app first and the session is already there.

`OWNER_COOKIE_DOMAIN` is a var in `wrangler.jsonc`, not a secret.

For local dev, put the two secrets in `.dev.vars` (git-ignored), then run `npm run db:migrate:local` and `npm run db:seed:local`:

```
OWNER_PASSWORD=change-me
JWT_SECRET=change-me-too
```

Bindings: `DB` (D1), `PICTURES` (R2, private).

## Layout

- `src/hooks.server.ts` and `src/lib/server/guard.ts`: the access guard. Nothing is reachable without the Owner session.
- `src/lib/server/catalog/`: the Catalog, the one test seam. `types.ts` is its interface.
- `src/lib/server/db/schema.ts`: Drizzle schema. `drizzle/`: migrations.
- Docs: [GLOSSARY.md](GLOSSARY.md), [DESIGN.md](DESIGN.md), [TOKENS.md](TOKENS.md), [COMPONENTS.md](COMPONENTS.md).
