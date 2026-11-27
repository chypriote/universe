# Universe

Nico's apps. The collection apps (Jerseys, Vinyles) share the Showcase design system; other apps, like Zhongguo, bring their own design family (`docs/adr/0001-design-families.md`). npm workspaces: `packages/*` and `apps/*`. Each app deploys as its own Cloudflare Worker.

## Agent skills

### Issue tracker

Issues live in GitHub Issues for `chypriote/universe`. Each issue carries one area label: `app:jerseys`, `app:vinyles`, `app:aviary`, `app:zhongguo`, `showcase` or `universe`. See `docs/agents/issue-tracker.md`. Older issues stay in `chypriote/jerseys`, `chypriote/vinyles` and `chypriote/nico-zhongguo`.

### Triage labels

Default labels: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context: `CONTEXT-MAP.md` at the root points to one `GLOSSARY.md` per app. See `docs/agents/domain.md`.

## Project rules

These rules override the same topics in the user's global rules.

- Merge your own PR after you review it. Do not wait for the user.
- Keep the branch name your session assigns. No `<type>/<issue>-<slug>` rename.
- The Owner login token and cookie live in `packages/owner`: one session covers every app (see an app README for `OWNER_COOKIE_DOMAIN`).
- What every app shares, whatever its family (motion timings, formats, the koala), goes in `packages/universe`. See `packages/universe/DESIGN.md`.
- UI used by more than one collection app goes in `packages/showcase`. A collection app keeps only its theme values and its domain components. See `packages/showcase/DESIGN.md`.
- The Showcase design-system page is the files in `packages/showcase/design-system/`. Change them in the PR that changes a token, theme slot or Showcase component, then republish (`docs/design-system-page.md`).
- To add an app, follow `docs/adding-an-app.md` in order: domain (`/grill-with-docs`), theme, scaffold, repo wiring, deploy, design-system page.
- Review a PR against `CODING_STANDARDS.md`.
- Run a workspace script with `-w`, for example `npm run ci -w apps/jerseys`. Install from the root only.
