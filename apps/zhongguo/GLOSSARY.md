# Zhongguo glossary

**Trip**:
One journey, stored as a JSON file in `itineraries/` and shown at `/trips/<slug>`. It has days, cities and optional start and end dates.

**Day**:
One day of a Trip: its number, main City, title, notes, photos and train rides.

**City**:
A place a Trip stays in or passes through, in one Province. Shown in English and Chinese. One City is shared by every Trip that visits it.

**Major City**:
A City that gets a pin on the Gallery map, such as Xi'an, Xining or Chengdu. A minor City, such as Huanglong or Jiayuguan, gets a pin only on the map of a Trip that visits it.

**Province**:
A Chinese province, autonomous region or direct-administered city (Beijing, Shanghai, Tianjin, Chongqing) on the China map. Clicking one filters the Gallery or opens a Trip. A Photo's Province follows from its City.
_Avoid_: Region

**Photo**:
A picture taken on a Trip, stored in the photo bucket. It belongs to exactly one Trip, and its date places it on a Day. Its date can be edited. Pictures that belong to no Trip are site images kept in the repo, not Photos.

**Trip Cover**:
The one Photo of a Trip, picked from that Trip's Photos, that stands for the Trip on cards and lists.

**Province Cover**:
The one Photo the home map shows for a Province. It can come from any Trip, as long as its City is in that Province. Without one, the Province's first Photo is shown.

**Guide**:
A practical article (visa, payments, apps, transport) at `/guides/<slug>`.

**Gallery**:
Every trip photo, grouped by Trip, at `/gallery`. Photos live in R2 (`docs/photos.md`).

**Planner**:
The flight table and price calendar at `/planner`, built from the stored Flight searches.

**Flight search**:
One stored price for an airport, outbound and return dates, with or without stops, made by `npm run china` and kept in D1.
