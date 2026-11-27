# 4. Trip and plan pages from JSON snapshots in the photo bucket

Date: 2026-11-27. Nico asked for one JSON file per Trip and plan; Claude chose where it lives.

A Trip or plan page runs about 50 D1 queries (Days, Cities, Photos, Activities, rides). The free D1 plan counts rows read, and these queries scan large tables, so a few refreshes and agent runs used the daily quota. A page now reads one stored JSON snapshot of the finished `TripPage`; D1 is read only to build it.

- `getTrip` and `getPlan` go through `withSnapshots` (`src/lib/journal/snapshots.ts`). A miss builds the page from D1 and stores it at `snapshots/<build id>/<trip|plan>/<slug>.json`. A page that does not exist stores nothing.
- Any successful admin write (a non-GET request to `/api/admin`, in the middleware) deletes every snapshot. A Trip, a plan, an Activity, a City or a Province can change many pages, so one rule beats a map of what depends on what. The cost is a rebuild of each page after a save, which is the load before this ADR.
- A snapshot is also stale after a deploy (the build id is in the key) and after one hour (`MAX_AGE_MS`), because a data migration run by hand does not pass through the admin.
- A bucket error never breaks a page: it falls back to D1.
- The Plan page, the home page, `/trips`, `/gallery` and the admin read D1 as before. Each can get the same snapshot later.

## Considered options

- **Workers KV**: fastest reads, but eventually consistent (a save would not show at once, against ADR 0001) and the free plan allows 1,000 writes and deletes a day, which an upload session can pass. It also needs a new namespace.
- **Cache API**: per data centre and not purgeable from another one, so a save could not drop it.
- **A snapshot table in D1**: one row read per page, but it keeps the page on the scarce quota, needs a migration, and adds a write to the same database.
- **A snapshot per Trip, dropped only for the Trip that changed**: needs every write to know the pages it touches. Activities and Cities are shared between Trips and plans.
- **R2, in the photo bucket** (chosen): strongly consistent, free plan of 10 million reads and 1 million writes a month, no new resource, already bound as `PHOTOS`.

## Consequences

- The bucket is public, so a snapshot can be fetched at `PHOTOS_URL/snapshots/...`. It holds what the public page shows (visible Trips and plans only), nothing else.
- A page built while a save runs can store the old data until the next save or one hour.
