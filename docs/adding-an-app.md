# Adding an app to Universe

The steps to add a collection app (films, TV shows, books…) next to Jerseys and Vinyles. Do them in order: each one feeds the next.

An app that is not a collection picks or brings its own design family instead of Showcase (`docs/adr/0001-design-families.md`): follow steps 1, 4 and 5, write its DESIGN.md on the structure in `packages/universe/DESIGN.md`, and use the Universe layer (`universe.css`, `@universe/universe/format`, the koala in its footer). Zhongguo is the example. `<app>` is the new app's folder and Worker name, lower case (`films`).

## 1. Domain first: grill the idea into a glossary

Before any code or colour, settle what the app tracks and what its words mean.

1. Write a short brief: what Nico collects, what a Collection item and a Wishlist item hold, what gets bought where, what the Owner does that a Viewer cannot.
2. Run `/grill-with-docs` (mattpocock-skills) on that brief. It questions the plan against the repo docs (`CONTEXT-MAP.md`, the other apps' GLOSSARY.md, `docs/adr/`) and writes down the answers.
3. Its output is `apps/<app>/GLOSSARY.md`, in the same shape as the other two, plus an ADR under `apps/<app>/docs/adr/` for any decision worth keeping. Reuse the shared words (Collection, Wishlist, Store, Acquisition, Got it, Owner, Viewer) with the same meaning; name only what is new.
4. Add the app's row to `CONTEXT-MAP.md`.

Done when: every noun the UI will show is in the glossary, and every "it depends" from the grilling has an answer.

## 2. Design: pick the app's theme

An app is a Showcase theme: the structure, controls and shared colours are fixed (`packages/showcase/DESIGN.md`). The app chooses only its theme slots.

1. Choose, for the slots listed in `packages/showcase/TOKENS.md` ("Theme slots"):
   - the light page tint and line colour, and the near-white ink on the dark page;
   - the accent (light and dark) and the icon accent;
   - the pressed-Toggle colour (accent by default);
   - the display face for short labels (Nunito by default), its style and the page and popup title sizes;
   - the popup width, and the popup shadow if any.
   `/creative` (design-superpowers) helps explore a palette and a display face; keep away from what Showcase rules out (purple, hard borders on pills, mono type, the muted cream look).
2. Check the contrast table in `packages/showcase/TOKENS.md` for the new theme, light and dark: every pair must pass. Keep a failing pair out rather than flag it.
3. Decide the tile. Showcase tiles are square (records, shirts). Posters and book covers are 2:3: that needs a tile-shape slot in Showcase first. Add it in its own PR, with an issue labelled `showcase`, before the app uses it.
4. Name the app's own components: the tile (what shows on it, the placeholder when there is no picture), the Popup's picture column, the forms' fields, any extra like the Jerseys CoverageMap or the Vinyles DesireDots. Reuse Showcase for everything else (`packages/showcase/COMPONENTS.md`).
5. Write `apps/<app>/DESIGN.md`, `TOKENS.md` and `COMPONENTS.md` in the shape of the Jerseys and Vinyles ones: theme slots, app-only tokens, app-only components, nothing Showcase already says.

Done when: Nico has accepted the theme and the three files.

## 3. Scaffold the app

Copy the closer existing app (`apps/vinyles` for a list with one picture per thing) and strip its domain:

1. `package.json`: `name` = `<app>`; keep `@universe/universe`, `@universe/showcase` and `@universe/owner` (`*`) in `dependencies`. Run `npm install` at the repo root.
2. `wrangler.jsonc`: `name` = `<app>` (the Worker serves `<app>.nicolastemeni.workers.dev`); new D1 and R2 names; `"vars": { "OWNER_COOKIE_DOMAIN": "nicolastemeni.workers.dev" }`. Then `npm run types -w apps/<app>`.
3. `src/app.css`: `@import 'tailwindcss'`, `@import '@universe/universe/universe.css'`, `@import '@universe/showcase/showcase.css'`, `@source` for `packages/showcase/src` and `packages/universe/src`, then the theme slots from step 2 on `:root`.
4. `src/lib/lists.ts`: the Collection and Wishlist links for the StickyBar Tabs.
5. Keep the Owner plumbing as is: `routes/login`, `+layout.server.ts` (`isOwner`), `lib/server/owner-actions.ts`, LoginAction and the shared session from `@universe/owner`.
6. Replace the domain: `lib/server/db/schema.ts` and a first Drizzle migration, `lib/server/catalog`, the routes, the tile, the forms, `static/` (the app's own mark: favicon and home-screen icon).
7. Pages: StickyBar (`title`, `links`), AddAction, the tile grid, Popup with the app's `media` snippet, EmptyState.
8. Tests: a catalog test file in the same style, with a fake clock for any rate-limited lookup (see Jerseys `fakeClock`).
9. `README.md`: commands, Cloudflare setup, secrets, in the shape of the other two.

Done when: `npm run ci -w apps/<app>` passes and the app runs with `npm run dev -w apps/<app>`.

## 4. Wire it into the repo

1. `.github/workflows/ci.yml`: add `apps/<app>` to the matrix.
2. A GitHub label `app:<app>`; add it to `AGENTS.md` and `docs/agents/issue-tracker.md`.
3. `AGENTS.md`: nothing else changes; the rules already cover every app.

## 5. Deploy

1. Cloudflare resources: `npx wrangler d1 create <app>`, `npx wrangler r2 bucket create <app>-<pictures>`, then `npm run db:migrate:remote -w apps/<app>`.
2. Secrets, from `apps/<app>`: `OWNER_PASSWORD` and `JWT_SECRET` with the SAME values as the other apps (one login covers them all), plus the app's own API keys.
3. Workers Builds (Workers & Pages → the Worker → Settings → Build): repository `chypriote/universe`, branch `master`, root directory `apps/<app>`, build command `npm run build`, deploy command `npx wrangler deploy`, build watch paths `apps/<app>/*`, `packages/showcase/*`, `packages/owner/*`, `package-lock.json`.
4. Log in on another app, open the new one: the Owner session should already be there.

## 6. Update the design-system page

The [Showcase design-system page](https://claude.ai/artifact/Fdnc2AfpFDeiV5cE7gEVuo) shows every app as a theme (it holds at most 8: four apps, light and dark). Add the app's two themes to its `tokens.json`, its theme block (display face, title sizes, popup width) to `components/bundle.css`, its own components, and its mark under Logos. Ask Claude to do it from the new app's `app.css` and docs.
