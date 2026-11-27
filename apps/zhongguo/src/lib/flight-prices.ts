// What the Plan page shows: per plan, the start dates that fit it and its 3 cheapest Fare windows.
import {
  addDays,
  fareWindows,
  fitsPlan,
  searchRange,
  windowKey,
  type Plan,
} from '../../scripts/fare-windows.js';

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

export type PlanLane = {
  slug: string;
  title: string;
  zh: string;
  days: number;
  /** The runs of start dates that fit the plan, inclusive. */
  fits: { from: string; to: string }[];
  /** Its 3 cheapest Fare windows, cheapest first; none until searched. */
  windows: PricedWindow[];
  /** Why it has no window yet. */
  note?:
    | 'no Airport in its Cities'
    | 'no start date in season'
    | 'not searched yet'
    | 'flight search off';
};

export type FlightPrices = {
  first: string;
  last: string;
  plans: PlanLane[];
};

const SHOWN = 3;

/**
 * @param cities City name by Airport code.
 * @param today YYYY-MM-DD.
 */
export function flightPrices(
  trips: Plan[],
  searches: FlightSearch[],
  cities: Map<string, string>,
  today: string,
): FlightPrices {
  const { first, last } = searchRange(today);
  const latest = new Map<string, FlightSearch>();
  for (const search of searches) {
    const key = windowKey({
      airport: search.airport,
      outbound: search.outbound_date,
      return: search.return_date,
    });
    const current = latest.get(key);
    if (!current || search.created_at > current.created_at) latest.set(key, search);
  }

  const plans: PlanLane[] = [];
  for (const plan of trips) {
    const title = plan.title ?? plan.slug;
    if (plan.seasons.length === 0) continue;
    const windows = fareWindows([plan], today);
    const found =
      plan.search === false
        ? []
        : windows
            .map((window) => latest.get(windowKey(window)))
            .filter((search): search is FlightSearch & { price: number } => search?.price != null)
            .sort((a, b) => a.price - b.price || a.outbound_date.localeCompare(b.outbound_date))
            .slice(0, SHOWN);
    const lane: PlanLane = {
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
    };
    if (found.length === 0) {
      lane.note =
        plan.search === false
          ? 'flight search off'
          : plan.gateways.length === 0
            ? 'no Airport in its Cities'
            : windows.length === 0
              ? 'no start date in season'
              : 'not searched yet';
    }
    plans.push(lane);
  }
  plans.sort(
    (a, b) =>
      (a.windows[0]?.price ?? Infinity) - (b.windows[0]?.price ?? Infinity) ||
      a.title.localeCompare(b.title),
  );
  return { first, last, plans };
}

/** Whether a start date in the searched range fits a Trip with these Day Seasons. */
export function hasSeasonStart(seasons: number[], today: string): boolean {
  const { first, last } = searchRange(today);
  return seasons.length > 0 && fitRuns(seasons, first, last).length > 0;
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
