// Which Fare windows to search for the plans (docs/adr/0002-fare-windows-from-plans.md).
// Plain JS: `npm run china` runs it with node, the Flight prices page and the tests import it.

/** Start dates begin on this date, or two weeks from today when that is later. */
export const FIRST_START = '2027-03-27';
const MONTHS_AHEAD = 10;
const FRIDAY = 5;
const EVERY_DAY = 0b1111111;
/** A start date fits when at most this share of the plan's Days fall outside their Province's Season. */
const LEEWAY = 0.2;

/**
 * @typedef {{ code: string, directWeekdays: number }} Gateway  directWeekdays: bit 0 = Monday
 * @typedef {{ slug: string, title?: string, zh?: string, seasons: number[], gateways: Gateway[] }} Plan  seasons: the Season bits (bit 0 = January) of each Day's Province, in Day order
 * @typedef {{ slug: string, airport: string, outbound: string, return: string }} FareWindow
 */

/** @param {string} date YYYY-MM-DD @param {number} days */
export function addDays(date, days) {
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

/** @param {string} date @param {number} months */
function addMonths(date, months) {
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next.toISOString().slice(0, 10);
}

/** 1 = Monday … 7 = Sunday. @param {string} date */
function isoWeekday(date) {
  return ((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
}

/** Whether a plan starting on this date has at most 20% of its Days outside their Province's Season. */
export function fitsPlan(/** @type {number[]} */ seasons, /** @type {string} */ start) {
  const outside = seasons.filter((season, index) => {
    const month = Number(addDays(start, index).slice(5, 7));
    return !(season & (1 << (month - 1)));
  }).length;
  return outside <= seasons.length * LEEWAY;
}

/** The first and last start dates searched from this day (YYYY-MM-DD). */
export function searchRange(/** @type {string} */ today) {
  const soonest = addDays(today, 14);
  return { first: soonest > FIRST_START ? soonest : FIRST_START, last: addMonths(today, MONTHS_AHEAD) };
}

/**
 * Every Fare window of the plans: one start per Gateway per week, on a direct-flight weekday when the Airport has
 * direct flights on some weekdays only, else on Friday. A plan with no Days or no Gateway has none.
 * @param {Plan[]} plans @param {string} today YYYY-MM-DD @returns {FareWindow[]}
 */
export function fareWindows(plans, today) {
  const { first, last } = searchRange(today);
  const windows = [];
  for (const plan of plans) {
    if (plan.seasons.length === 0) continue;
    for (const gateway of plan.gateways) {
      const someDays = gateway.directWeekdays !== 0 && gateway.directWeekdays !== EVERY_DAY;
      const startBits = someDays ? gateway.directWeekdays : 1 << (FRIDAY - 1);
      // Whole weeks keep the return on the same weekday, so it is a direct day too.
      const length = someDays ? Math.ceil(plan.seasons.length / 7) * 7 : plan.seasons.length;
      for (let start = first; start <= last; start = addDays(start, 1)) {
        if (!(startBits & (1 << (isoWeekday(start) - 1)))) continue;
        if (!fitsPlan(plan.seasons, start)) continue;
        windows.push({ slug: plan.slug, airport: gateway.code, outbound: start, return: addDays(start, length) });
      }
    }
  }
  return windows;
}

/** @param {{ airport: string, outbound: string, return: string }} window */
export const windowKey = (window) => `${window.airport}|${window.outbound}|${window.return}`;

/**
 * The windows to search, each once: never searched first, then the oldest search first.
 * @param {FareWindow[]} windows @param {Map<string, string>} lastSearched windowKey → created_at of its newest search
 */
export function searchOrder(windows, lastSearched) {
  const unique = [...new Map(windows.map((window) => [windowKey(window), window])).values()];
  const age = (/** @type {FareWindow} */ window) => lastSearched.get(windowKey(window)) ?? '';
  return unique
    .map((window, index) => ({ window, index }))
    .sort((a, b) => age(a.window).localeCompare(age(b.window)) || a.index - b.index)
    .map(({ window }) => window);
}
