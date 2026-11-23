# Universe

Nico's collection apps: one app per kind of collection, all built on the Showcase design system. npm workspaces: `packages/*` and `apps/*`. Each app deploys as its own Cloudflare Worker with its own D1 and R2.

## Agent skills

### Issue tracker

Issues live in GitHub Issues for `chypriote/universe`. Each issue carries one area label: `app:jerseys`, `app:vinyles` or `showcase`. See `docs/agents/issue-tracker.md`. Older issues stay in `chypriote/jerseys` and `chypriote/vinyles`.

### Triage labels

Default labels: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context: `CONTEXT-MAP.md` at the root points to one `GLOSSARY.md` per app. See `docs/agents/domain.md`.

## Project rules

These rules override the same topics in the user's global rules.

- Merge your own PR after you review it. Do not wait for the user.
- Keep the branch name your session assigns. No `<type>/<issue>-<slug>` rename.
- The Owner login token and cookie live in `packages/owner`: one session covers every app (see an app README for `OWNER_COOKIE_DOMAIN`).
- UI used by more than one app goes in `packages/showcase`. An app keeps only its theme values and its domain components. See `packages/showcase/DESIGN.md`.
- Run a workspace script with `-w`, for example `npm run ci -w apps/jerseys`. Install from the root only.
