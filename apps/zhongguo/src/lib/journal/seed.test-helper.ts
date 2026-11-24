// Fixtures for the Journal tests: rows written straight into the local D1, since the Journal only reads.
import { env } from 'cloudflare:workers';

const TABLES = [
  'province_covers',
  'highlight_photos',
  'day_train_rides',
  'day_attractions',
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
  } = {},
) {
  const row = {
    id: id(),
    trip_id: tripId,
    name: options.name ?? `${date}-${nextId}.jpg`,
    width: options.width ?? 4000,
    height: options.height ?? 3000,
    date,
    title: options.title ?? null,
    city_id: options.cityId ?? null,
    province_id: options.provinceId ?? null,
  };
  await insert('photos', row);
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
