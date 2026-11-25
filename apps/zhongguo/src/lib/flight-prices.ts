// What the Flight prices page shows: per plan, the start dates that fit it and its 3 cheapest Fare windows.
import { addDays, fareWindows, fitsPlan, searchRange, windowKey, type Plan } from '../../scripts/fare-windows.js';

/** A stored Flight search, as `flight_searches` holds it. */
export type FlightSearch = {
  airport: string;
  stops: 'stop' | 'nostop';
  price: number | null;
  outbound_date: string;
  return_date: string;
  searched_on: string;
  created_at: string;
};

export type PricedWindow = {
  airport: string;
  city: string;
  outbound: string;
  return: string;
  price: number;
  direct: boolean;
  searchedOn: string;
};

export type PricedPlan = {
  slug: string;
  title: string;
  zh: string;
  days: number;
  /** The runs of start dates that fit the plan, inclusive. */
  fits: { from: string; to: string }[];
  /** Its 3 cheapest Fare windows, cheapest first. */
  windows: PricedWindow[];
};

export type UnpricedPlan = { title: string; reason: string };

export type FlightPrices = {
  first: string;
  last: string;
  priced: PricedPlan[];
  unpriced: UnpricedPlan[];
};

const SHOWN = 3;

/**
 * @param cities City name by Airport code.
 * @param today YYYY-MM-DD.
 */
export function flightPrices(plans: Plan[], searches: FlightSearch[], cities: Map<string, string>, today: string): FlightPrices {
  const { first, last } = searchRange(today);
  const latest = new Map<string, FlightSearch>();
  for (const search of searches) {
    const key = windowKey({ airport: search.airport, outbound: search.outbound_date, return: search.return_date });
    const current = latest.get(key);
    if (!current || search.created_at > current.created_at) latest.set(key, search);
  }

  const priced: PricedPlan[] = [];
  const unpriced: UnpricedPlan[] = [];
  for (const plan of plans) {
    const title = plan.title ?? plan.slug;
    if (plan.seasons.length === 0) {
      unpriced.push({ title, reason: 'no Days yet' });
      continue;
    }
    if (plan.gateways.length === 0) {
      unpriced.push({ title, reason: 'no Airport in its Cities' });
      continue;
    }
    const windows = fareWindows([plan], today);
    if (windows.length === 0) {
      unpriced.push({ title, reason: 'no start date in season' });
      continue;
    }
    const found = windows
      .map((window) => latest.get(windowKey(window)))
      .filter((search): search is FlightSearch & { price: number } => search?.price != null)
      .sort((a, b) => a.price - b.price || a.outbound_date.localeCompare(b.outbound_date))
      .slice(0, SHOWN);
    if (found.length === 0) {
      unpriced.push({ title, reason: 'not searched yet' });
      continue;
    }
    priced.push({
      slug: plan.slug,
      title,
      zh: plan.zh ?? '',
      days: plan.seasons.length,
      fits: fitRuns(plan.seasons, first, last),
      windows: found.map((search) => ({
        airport: search.airport,
        city: cities.get(search.airport) ?? search.airport,
        outbound: search.outbound_date,
        return: search.return_date,
        price: search.price,
        direct: search.stops === 'nostop',
        searchedOn: search.searched_on,
      })),
    });
  }
  priced.sort((a, b) => a.windows[0].price - b.windows[0].price);
  return { first, last, priced, unpriced };
}

function fitRuns(seasons: number[], first: string, last: string) {
  const runs: { from: string; to: string }[] = [];
  for (let date = first; date <= last; date = addDays(date, 1)) {
    if (!fitsPlan(seasons, date)) continue;
    const run = runs.at(-1);
    if (run && addDays(run.to, 1) === date) run.to = date;
    else runs.push({ from: date, to: date });
  }
  return runs;
}
