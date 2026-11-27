# LoginAction

The one Owner login, the same in every app. Showcase `LoginAction.svelte` and `LoginForm.svelte`.

- Viewer: a lock icon Button (hidden label "Owner login") that opens a centred Popup with LoginForm: one password Field and a `success` Button "Log in". Wrong password: "! Wrong password".
- Owner: a gear icon link to the app's admin page (hidden label "Admin").

| Prop | Type | Notes |
|---|---|---|
| isOwner | boolean | From the page data |
| adminHref | string | `resolve('/admin')` |
| size | `icon`, `icon-sm` | Matches the app's StickyBar |

One session covers every app: the `owner` cookie is set on the shared parent domain (`OWNER_COOKIE_DOMAIN`, `packages/owner`). No "owner only" text anywhere: Owner controls simply appear.
