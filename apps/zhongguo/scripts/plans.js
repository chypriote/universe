// The visible Trips, plans and past trips alike, with their Days' Seasons and their Gateways, read from D1 for `fareWindows`.
// `zh` is the Chinese name of the Province where the plan spends the most Days.
import { d1Query } from './d1.js';

/** @returns {Promise<import('./fare-windows.js').Plan[]>} */
export async function loadPlans() {
  const [trips, days, airports] = await Promise.all([
    d1Query(`SELECT id, slug, title FROM trips WHERE visible = 1 ORDER BY id`),
    d1Query(
      `SELECT days.trip_id, provinces.season, provinces.name_zh FROM days
       JOIN cities ON cities.id = days.city_id JOIN provinces ON provinces.id = cities.province_id
       WHERE days.visible = 1 ORDER BY days.trip_id, days.position`,
    ),
    d1Query(
      `SELECT days.trip_id, airports.code, airports.direct_weekdays FROM days
       JOIN airports ON airports.city_id = days.city_id WHERE days.visible = 1
       UNION
       SELECT days.trip_id, airports.code, airports.direct_weekdays FROM days
       JOIN day_cities ON day_cities.day_id = days.id JOIN airports ON airports.city_id = day_cities.city_id
       WHERE days.visible = 1
       ORDER BY 1, 2`,
    ),
  ]);
  return trips.map((trip) => {
    const own = days.filter((day) => day.trip_id === trip.id);
    const counts = new Map();
    for (const day of own) counts.set(day.name_zh, (counts.get(day.name_zh) ?? 0) + 1);
    return {
      slug: trip.slug,
      title: trip.title,
      zh: [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '',
      seasons: own.map((day) => day.season),
      gateways: airports
        .filter((airport) => airport.trip_id === trip.id)
        .map((airport) => ({ code: airport.code, directWeekdays: airport.direct_weekdays })),
    };
  });
}
