import { fileNameDate, isDate, readPhotoFile } from './photo-file';
import type {
  AddCityInput,
  AddCityResult,
  AdminCity,
  AdminPhoto,
  AdminProvince,
  AdminTrip,
  CoverRef,
  DeletePhotosInput,
  DeletePhotosResult,
  EditPhotosInput,
  EditPhotosResult,
  Journal,
  KeptPhoto,
  PhotoChoice,
  Orientation,
  UploadPhotoInput,
  UploadPhotoResult,
} from './types';

export type AdminEnv = { DB: D1Database; PHOTOS: R2Bucket };

export type PhotoUrls = {
  photoUrl(slug: string, name: string, version: number): string;
  thumbUrl(slug: string, name: string, version: number): string;
};

type AdminMethods = Pick<
  Journal,
  'listAdminTrips' | 'listAdminPhotos' | 'listCities' | 'listProvinces' | 'uploadPhoto' | 'editPhotos' | 'deletePhotos' | 'addCity'
>;

type PhotoRow = {
  id: number;
  name: string;
  slug: string;
  trip_id: number;
  width: number;
  height: number;
  date: string;
  title: string | null;
  version: number;
  city_id: number | null;
  city: string | null;
  city_province: string | null;
  on_the_way_province: string | null;
};

const IMAGE_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};
const CACHE_CONTROL = 'public, max-age=31536000, immutable';

type ChoiceRow = { id: number; name: string; slug: string; width: number; height: number; version: number };

type CoverRow = { photo_id: number; slug: string; title: string; position?: number; province?: string };

/** Whether a Photo of this size can be the cover: landscape for a Trip Cover, portrait for a Highlight Photo. */
function fits(kind: CoverRef['kind'], size: { width: number; height: number }): boolean {
  if (kind === 'trip-cover') return orientationOf(size) === 'landscape';
  if (kind === 'highlight') return orientationOf(size) === 'portrait';
  return true;
}

function toCoverRef({ key, kind, label, href }: CoverRef): CoverRef {
  return { key, kind, label, href };
}

export function orientationOf(photo: { width: number; height: number }): Orientation {
  if (photo.width > photo.height) return 'landscape';
  if (photo.width < photo.height) return 'portrait';
  return 'square';
}

/** The Journal functions that write Photos and Cities, and the admin lists they need. */
export function buildAdmin(env: AdminEnv, urls: PhotoUrls): AdminMethods {
  async function all<T>(sql: string, ...params: (string | number)[]): Promise<T[]> {
    const { results } = await env.DB.prepare(sql)
      .bind(...params)
      .all<T>();
    return results;
  }

  /** The Photos of a Trip, with the number of the visible Day of each date. */
  async function loadPhotos(tripId: number, photoId?: number): Promise<AdminPhoto[]> {
    const days = await all<{ date: string }>(
      'SELECT date FROM days WHERE trip_id = ? AND visible = 1 ORDER BY position',
      tripId,
    );
    const rows = await all<PhotoRow>(
      `SELECT photos.id, photos.name, trips.slug, photos.trip_id, photos.width, photos.height, photos.date,
              photos.title, photos.version, cities.id AS city_id, cities.name AS city,
              city_provinces.name AS city_province, own_provinces.name AS on_the_way_province
       FROM photos
       JOIN trips ON trips.id = photos.trip_id
       LEFT JOIN cities ON cities.id = photos.city_id
       LEFT JOIN provinces AS city_provinces ON city_provinces.id = cities.province_id
       LEFT JOIN provinces AS own_provinces ON own_provinces.id = photos.province_id
       WHERE photos.trip_id = ? ${photoId === undefined ? '' : 'AND photos.id = ?'}
       ORDER BY photos.date, photos.name`,
      tripId,
      ...(photoId === undefined ? [] : [photoId]),
    );
    return rows.map((row) => {
      const day = days.findIndex((candidate) => candidate.date === row.date);
      return {
        id: row.id,
        name: row.name,
        url: urls.photoUrl(row.slug, row.name, row.version),
        thumb: urls.thumbUrl(row.slug, row.name, row.version),
        orientation: orientationOf(row),
        date: row.date,
        day: day === -1 ? null : day + 1,
        title: row.title,
        city: row.city_id === null ? null : { id: row.city_id, name: row.city ?? '' },
        province: row.city_province ?? row.on_the_way_province,
        onTheWay: row.city_id === null,
      };
    });
  }

  async function listAdminTrips(): Promise<AdminTrip[]> {
    return all<AdminTrip>('SELECT slug, title FROM trips ORDER BY start_date IS NULL, start_date DESC, slug');
  }

  async function listAdminPhotos(slug: string): Promise<AdminPhoto[] | null> {
    const trip = await env.DB.prepare('SELECT id FROM trips WHERE slug = ?').bind(slug).first<{ id: number }>();
    return trip ? loadPhotos(trip.id) : null;
  }

  async function listCities(): Promise<AdminCity[]> {
    const rows = await all<{ id: number; name: string; name_zh: string; province: string; major: number }>(
      `SELECT cities.id, cities.name, cities.name_zh, provinces.name AS province, cities.major
       FROM cities JOIN provinces ON provinces.id = cities.province_id ORDER BY cities.name`,
    );
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      nameZh: row.name_zh,
      province: row.province,
      major: row.major === 1,
    }));
  }

  async function listProvinces(): Promise<AdminProvince[]> {
    return all<AdminProvince>('SELECT id, name FROM provinces ORDER BY name');
  }

  /** What each of the given Photos is a cover of. */
  async function coversOf(photoIds: number[]): Promise<Map<number, (CoverRef & { tripSlug?: string; province?: string; position?: number })[]>> {
    const covers = new Map<number, (CoverRef & { tripSlug?: string; province?: string; position?: number })[]>();
    if (photoIds.length === 0) return covers;
    const marks = photoIds.map(() => '?').join(',');
    const add = (photoId: number, cover: CoverRef & { tripSlug?: string; province?: string; position?: number }) =>
      covers.set(photoId, [...(covers.get(photoId) ?? []), cover]);

    for (const row of await all<CoverRow>(
      `SELECT cover_photo_id AS photo_id, slug, title FROM trips WHERE cover_photo_id IN (${marks})`,
      ...photoIds,
    )) {
      add(row.photo_id, {
        key: `trip-cover:${row.slug}`,
        kind: 'trip-cover',
        label: `Trip Cover of ${row.title}`,
        href: `/admin/trips/${row.slug}`,
        tripSlug: row.slug,
      });
    }
    for (const row of await all<CoverRow>(
      `SELECT highlight_photos.photo_id, trips.slug, trips.title, highlight_photos.position
       FROM highlight_photos JOIN trips ON trips.id = highlight_photos.trip_id
       WHERE highlight_photos.photo_id IN (${marks}) ORDER BY trips.slug, highlight_photos.position`,
      ...photoIds,
    )) {
      add(row.photo_id, {
        key: `highlight:${row.slug}:${row.position}`,
        kind: 'highlight',
        label: `Highlight Photo ${row.position} of ${row.title}`,
        href: `/admin/trips/${row.slug}`,
        tripSlug: row.slug,
        position: row.position,
      });
    }
    for (const row of await all<CoverRow>(
      `SELECT province_covers.photo_id, provinces.name AS province
       FROM province_covers JOIN provinces ON provinces.id = province_covers.province_id
       WHERE province_covers.photo_id IN (${marks}) ORDER BY provinces.name`,
      ...photoIds,
    )) {
      add(row.photo_id, {
        key: `province-cover:${row.province}`,
        kind: 'province-cover',
        label: `Province Cover of ${row.province}`,
        href: '/admin/home',
        province: row.province,
      });
    }
    return covers;
  }

  async function uploadPhoto(input: UploadPhotoInput): Promise<UploadPhotoResult> {
    const { name } = input;
    if (!name || name.includes('/')) return { ok: false, error: 'invalid-name' };
    const contentType = IMAGE_TYPES[name.split('.').pop()?.toLowerCase() ?? ''];
    if (!contentType) return { ok: false, error: 'unsupported-type' };

    const trip = await env.DB.prepare('SELECT id, slug FROM trips WHERE slug = ?')
      .bind(input.trip)
      .first<{ id: number; slug: string }>();
    if (!trip) return { ok: false, error: 'unknown-trip' };

    if (input.cityId !== undefined && !(await env.DB.prepare('SELECT id FROM cities WHERE id = ?').bind(input.cityId).first())) {
      return { ok: false, error: 'unknown-city' };
    }

    const existing = await env.DB.prepare('SELECT id FROM photos WHERE trip_id = ? AND name = ?')
      .bind(trip.id, name)
      .first<{ id: number }>();
    if (existing && !input.overwrite) return { ok: false, error: 'exists' };

    const file = readPhotoFile(input.file);
    if (!file) return { ok: false, error: 'unreadable' };
    const date = file.exifDate ?? fileNameDate(name) ?? input.date ?? null;
    if (!existing && !date) return { ok: false, error: 'no-date' };

    if (existing) {
      const broken = (await coversOf([existing.id])).get(existing.id)?.filter((cover) => !fits(cover.kind, file)) ?? [];
      if (broken.length > 0) return { ok: false, error: 'breaks-cover', covers: broken.map(toCoverRef) };
    }

    // R2 first: a failed put leaves no row without a file.
    await env.PHOTOS.put(`trips/${trip.slug}/${name}`, input.file, {
      httpMetadata: { contentType, cacheControl: CACHE_CONTROL },
    });
    await env.PHOTOS.put(`thumbs/${trip.slug}/${name}.webp`, input.thumb, {
      httpMetadata: { contentType: 'image/webp', cacheControl: CACHE_CONTROL },
    });
    let photoId: number;
    if (existing) {
      photoId = existing.id;
      await env.DB.prepare('UPDATE photos SET width = ?, height = ?, version = version + 1 WHERE id = ?')
        .bind(file.width, file.height, existing.id)
        .run();
    } else {
      const row = await env.DB.prepare(
        'INSERT INTO photos (trip_id, name, width, height, date, title, city_id) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id',
      )
        .bind(trip.id, name, file.width, file.height, date, input.title ?? null, input.cityId ?? null)
        .first<{ id: number }>();
      photoId = row!.id;
    }

    const [photo] = await loadPhotos(trip.id, photoId);
    return { ok: true, photo, replaced: existing !== null };
  }

  async function editPhotos(input: EditPhotosInput): Promise<EditPhotosResult> {
    const ids = [...new Set(input.ids)];
    const known = await all<{ id: number }>(
      `SELECT id FROM photos WHERE id IN (${ids.map(() => '?').join(',')})`,
      ...ids,
    );
    if (ids.length === 0 || known.length !== ids.length) return { ok: false, error: 'unknown-photo' };
    if (input.date !== undefined && !isDate(input.date)) return { ok: false, error: 'invalid-date' };

    const sets: string[] = [];
    const params: (string | number | null)[] = [];
    const { place } = input;
    if (place) {
      const cityId = 'cityId' in place ? place.cityId : null;
      const provinceId = 'onTheWay' in place ? (place.provinceId ?? null) : null;
      if (cityId !== null && !(await env.DB.prepare('SELECT id FROM cities WHERE id = ?').bind(cityId).first())) {
        return { ok: false, error: 'unknown-city' };
      }
      if (provinceId !== null && !(await env.DB.prepare('SELECT id FROM provinces WHERE id = ?').bind(provinceId).first())) {
        return { ok: false, error: 'unknown-province' };
      }
      sets.push('city_id = ?', 'province_id = ?');
      params.push(cityId, provinceId);
    }
    if (input.date !== undefined) {
      sets.push('date = ?');
      params.push(input.date);
    }
    if (input.title !== undefined) {
      sets.push('title = ?');
      params.push(input.title.trim() || null);
    }
    if (sets.length > 0) {
      await env.DB.prepare(`UPDATE photos SET ${sets.join(', ')} WHERE id IN (${ids.map(() => '?').join(',')})`)
        .bind(...params, ...ids)
        .run();
    }
    return { ok: true, updated: ids.length };
  }

  type Cover = CoverRef & { tripSlug?: string; province?: string; position?: number };

  /** The Photos that can take over a cover, none of the ones being deleted. */
  async function replacementsFor(cover: Cover, deleting: Set<number>): Promise<(PhotoChoice & { width: number; height: number })[]> {
    let rows: ChoiceRow[];
    if (cover.province !== undefined) {
      rows = await all<ChoiceRow>(
        `SELECT photos.id, photos.name, trips.slug, photos.width, photos.height, photos.version
         FROM photos JOIN trips ON trips.id = photos.trip_id
         JOIN cities ON cities.id = photos.city_id JOIN provinces ON provinces.id = cities.province_id
         WHERE provinces.name = ? ORDER BY photos.date, photos.name`,
        cover.province,
      );
    } else {
      rows = await all<ChoiceRow>(
        `SELECT photos.id, photos.name, trips.slug, photos.width, photos.height, photos.version
         FROM photos JOIN trips ON trips.id = photos.trip_id
         WHERE trips.slug = ? ORDER BY photos.date, photos.name`,
        cover.tripSlug!,
      );
    }
    const taken = new Set<number>();
    if (cover.kind === 'highlight') {
      for (const row of await all<{ photo_id: number }>(
        'SELECT photo_id FROM highlight_photos JOIN trips ON trips.id = highlight_photos.trip_id WHERE trips.slug = ?',
        cover.tripSlug!,
      )) {
        taken.add(row.photo_id);
      }
    }
    return rows
      .filter((row) => !deleting.has(row.id) && !taken.has(row.id) && fits(cover.kind, row))
      .map((row) => ({
        id: row.id,
        name: row.name,
        thumb: urls.thumbUrl(row.slug, row.name, row.version),
        width: row.width,
        height: row.height,
      }));
  }

  async function deletePhotos(input: DeletePhotosInput): Promise<DeletePhotosResult> {
    const requested = [...new Set(input.ids)];
    const photos = requested.length
      ? await all<{ id: number; name: string; slug: string }>(
          `SELECT photos.id, photos.name, trips.slug FROM photos JOIN trips ON trips.id = photos.trip_id
           WHERE photos.id IN (${requested.map(() => '?').join(',')}) ORDER BY photos.id`,
          ...requested,
        )
      : [];
    const deleting = new Set(photos.map((photo) => photo.id));
    const covers = await coversOf([...deleting]);

    const statements: D1PreparedStatement[] = [];
    const deleted: number[] = [];
    const kept: KeptPhoto[] = [];
    const used = new Set<string>();
    for (const photo of photos) {
      const own = covers.get(photo.id) ?? [];
      const options = await Promise.all(own.map((cover) => replacementsFor(cover, deleting)));
      const picked = own.map((cover, index) => {
        const id = input.replacements?.[cover.key];
        const taken = cover.kind === 'highlight' && used.has(`${cover.tripSlug}:${id}`);
        return id !== undefined && !taken && options[index].some((choice) => choice.id === id) ? id : null;
      });

      if (picked.every((id) => id !== null)) {
        own.forEach((cover, index) => {
          const id = picked[index];
          if (cover.kind === 'highlight') used.add(`${cover.tripSlug}:${id}`);
          statements.push(
            cover.kind === 'trip-cover'
              ? env.DB.prepare('UPDATE trips SET cover_photo_id = ? WHERE slug = ?').bind(id, cover.tripSlug)
              : cover.kind === 'highlight'
                ? env.DB.prepare(
                    'UPDATE highlight_photos SET photo_id = ? WHERE position = ? AND trip_id = (SELECT id FROM trips WHERE slug = ?)',
                  ).bind(id, cover.position, cover.tripSlug)
                : env.DB.prepare(
                    'UPDATE province_covers SET photo_id = ? WHERE province_id = (SELECT id FROM provinces WHERE name = ?)',
                  ).bind(id, cover.province),
          );
        });
        statements.push(env.DB.prepare('DELETE FROM photos WHERE id = ?').bind(photo.id));
        deleted.push(photo.id);
      } else {
        kept.push({
          id: photo.id,
          name: photo.name,
          covers: own.map((cover, index) => ({
            ...toCoverRef(cover),
            replacements: options[index].map(({ id, name, thumb }) => ({ id, name, thumb })),
          })),
        });
      }
    }

    if (statements.length > 0) await env.DB.batch(statements);
    // The rows go first: a failed bucket delete leaves an orphan file, never a row without one.
    const gone = photos.filter((photo) => deleted.includes(photo.id));
    if (gone.length > 0) {
      await env.PHOTOS.delete(gone.flatMap((photo) => [`trips/${photo.slug}/${photo.name}`, `thumbs/${photo.slug}/${photo.name}.webp`]));
    }
    return { deleted, kept };
  }

  async function addCity(input: AddCityInput): Promise<AddCityResult> {
    const name = input.name.trim();
    const nameZh = input.nameZh.trim();
    if (!name || !nameZh) return { ok: false, error: 'invalid-name' };
    if (!(Math.abs(input.lng) <= 180) || !(Math.abs(input.lat) <= 90)) return { ok: false, error: 'invalid-position' };
    if (!(await env.DB.prepare('SELECT id FROM provinces WHERE id = ?').bind(input.provinceId).first())) {
      return { ok: false, error: 'unknown-province' };
    }
    if (await env.DB.prepare('SELECT id FROM cities WHERE name = ?').bind(name).first()) {
      return { ok: false, error: 'name-taken' };
    }
    const row = await env.DB.prepare(
      'INSERT INTO cities (name, name_zh, province_id, lng, lat, major) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
    )
      .bind(name, nameZh, input.provinceId, input.lng, input.lat, input.major ? 1 : 0)
      .first<{ id: number }>();
    const city = (await listCities()).find((candidate) => candidate.id === row!.id)!;
    return { ok: true, city };
  }

  return { addCity, editPhotos, deletePhotos, listAdminTrips, listAdminPhotos, listCities, listProvinces, uploadPhoto };
}
