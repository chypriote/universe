# Zhongguo glossary

**Trip**:
A journey Nico made, shown at `/trips/<slug>`. It has dated Days, Cities and Photos. Also called a Trip report. A Trip that is not made yet does not exist: it is a Trip plan.
_Avoid_: Report (alone), journey (that is the page name)

**Trip plan**:
A journey Nico recommends, shown at `/plans/<slug>`. It lives in its own table, apart from every Trip. It has numbered Days with Cities and no dates, and its own Photos (uploaded in the admin). It is not derived from a Trip and is never a Visited Province. Its good periods come from the Seasons of the Provinces of its Cities. It has two switches: Visible (off = on no page) and Search flights (off = on the Plan page, no prices, never searched).
_Avoid_: Planned trip, suggested trip, suggested itinerary (the home section title only)

**Plan Day**:
One numbered Day of a Trip plan: main City, Cities in travel order, title, notes, Activities and train rides. No date, no hotels, no restaurants.

**Copy from a plan**:
Creating a Trip: the Owner gives a title and a start date, then ticks the Plan Days to copy. They become dated Days in order from the start date, without Photos. No link to the plan stays. The new Trip is off until the Owner switches it on.

**Trip Card**:
The summary of a Trip or Trip plan on `/trips` and the home page. It names only the Trip's Major Cities. The Trip page itself lists every City.
_Avoid_: Trip overview

**Day**:
One day of a Trip: its date, main City, title, notes, photos and train rides. Its main City is where most of the Day was spent, and every Day has one. A Day can list all its Cities in travel order (the last is where it ends); it counts for each of them in the route. Train rides show at the bottom of the Day. Its number is its position among the visible Days, so it can change; its date does not. The Owner adds a Day to a Trip; a Trip has one Day per date, and its start and end dates follow its first and last Day.

**Activity**:
A place or thing to do in one City, of one kind: Nature, Heritage (temples, palaces, gardens, old towns, museums), Modern city (skylines, shopping streets, markets) or Show. It exists on its own, shared by every Day and Plan Day that lists it, like a City. It has a name in English, Chinese and pinyin, an address in English and Chinese to show a driver or a hotel, a description, and a map position found by lookup. It can be rated Do not miss, Recommended, Skippable or Avoid, and can have a price estimate (yuan per person). It has its own uploaded pictures, which are not Photos: a Plan Day shows them, a Trip Day shows only its own Photos. A Day lists its Activities in visit order, each once; the Owner can only add an Activity of a City that is on the Day. The Owner adds, edits and deletes it from the Activities, City and Province admin pages; it cannot be deleted while a Day lists it, and its City cannot be deleted while it exists. Food is not an Activity. Day trips, multi-day blocks and loops are not Activities: later, each will group several Activities.
_Avoid_: Attraction, sight, place

**City**:
A place a Trip stays in or passes through, in one Province. Shown in English and Chinese. One City is shared by every Trip that visits it. A City exists on its own, with or without Photos; the Owner adds, edits and deletes it. A City cannot be deleted while a Photo, a Day, an Activity, a hotel or a restaurant uses it.

**Major City**:
A City that gets a pin on the Gallery map, such as Xi'an, Xining or Chengdu. A minor City, such as Huanglong or Jiayuguan, gets a pin only on the map of a Trip that visits it.

**Province**:
A Chinese province, autonomous region or direct-administered city (Beijing, Shanghai, Tianjin, Chongqing) on the China map. Clicking one filters the Gallery or opens a Trip. A Photo's Province follows from its City.
_Avoid_: Region

**Visited Province**:
A Province where a visible Day of a visible Trip has its main City. Trip plans never count. Only Visited Provinces are coloured on the home map and filter the Gallery.

**Owner**:
Nico, the only person who logs in. The Owner login opens `/admin`, and every admin page and admin API refuses a request without it. It is the same login as in the other apps.

**Photo**:
A picture taken on a Trip, stored in the photo bucket. It belongs to exactly one Trip. A new Photo goes on the Day of its date; it can then be moved to another Day or taken off every Day, and still shows in the Gallery. Its date can be edited. It can have a title typed by hand, which replaces its place in captions. Pictures that belong to no Trip are site images kept in the repo, not Photos.

**On the way photo**:
A Photo taken between two Cities, for example from a train. It has no City. It can name a Province, which only its caption shows. It never makes a Province visited.

**Hidden Trip**:
A Trip switched off. It leaves every public page and counts for nothing, but stays editable in the admin.

**Hidden Day**:
A Day switched off. It leaves the Trip page and its Photos leave the Gallery. The visible Days are numbered again without it, and a City only it uses is no longer listed.

**Trip Cover**:
The one landscape Photo of a Trip, picked from that Trip's Photos, that stands for the Trip on cards and lists. It is the first Highlight Photo.

**Highlight Photos**:
The five Photos that show a Trip in the `/trips` list: the Trip Cover, then four portrait Photos, picked and ordered by hand.

**Province Cover**:
The one Photo the home map shows for a Province. It can come from any Trip, as long as its City is in that Province. Without one, the Province's first Photo is shown. A chosen cover has a focal point (x and y in percent, the centre by default) that picks the part the home map frame shows; the fallback Photo has none. Moving a City to another Province clears the Province Cover of its old Province when that cover is a Photo of the City.

**Guide**:
A practical article (visa, payments, apps, transport) at `/guides/<slug>`.

**Gallery**:
Every trip photo, grouped by Trip, at `/gallery`. Photos live in R2 (`docs/photos.md`).

**Plan page**:
The page at `/planner` (nav "Plan") that recommends when to leave for each visible Trip plan with Days: the start dates that fit it, and its 3 cheapest Fare windows once searched, built from the stored Flight searches.

**Fits the plan**:
A start date fits a Trip plan when at most 20% of its Days, counted from that date, fall outside the Season of their main City's Province.

**Planner**:
Reserved for a later tool to design a Trip (Cities, Days, trains). Not built yet. Not the Plan page.

**Season**:
The whole months in which a Province is good to visit. Each Province has its own Season.

**Airport**:
An airport of a City that has flights from Paris, named by its code (Beijing: PEK and PKX). It knows the weekdays with a direct flight from Paris, if any.

**Gateway**:
An Airport of one of a plan's Cities, where the plan can start and end: a round trip from Paris to that Airport and back.

**Fare window**:
One Gateway, an outbound date and a return date, with the cheapest price found for it (one stop or fewer; two for Lhasa and Urumqi) and whether that flight is direct.

**Flight search**:
One stored price for one Fare window, made by `npm run china` and kept in D1.
