# 4. Pages from JSON snapshots in the photo bucket

Date: 2026-11-27. Nico asked for one JSON file per Trip and plan; Claude chose where it lives.

A Trip or plan page runs about 50 D1 queries, and the home page, `/trips` and the Plan page load every Trip with all its Photos two or three times (Days, Cities, Photos, Activities, rides). The free D1 plan counts rows read, and these queries scan large tables, so a few refreshes and agent runs used the daily quota. A page now reads one stored JSON snapshot of the finished `TripPage`; D1 is read only to build it.

- The Journal reads that feed a public page go through `withSnapshots` (`src/lib/journal/snapshots.ts`): `getTrip`, `getPlan`, `listTripCards`, `listPlanCards`, `getHomeMap`, `getGallery` and `getFareData`. A miss builds the page from D1 and stores it at `snapshots/<build id>/<name>[/<slug>].json`. A page that does not exist stores nothing.
- Any successful admin write (a non-GET request to `/api/admin`, in the middleware) deletes the snapshots it can change, chosen by the route (`snapshotsChangedBy`): Trip routes drop the Trip pages, their lists, the home map and the Gallery; plan routes drop the plan pages, their list and the fares; Seasons and Airports drop the fares; Province covers drop the home map. Cities, Activities and any route not listed feed every page, so they drop all. A new route is safe by default: it drops all.
- A snapshot is also stale after a deploy (the build id is in the key) and after 7 days (`MAX_AGE_MS`), because a data migration run by hand does not pass through the admin. After such a migration, any admin save in the right area refreshes the pages at once.
- A bucket error never breaks a page: it falls back to D1. A D1 error (the daily read quota, say) serves the expired snapshot of the same build when there is one.
- The flight searches are written by `npm run china`, not through the admin, so the fare data expires after 1 day (`FARES_MAX_AGE_MS`) and new prices show within a day.
- The admin reads D1 as before.

## Considered options

- **Workers KV**: fastest reads, but eventually consistent (a save would not show at once, against ADR 0001) and the free plan allows 1,000 writes and deletes a day, which an upload session can pass. It also needs a new namespace.
- **Cache API**: per data centre and not purgeable from another one, so a save could not drop it.
- **A snapshot table in D1**: one row read per page, but it keeps the page on the scarce quota, needs a migration, and adds a write to the same database.
- **A snapshot per Trip, dropped only for the Trip that changed**: needs every write to know the pages it touches. Activities and Cities are shared between Trips and plans.
- **R2, in the photo bucket** (chosen): strongly consistent, free plan of 10 million reads and 1 million writes a month, no new resource, already bound as `PHOTOS`.

## Consequences

- The bucket is public, so a snapshot can be fetched at `PHOTOS_URL/snapshots/...`. It holds what the public page shows (visible Trips and plans only), nothing else.
- A page built while a save runs can store the old data until the next save in its area or 7 days.
