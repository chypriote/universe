# 2. Fare windows come from the plans and the Province Seasons

Date: 2026-11-25. Decided by Nico.

SerpApi gives about 1,000 flight searches a month. Nico has no fixed date or place to leave for: any month and any weekday suit him, as long as the flight is affordable and the region is in its good season. So the Plan page does not show a price for every day. It recommends, for each visible Trip (plans and past trips, so viewers see the best seasons too), the 3 cheapest Fare windows that fit the plan.

- Each Province has a Season (whole months), set in the admin. A City has its Airports, each with the weekdays of a direct flight from Paris.
- A plan's Gateways are the Airports of its Cities. Searches are round trips to one Gateway only.
- One search per Gateway per week: on a direct-flight weekday when the Airport has some, else on Friday. The trip length is the plan's number of Days, rounded up to whole weeks when the Gateway has direct flights on some weekdays only, so the return is also a direct day. One search asks for one stop or fewer (two for Lhasa and Urumqi, which few one-stop flights reach) and records whether the cheapest flight is direct.
- A start date fits a plan when at most 20% of its Days, counted from that date, fall outside the Season of their main City's Province.
- Start dates run from 27 March 2027 or two weeks from today, whichever is later, to 10 months from today.
- `npm run china` stays a hand-run script. It searches the windows with the oldest price first (never searched first) and stops when SerpApi has no calls left that month, so every call refreshes the stalest price.
- A plan with no Days has no Fare windows. Hidden Trips, and Trips switched off the Plan page in the admin, show nothing and are not searched. Vietnam and Japan are not searched for now.

## Considered options

- **Hand-made date windows per airport in `china.js`** (before): every new plan needed a code edit, and the page showed raw prices with gaps.
- **A Season per plan**: simpler, but the same Province would get a different Season in each plan, and a plan through several regions could not shift with the route.
- **The whole trip inside the months all its Provinces share**: strict, and often empty for long trips across regions.
- **A price for every day**: the budget cannot cover it.
- **Open-jaw flights (in at one Airport, out at another)**: more searches and a different search type. Later, maybe.
- **Scheduled searches with a monthly cap**: more to build, and Nico wants to run the script himself for now.
