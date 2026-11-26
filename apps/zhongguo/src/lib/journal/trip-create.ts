import { isDate } from './photo-file';
import { slugOf, slugTaken } from './slug';
import type { CreateTripInput, CreateTripResult, Journal } from './types';

/** The date `offset` days after a YYYY-MM-DD date. */
function addDays(date: string, offset: number): string {
  const time = new Date(`${date}T00:00:00Z`);
  time.setUTCDate(time.getUTCDate() + offset);
  return time.toISOString().slice(0, 10);
}

/** Creating a Trip, with Days copied from Plan Days (ADR 0003). */
export function buildTripCreate(env: { DB: D1Database }): Pick<Journal, 'createTrip'> {
  async function createTrip(input: CreateTripInput): Promise<CreateTripResult> {
    const title = input.title.trim();
    const slug = slugOf(title);
    if (!title || !slug) return { ok: false, error: 'invalid-title' };
    if (!isDate(input.startDate)) return { ok: false, error: 'invalid-date' };
    if (await slugTaken(env.DB, slug)) return { ok: false, error: 'slug-taken' };

    const ids = [...new Set(input.planDayIds)];
    let copied: { id: number }[] = [];
    if (ids.length > 0) {
      const marks = ids.map(() => '?').join(',');
      copied = (
        await env.DB.prepare(`SELECT id FROM plan_days WHERE id IN (${marks}) ORDER BY plan_id, position`)
          .bind(...ids)
          .all<{ id: number }>()
      ).results;
      if (copied.length !== ids.length) return { ok: false, error: 'unknown-plan-day' };
    }

    const tripId = '(SELECT id FROM trips WHERE slug = ?1)';
    const dayId = `(SELECT id FROM days WHERE trip_id = ${tripId} AND position = ?2)`;
    const last = addDays(input.startDate, Math.max(copied.length - 1, 0));
    // One batch: a Trip is never left with part of its Days.
    try {
      await env.DB.batch([
        env.DB.prepare('INSERT INTO trips (slug, title, start_date, end_date, visible) VALUES (?, ?, ?, ?, 0)').bind(slug, title, input.startDate, last),
        ...copied.flatMap((day, index) => {
          const position = index + 1;
          return [
            env.DB.prepare(
              `INSERT INTO days (trip_id, position, date, city_id, title, notes)
               SELECT ${tripId}, ?2, ?3, city_id, title, notes FROM plan_days WHERE id = ?4`,
            ).bind(slug, position, addDays(input.startDate, index), day.id),
            env.DB.prepare(
              `INSERT INTO day_cities (day_id, position, city_id, main) SELECT ${dayId}, position, city_id, main FROM plan_day_cities WHERE day_id = ?3`,
            ).bind(slug, position, day.id),
            env.DB.prepare(
              `INSERT INTO day_activities (day_id, position, activity_id)
               SELECT ${dayId}, position, activity_id FROM plan_day_activities WHERE day_id = ?3`,
            ).bind(slug, position, day.id),
            env.DB.prepare(
              `INSERT INTO day_train_rides (day_id, position, outgoing_city, destination_city, time_of_day, departure_time, arrival_time, duration_minutes)
               SELECT ${dayId}, position, outgoing_city, destination_city, time_of_day, departure_time, arrival_time, duration_minutes
               FROM plan_day_train_rides WHERE day_id = ?3`,
            ).bind(slug, position, day.id),
          ];
        }),
      ]);
    } catch {
      return { ok: false, error: 'slug-taken' };
    }
    return { ok: true, slug };
  }

  return { createTrip };
}
