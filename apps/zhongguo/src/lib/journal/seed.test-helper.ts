// Fixtures for the Journal tests: rows written straight into the local D1, since the Journal only reads.
import { env } from 'cloudflare:workers';

const TABLES = [
  'airports',
  'plan_day_cities',
  'plan_day_photos',
  'plan_highlight_photos',
  'plan_day_train_rides',
  'plan_day_activities',
  'plan_days',
  'plan_photos',
  'plans',
  'day_cities',
  'day_photos',
  'province_covers',
  'highlight_photos',
  'day_train_rides',
  'day_activities',
  'activity_pictures',
  'activities',
  'trip_hotels',
  'trip_restaurants',
  'days',
  'photos',
  'trips',
  'cities',
  'provinces',
];

let nextId = 1;
const id = () => nextId++;

export async function resetDatabase() {
  const { objects } = await env.PHOTOS.list();
  if (objects.length > 0) await env.PHOTOS.delete(objects.map((object) => object.key));
  await env.DB.batch([
    env.DB.prepare('UPDATE trips SET cover_photo_id = NULL'),
    env.DB.prepare('UPDATE plans SET cover_photo_id = NULL'),
    ...TABLES.map((table) => env.DB.prepare(`DELETE FROM ${table}`)),
  ]);
}

async function insert(table: string, row: Record<string, string | number | null>) {
  const columns = Object.keys(row);
  await env.DB.prepare(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
  )
    .bind(...Object.values(row))
    .run();
}

export async function addProvince(name: string, nameZh = name) {
  const row = { id: id(), name, name_zh: nameZh };
  await insert('provinces', row);
  return row.id;
}

export async function addCity(
  name: string,
  provinceId: number,
  options: { major?: boolean; nameZh?: string; lng?: number; lat?: number } = {},
) {
  const row = {
    id: id(),
    name,
    name_zh: options.nameZh ?? name,
    province_id: provinceId,
    lng: options.lng ?? 100,
    lat: options.lat ?? 30,
    major: options.major ? 1 : 0,
  };
  await insert('cities', row);
  return row.id;
}

type TripOptions = {
  slug?: string;
  title?: string;
  start?: string | null;
  end?: string | null;
  visible?: boolean;
};

/** A past Trip (a report) unless the dates say otherwise. */
export async function addTrip(options: TripOptions = {}) {
  const slug = options.slug ?? `trip-${nextId}`;
  const row = {
    id: id(),
    slug,
    title: options.title ?? slug,
    start_date: options.start === undefined ? '2025-03-01' : options.start,
    end_date: options.end === undefined ? '2025-03-31' : options.end,
    suggested_days: null,
    visible: options.visible === false ? 0 : 1,
  };
  await insert('trips', row);
  return row.id;
}

export async function addDay(
  tripId: number,
  cityId: number,
  date: string,
  options: { position?: number; title?: string; notes?: string; visible?: boolean } = {},
) {
  const row = {
    id: id(),
    trip_id: tripId,
    position: options.position ?? nextId,
    date,
    city_id: cityId,
    title: options.title ?? `Day on ${date}`,
    notes: options.notes ?? '',
    visible: options.visible === false ? 0 : 1,
  };
  await insert('days', row);
  // Photos already there for its date go on it, as the migration does.
  await env.DB.prepare(
    `INSERT INTO day_photos (day_id, position, photo_id)
     SELECT ?1, ROW_NUMBER() OVER (ORDER BY name), id FROM photos
     WHERE trip_id = ?2 AND date = ?3 AND id NOT IN (SELECT photo_id FROM day_photos)`,
  )
    .bind(row.id, tripId, date)
    .run();
  return row.id;
}

export async function addPhoto(
  tripId: number,
  date: string,
  options: {
    name?: string;
    width?: number;
    height?: number;
    title?: string | null;
    cityId?: number | null;
    provinceId?: number | null;
    time?: 'morning' | 'afternoon' | 'evening' | null;
  } = {},
) {
  const row = {
    id: id(),
    trip_id: tripId,
    name: options.name ?? `${date}-${nextId}.jpg`,
    width: options.width ?? 4000,
    height: options.height ?? 3000,
    date,
    time: options.time ?? null,
    title: options.title ?? null,
    city_id: options.cityId ?? null,
    province_id: options.provinceId ?? null,
  };
  await insert('photos', row);
  // A Photo goes on the Day of its date, after the Photos already there.
  await env.DB.prepare(
    `INSERT INTO day_photos (day_id, position, photo_id)
     SELECT days.id, COALESCE((SELECT MAX(position) FROM day_photos WHERE day_id = days.id), 0) + 1, ?1
     FROM days WHERE trip_id = ?2 AND date = ?3`,
  )
    .bind(row.id, tripId, date)
    .run();
  return row.id;
}

export async function setTripCover(tripId: number, photoId: number) {
  await env.DB.prepare('UPDATE trips SET cover_photo_id = ? WHERE id = ?').bind(photoId, tripId).run();
}

export async function setHighlight(tripId: number, position: number, photoId: number) {
  await insert('highlight_photos', { trip_id: tripId, position, photo_id: photoId });
}

export async function setProvinceCover(provinceId: number, photoId: number) {
  await insert('province_covers', { province_id: provinceId, photo_id: photoId });
}

/** The route of a Day: every City in travel order, `mainId` being its main City. */
export async function setDayCities(dayId: number, cityIds: number[], mainId: number) {
  for (const [index, cityId] of cityIds.entries()) {
    await insert('day_cities', { day_id: dayId, position: index + 1, city_id: cityId, main: cityId === mainId ? 1 : 0 });
  }
}

/** A Trip plan: numbered Days and no dates. */
export async function addPlan(options: { slug?: string; title?: string; visible?: boolean; searchFlights?: boolean } = {}) {
  const slug = options.slug ?? `plan-${nextId}`;
  const row = {
    id: id(),
    slug,
    title: options.title ?? slug,
    visible: options.visible === false ? 0 : 1,
    search_flights: options.searchFlights === false ? 0 : 1,
  };
  await insert('plans', row);
  return row.id;
}

export async function addPlanDay(planId: number, cityId: number, position: number, options: { title?: string; notes?: string } = {}) {
  const row = {
    id: id(),
    plan_id: planId,
    position,
    city_id: cityId,
    title: options.title ?? `Day ${position}`,
    notes: options.notes ?? '',
  };
  await insert('plan_days', row);
  return row.id;
}

export async function addPlanPhoto(planId: number, dayId: number | null, name: string, cityId: number | null = null) {
  const row = { id: id(), plan_id: planId, name, width: 4000, height: 3000, title: null, city_id: cityId, province_id: null };
  await insert('plan_photos', row);
  if (dayId !== null) await insert('plan_day_photos', { day_id: dayId, position: 1, photo_id: row.id });
  return row.id;
}

export async function addActivity(
  name: string,
  cityId: number,
  options: { nameZh?: string; pinyin?: string; kind?: string } = {},
) {
  const row = {
    id: id(),
    name,
    name_zh: options.nameZh ?? '',
    pinyin: options.pinyin ?? '',
    city_id: cityId,
    kind: options.kind ?? 'heritage',
  };
  await insert('activities', row);
  return row.id;
}

/** `table` is `day_activities` for a Trip Day, `plan_day_activities` for a Plan Day. */
export async function listActivity(table: 'day_activities' | 'plan_day_activities', dayId: number, position: number, activityId: number) {
  await insert(table, { day_id: dayId, position, activity_id: activityId });
}
