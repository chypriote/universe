# Feature suggestions

Suggested next features for Nico to 中国, ordered by priority within each group.

Use ✅ for implemented, ❌ for not done, and — for skipped.

| # | Feature | Category | Why | Priority | Status |
|---|---------|----------|-----|----------|--------|
| 1 | High-speed rail planner | Planning | Days already store train legs. Pair them with a calendar like the flight tool: city pair, date, duration, seat class, overnight vs daytime. Rail is the real backbone of China travel. | High | — |
| 2 | Route map on each trip | Trip pages | One map of cities in order, with day numbers. Makes 12-day loops readable in seconds and fits the editorial layout. | High | ✅ |
| 3 | Trip-specific prep pack | Guides | From a plan, generate visa timing, payment setup, essential apps, SIM/eSIM, and city-by-city booking notes. Guides exist; they are not wired to a journey. | High | ❌ |
| 4 | Print / offline day sheets | Trip pages | One page per day: city, hotel, trains, attractions, food. Useful on the ground when maps and WeChat work better than a long web page. | High | ❌ |
| 5 | Bilingual layer (EN + 中文 names) | Content | Attraction and station names in both scripts. Tickets, taxis, and 12306 need the Chinese form. | High | ✅ |
| 6 | Hotel block on each day | Trip pages | The trip template has hotels; the public day log should too (name, area, nights, map pin). | Medium | — |
| 7 | Food as a first-class section | Trip pages | Treat food like attractions: dish, place, city, photo — not a leftover note. | Medium | — |
| 8 | Clone a plan onto a calendar | Archive | Archive already splits plans vs reports. Let a visitor pick start dates and see a calendar of cities without editing JSON. | Medium | ✅ |
| 9 | Season and weather overlay on the flight calendar | Planning | Flag Golden Week, Chunyun, and shoulder seasons so cheap dates are not also impossible dates. | Medium | ❌ |
| 10 | Fix the guide URL | Navigation | Nav points at `/guide`; pages live under `/guides`. Small, but it breaks the prep funnel. | High | ❌ |
| 11 | Map-linked gallery | Photography | Filter by region and city. Clicking a city should jump to that trip and day, not only a lightbox. | Medium | ✅ |
| 12 | Photo EXIF / “shot in” captions | Photography | City, date, film/camera. Fits the monograph tone better than generic alts. | Low | ❌ |
| 13 | RSS / email for new trip reports | Publishing | `@astrojs/rss` is already a dependency; the site still reads as a static brochure. | Low | — |
| 14 | Payment and connectivity checklist | Guides | Alipay/WeChat foreign-card status, eSIM vs local SIM, VPN expectations, per trip. | Medium | ❌ |
| 15 | Real-name ticket reminder | Planning | Passport name must match rail and domestic flight bookings; one callout on planner and day pages. | Medium | ❌ |
| 16 | Cost snapshot | Trip pages | Rough per-day spend from trains, hotels, and food notes, in EUR/USD and CNY. Not a booking engine. | Low | ❌ |
| 17 | Attraction reservation windows | Planning | Palace Museum, museums, and some parks need timed tickets days ahead. A per-trip list of “book by / book on” dates is more useful than another essay in Guides. | High | ❌ |
| 18 | Bilingual address cards | Trip pages | Hotel and station names in Chinese already exist. One printable card per night (name, address, nearest metro) is what taxis and 12306 actually need. | High | ❌ |
| 19 | Plan vs report diff | Archive | Archive already splits plans and reports. A compact “what changed” (dropped city, extra night, swapped train) teaches more than a second copy of the same loop. | High | ❌ |
| 20 | Station–airport pairing notes | Planning | Hongqiao vs Pudong, Beijing South vs Daxing, etc. City names on the flight calendar hide the expensive last-mile mistake. | High | ❌ |
| 21 | Walking / intensity tags per day | Trip pages | 12-day loops look even until someone hits an 18k-step old-town day after an overnight train. Tag days as light / full / transit. | Medium | ❌ |
| 22 | First 48 hours script | Guides | Jet lag, SIM, Alipay, first metro ride, first meal. Complements the prep pack without duplicating the whole guide. | Medium | ❌ |
| 23 | Related trips by region overlap | Navigation | “You are looking at Sichuan; here are the other loops that share Chengdu.” Makes the archive feel like a magazine index, not a file list. | Medium | ❌ |
| 24 | Museum / temple closed-day flags | Planning | Monday closures and festival shutdowns wreck a day log. Overlay on the cloned calendar, not only Golden Week on flights. | Medium | ❌ |
| 25 | Photo essay vs field-notes view | Photography | Same trip, two layouts: image-led monograph vs dense day sheet. Fits the print-quarterly tone and reuses existing photos. | Medium | ❌ |
| 26 | Luggage / locker notes on transfer days | Trip pages | Many China days are “arrive, stash bag, walk, evening train.” One line per transfer day is enough; no hotel UI. | Medium | ❌ |
| 27 | AQI / haze callout (seasonal) | Planning | Same job as the weather overlay, but China-specific: when photography and outdoor days are a bad bet. | Medium | ❌ |
| 28 | Searchable place index | Content | One A–Z of attractions and stations (EN + 中文) linking to trip + day. Tickets and taxis start from the name, not the narrative. | Medium | ❌ |
| 29 | “Skip next time” notes | Trip pages | Editorial, honest, and cheap: one short block on reports only. Strengthens the monograph voice. | Low | ❌ |
| 30 | Pronunciation / pinyin line | Content | Chinese names are implemented; pinyin helps before you can show a phone. Optional under each bilingual name. | Low | ❌ |
| 31 | Reading / watching list per region | Guides | Fits print-quarterly culture; keep it short and region-scoped so it does not become a blog. | Low | ❌ |
| 32 | GPX or “open in Maps” per walking day | Trip pages | Offline-adjacent without competing with WeChat Maps as the main navigator. | Low | ❌ |
| 33 | Photography constraints | Photography | Drone, tripod, and temple rules as a one-liner on gallery or day pages — not a legal wiki. | Low | ❌ |

## Do not build yet

| Feature | Why skip | Status |
|---------|----------|--------|
| Marketplace | Conflicts with the curated monograph tone. | — |
| User accounts | Overhead without a clear visitor job to do. | — |
| Generic AI itinerary chat | Weaker than curated plans plus a few sharp tools. | — |
| Regional cuisine map | Drifts into rejected “food as first-class” product. Leave food as notes unless that row is reopened. | — |

Best first slice: **rail planner + route map on trip pages** — it uses data already in the itineraries.

Next slice among open items: **attraction reservation windows + bilingual address cards** — same itinerary data, on-the-ground failure modes.
