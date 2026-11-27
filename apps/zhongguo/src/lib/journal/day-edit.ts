import type { TripTables } from './tables';
import type { EditDayInput, EditDayResult } from './types';

/** Edits the text, main City and route of a Day. The same rules for Trips and plans. */
export async function editDayRows(env: { DB: D1Database }, t: TripTables, input: EditDayInput): Promise<EditDayResult> {
  const all = async <T>(sql: string, ...params: (string | number)[]): Promise<T[]> =>
    (await env.DB.prepare(sql).bind(...params).all<T>()).results;

  const day = await env.DB.prepare(`SELECT id FROM ${t.days} WHERE id = ?`).bind(input.dayId).first();
  if (!day) return { ok: false, error: 'unknown-day' };
  const title = input.title?.trim();
  if (title === '') return { ok: false, error: 'invalid-title' };
  if (input.cityId !== undefined && !(await env.DB.prepare('SELECT id FROM cities WHERE id = ?').bind(input.cityId).first())) {
    return { ok: false, error: 'unknown-city' };
  }
  const current = (await env.DB.prepare(`SELECT city_id FROM ${t.days} WHERE id = ?`).bind(input.dayId).first<{ city_id: number }>())!.city_id;
  const main = input.cityId ?? current;
  let route = input.routeCityIds;
  if (route !== undefined) {
    const known = await all<{ id: number }>(`SELECT id FROM cities WHERE id IN (${route.map(() => '?').join(',')})`, ...route);
    if (route.some((cityId) => !known.some((city) => city.id === cityId))) return { ok: false, error: 'unknown-city' };
  } else if (input.cityId !== undefined) {
    // A new main City on a Day with a route moves the flag: it has to be on the route.
    const rows = await all<{ city_id: number }>(`SELECT city_id FROM ${t.dayCities} WHERE day_id = ? ORDER BY position`, input.dayId);
    if (rows.length > 0) route = rows.map((row) => row.city_id);
  }
  if (route !== undefined && route.length > 0 && !route.includes(main)) return { ok: false, error: 'main-not-on-route' };
  const sets: string[] = [];
  const params: (string | number)[] = [];
  if (title !== undefined) {
    sets.push('title = ?');
    params.push(title);
  }
  if (input.notes !== undefined) {
    sets.push('notes = ?');
    params.push(input.notes);
  }
  if (input.cityId !== undefined) {
    sets.push('city_id = ?');
    params.push(input.cityId);
  }
  if (sets.length > 0) {
    await env.DB.prepare(`UPDATE ${t.days} SET ${sets.join(', ')} WHERE id = ?`).bind(...params, input.dayId).run();
  }
  if (route !== undefined) {
    const mainAt = route.indexOf(main);
    await env.DB.batch([
      env.DB.prepare(`DELETE FROM ${t.dayCities} WHERE day_id = ?`).bind(input.dayId),
      ...(route.length > 1 ? route : []).map((cityId, index) =>
        env.DB.prepare(`INSERT INTO ${t.dayCities} (day_id, position, city_id, main) VALUES (?, ?, ?, ?)`).bind(
          input.dayId,
          index + 1,
          cityId,
          index === mainAt ? 1 : 0,
        ),
      ),
    ]);
  }
  return { ok: true };
}
