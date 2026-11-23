# Zhongguo glossary

**Trip**:
One journey, stored as a JSON file in `itineraries/` and shown at `/trips/<slug>`. It has days, cities and optional start and end dates.

**Day**:
One day of a Trip: its number, main City, title, notes, photos and train rides.

**City**:
A place a Trip stays in or passes through. Shown in English and Chinese.

**Region**:
A Chinese province or area on the China map. Clicking one filters the Gallery or opens a Trip.

**Guide**:
A practical article (visa, payments, apps, transport) at `/guides/<slug>`.

**Gallery**:
Every trip photo, grouped by Trip, at `/gallery`. Photos live in R2 (`docs/photos.md`).

**Planner**:
The flight table and price calendar at `/planner`, built from the stored Flight searches.

**Flight search**:
One stored price for an airport, outbound and return dates, with or without stops, made by `npm run china` and kept in D1.
