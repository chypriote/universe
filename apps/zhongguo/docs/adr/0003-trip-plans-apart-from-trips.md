# 3. Trip plans live apart from Trips

Date: 2026-11-26. Decided by Nico.

A Trip is what Nico did. A Trip plan is what he recommends. They differ: his own Yunnan winter trip is half irrelevant to a visitor, so it must not feed the Plan page or its flight searches. Until now a Trip was a "plan" when its last Day was not past, with nothing stored.

- Trip plans have their own tables (plans, plan days, plan day attractions, plan day train rides, plan photos, plan highlight photos). They share Cities and Provinces with Trips.
- Plan Days are numbered and carry no dates. A plan stores no start date and no Season: its good periods come from the Provinces of its Cities (see ADR 0002).
- Plan Photos are uploaded in the admin (Wikimedia loading is a later issue). They never show in the Gallery or on the Visited Provinces map. Their files sit under `trips/<slug>/` in the bucket, as a Trip's do, so a slug is unique across Trips and plans.
- A plan has Visible and Search flights switches. The old `trips.on_plan` column is dropped.
- A Trip is created by hand, with an option to copy chosen Plan Days into it. No link is kept.
- Routes: `/trips` and `/trips/<slug>` stay for Trips; `/plans/<slug>` is new. The Plan page stays at `/planner`. The admin has one page for Trips and one for plans.
- Migration: Xinjiang, Tibet and Jiangnan Autumn move to plans; the Jiangnan Autumn Trip is deleted. Yunnan winter and the other Trips stay Trips only.
- The Plan page, flight searches (`china.js`) and the home "Suggested itineraries" section read plans only.

## Considered options

- **A stored kind on the trips table**: reuses the Days code, but a report and a plan share fields (dates, Photos, hotels) that do not mean the same thing.
- **Keep the derived type and add a "not recommended" flag**: smallest change, but it keeps a past trip's dated Days in the plan model.
- **A link from a Trip to its plan**: nothing needs it yet.
