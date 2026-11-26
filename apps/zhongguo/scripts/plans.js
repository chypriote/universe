// The visible Trip plans shown on the Plan page, with their Days' Seasons and their Gateways, read from D1 for `fareWindows`.
// `zh` is the Chinese name of the Province where the plan spends the most Days; `search` is its Search flights switch.
import { d1Query } from './d1.js';

/** @returns {Promise<import('./fare-windows.js').Plan[]>} */
export async function loadPlans() {
  const [plans, days, airports] = await Promise.all([
    d1Query(`SELECT id, slug, title, search_flights FROM plans WHERE visible = 1 ORDER BY id`),
    d1Query(
      `SELECT plan_days.plan_id, provinces.season, provinces.name_zh FROM plan_days
       JOIN cities ON cities.id = plan_days.city_id JOIN provinces ON provinces.id = cities.province_id
       ORDER BY plan_days.plan_id, plan_days.position`,
    ),
    d1Query(
      `SELECT plan_days.plan_id, airports.code, airports.direct_weekdays FROM plan_days
       JOIN airports ON airports.city_id = plan_days.city_id
       UNION
       SELECT plan_days.plan_id, airports.code, airports.direct_weekdays FROM plan_days
       JOIN plan_day_cities ON plan_day_cities.day_id = plan_days.id JOIN airports ON airports.city_id = plan_day_cities.city_id
       ORDER BY 1, 2`,
    ),
  ]);
  return plans.map((plan) => {
    const own = days.filter((day) => day.plan_id === plan.id);
    const counts = new Map();
    for (const day of own) counts.set(day.name_zh, (counts.get(day.name_zh) ?? 0) + 1);
    return {
      slug: plan.slug,
      title: plan.title,
      zh: [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '',
      search: plan.search_flights === 1,
      seasons: own.map((day) => day.season),
      gateways: airports
        .filter((airport) => airport.plan_id === plan.id)
        .map((airport) => ({ code: airport.code, directWeekdays: airport.direct_weekdays })),
    };
  });
}
