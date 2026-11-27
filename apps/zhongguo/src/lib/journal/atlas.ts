import type { AdminEnv } from './admin';
import { readPhotoFile } from './photo-file';
import { ACTIVITY_KINDS, ACTIVITY_RATINGS } from './activity-kinds';
import type {
  ActivityInput,
  ActivityPicture,
  ActivityPicturesResult,
  MoveActivityPictureResult,
  ActivityProblem,
  AddActivityResult,
  AdminActivity,
  DeleteActivityResult,
  EditActivitiesInput,
  EditActivitiesResult,
  EditActivityInput,
  EditActivityResult,
  Journal,
  SetDayActivitiesResult,
  UploadActivityPictureResult,
} from './types';

import type {
  AddCityInput,
  AddCityResult,
  AdminCity,
  AdminCityDetail,
  AdminProvince,
  AdminProvinceDetail,
  CityPhoto,
  DeleteAirportResult,
  DeleteCityResult,
  EditCityInput,
  EditCityResult,
  SetAirportInput,
  SetAirportResult,
  SetProvinceSeasonResult,
} from './types';

import { PLAN_TABLES, TRIP_TABLES, type TripTables } from './tables';

type AtlasMethods = Pick<
  Journal,
  | 'listCities'
  | 'listProvinces'
  | 'addCity'
  | 'listAdminCities'
  | 'listCityPhotos'
  | 'editCity'
  | 'deleteCity'
  | 'listAdminProvinces'
  | 'setProvinceSeason'
  | 'setAirport'
  | 'deleteAirport'
>;

type ActivityMethods = Pick<
  Journal,
  | 'listAdminActivities'
  | 'addActivity'
  | 'editActivity'
  | 'editActivities'
  | 'deleteActivity'
  | 'setDayActivities'
  | 'setPlanDayActivities'
  | 'uploadActivityPicture'
  | 'setActivityPictures'
  | 'deleteActivityPicture'
  | 'moveActivityPicture'
>;

/** Where the Atlas reads a Trip's Photos, for the Photos of a City. */
type PhotosOfTrip = Journal['listAdminPhotos'];

/** The public URLs of an Activity picture and of its thumbnail. */
export type ActivityPictureUrls = {
  pictureUrl(activityId: number, name: string, version: number): string;
  thumbUrl(activityId: number, name: string, version: number): string;
};

const IMAGE_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};
const CACHE_CONTROL = 'public, max-age=31536000, immutable';

/** The bucket keys of a picture and of its thumbnail. */
const keysOf = (activityId: number, name: string) => [
  `activities/${activityId}/${name}`,
  `thumbs/activities/${activityId}/${name}.webp`,
];

type ActivityRow = {
  id: number;
  name: string;
  name_zh: string;
  pinyin: string;
  city_id: number;
  city: string;
  province: string;
  kind: AdminActivity['kind'];
  description: string;
  address: string;
  address_zh: string;
  lat: number | null;
  lng: number | null;
  rating: AdminActivity['rating'];
  price: number | null;
  days: number;
};

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

/** The Activities of the Atlas: places and things to do, each in one City. */
function buildActivities(env: AdminEnv, urls: ActivityPictureUrls): ActivityMethods {
  async function all<T>(sql: string, ...params: (string | number)[]): Promise<T[]> {
    return (
      await env.DB.prepare(sql)
        .bind(...params)
        .all<T>()
    ).results;
  }

  const SELECT = `SELECT activities.id, activities.name, activities.name_zh, activities.pinyin, activities.city_id,
         cities.name AS city, provinces.name AS province, activities.kind, activities.description, activities.address,
         activities.address_zh, activities.lat, activities.lng, activities.rating, activities.price,
         (SELECT COUNT(*) FROM day_activities WHERE day_activities.activity_id = activities.id)
           + (SELECT COUNT(*) FROM plan_day_activities WHERE plan_day_activities.activity_id = activities.id) AS days
       FROM activities JOIN cities ON cities.id = activities.city_id JOIN provinces ON provinces.id = cities.province_id`;

  const toActivity = (row: ActivityRow, pictures: ActivityPicture[]): AdminActivity => ({
    id: row.id,
    name: row.name,
    nameZh: row.name_zh,
    pinyin: row.pinyin,
    cityId: row.city_id,
    city: row.city,
    province: row.province,
    kind: row.kind,
    description: row.description,
    address: row.address,
    addressZh: row.address_zh,
    lat: row.lat,
    lng: row.lng,
    rating: row.rating,
    price: row.price,
    days: row.days,
    pictures,
  });

  async function picturesOf(activityIds: number[]): Promise<Map<number, ActivityPicture[]>> {
    // D1 allows 100 bound parameters per statement, and the admin lists every Activity.
    const rows: { id: number; activity_id: number; name: string; version: number }[] = [];
    for (let start = 0; start < activityIds.length; start += 90) {
      const chunk = activityIds.slice(start, start + 90);
      rows.push(
        ...(await all<{ id: number; activity_id: number; name: string; version: number }>(
          `SELECT id, activity_id, name, version FROM activity_pictures
           WHERE activity_id IN (${chunk.map(() => '?').join(',')}) ORDER BY activity_id, position, id`,
          ...chunk,
        )),
      );
    }
    rows.sort((a, b) => a.activity_id - b.activity_id);
    const byActivity = new Map<number, ActivityPicture[]>();
    for (const row of rows) {
      const list = byActivity.get(row.activity_id) ?? [];
      list.push({
        id: row.id,
        name: row.name,
        url: urls.pictureUrl(row.activity_id, row.name, row.version),
        thumb: urls.thumbUrl(row.activity_id, row.name, row.version),
      });
      byActivity.set(row.activity_id, list);
    }
    return byActivity;
  }

  async function listAdminActivities(): Promise<AdminActivity[]> {
    const rows = await all<ActivityRow>(`${SELECT} ORDER BY cities.name, activities.name`);
    const pictures = await picturesOf(rows.map((row) => row.id));
    return rows.map((row) => toActivity(row, pictures.get(row.id) ?? []));
  }

  const find = async (id: number) => {
    const [row] = await all<ActivityRow>(`${SELECT} WHERE activities.id = ?`, id);
    return row ? toActivity(row, (await picturesOf([id])).get(id) ?? []) : null;
  };

  /** What stops an Activity from being saved; `selfId` is the Activity being edited. */
  async function problem(input: ActivityInput, selfId = 0): Promise<ActivityProblem | null> {
    if (!text(input.name) || !text(input.nameZh) || !text(input.pinyin)) return 'invalid-name';
    if (!ACTIVITY_KINDS.some((kind) => kind.value === input.kind)) return 'invalid-kind';
    if (input.rating !== null && !ACTIVITY_RATINGS.some((rating) => rating.value === input.rating))
      return 'invalid-rating';
    if (input.price !== null && !(Number.isInteger(input.price) && input.price >= 0))
      return 'invalid-price';
    const { lat, lng } = input;
    if ((lat === null) !== (lng === null)) return 'invalid-position';
    if (lat !== null && lng !== null && !(Math.abs(lat) <= 90 && Math.abs(lng) <= 180))
      return 'invalid-position';
    if (!(await env.DB.prepare('SELECT id FROM cities WHERE id = ?').bind(input.cityId).first()))
      return 'unknown-city';
    const taken = await env.DB.prepare(
      'SELECT id FROM activities WHERE city_id = ? AND name = ? AND id != ?',
    )
      .bind(input.cityId, text(input.name), selfId)
      .first();
    return taken ? 'name-taken' : null;
  }

  const values = (input: ActivityInput) => [
    text(input.name),
    text(input.nameZh),
    text(input.pinyin),
    input.cityId,
    input.kind,
    text(input.description),
    text(input.address),
    text(input.addressZh),
    input.lat,
    input.lng,
    input.rating,
    input.price,
  ];

  async function addActivity(input: ActivityInput): Promise<AddActivityResult> {
    const error = await problem(input);
    if (error) return { ok: false, error };
    const row = await env.DB.prepare(
      `INSERT INTO activities (name, name_zh, pinyin, city_id, kind, description, address, address_zh, lat, lng, rating, price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    )
      .bind(...values(input))
      .first<{ id: number }>();
    return { ok: true, activity: (await find(row!.id))! };
  }

  async function editActivity(input: EditActivityInput): Promise<EditActivityResult> {
    if (!(await find(input.id))) return { ok: false, error: 'unknown-activity' };
    const error = await problem(input, input.id);
    if (error) return { ok: false, error };
    await env.DB.prepare(
      `UPDATE activities SET name = ?, name_zh = ?, pinyin = ?, city_id = ?, kind = ?, description = ?, address = ?,
         address_zh = ?, lat = ?, lng = ?, rating = ?, price = ? WHERE id = ?`,
    )
      .bind(...values(input), input.id)
      .run();
    return { ok: true, activity: (await find(input.id))! };
  }

  async function editActivities(input: EditActivitiesInput): Promise<EditActivitiesResult> {
    const ids = [...new Set(input.ids)];
    if (input.kind === undefined && input.rating === undefined)
      return { ok: false, error: 'nothing-to-change' };
    if (input.kind !== undefined && !ACTIVITY_KINDS.some((kind) => kind.value === input.kind))
      return { ok: false, error: 'invalid-kind' };
    if (input.rating != null && !ACTIVITY_RATINGS.some((rating) => rating.value === input.rating))
      return { ok: false, error: 'invalid-rating' };
    const marks = ids.map(() => '?').join(',');
    const known =
      ids.length > 0 && ids.length <= 90
        ? await all<{ id: number }>(`SELECT id FROM activities WHERE id IN (${marks})`, ...ids)
        : [];
    if (ids.length === 0 || known.length !== ids.length)
      return { ok: false, error: 'unknown-activity' };
    const sets = [
      ...(input.kind !== undefined ? ['kind = ?'] : []),
      ...(input.rating !== undefined ? ['rating = ?'] : []),
    ];
    const values = [
      ...(input.kind !== undefined ? [input.kind] : []),
      ...(input.rating !== undefined ? [input.rating] : []),
    ];
    await env.DB.prepare(`UPDATE activities SET ${sets.join(', ')} WHERE id IN (${marks})`)
      .bind(...values, ...ids)
      .run();
    const rows = await all<ActivityRow>(
      `${SELECT} WHERE activities.id IN (${marks}) ORDER BY cities.name, activities.name`,
      ...ids,
    );
    const pictures = await picturesOf(ids);
    return { ok: true, activities: rows.map((row) => toActivity(row, pictures.get(row.id) ?? [])) };
  }

  async function deleteActivity(id: number): Promise<DeleteActivityResult> {
    const activity = await find(id);
    if (!activity) return { ok: false, error: 'unknown-activity' };
    if (activity.days > 0) return { ok: false, error: 'in-use' };
    await env.DB.batch([
      env.DB.prepare('DELETE FROM activity_pictures WHERE activity_id = ?').bind(id),
      env.DB.prepare('DELETE FROM activities WHERE id = ?').bind(id),
    ]);
    // The rows go first: a failed bucket delete leaves an orphan file, never a row without one.
    if (activity.pictures.length > 0)
      await env.PHOTOS.delete(activity.pictures.flatMap((picture) => keysOf(id, picture.name)));
    return { ok: true };
  }

  async function setActivities(
    t: TripTables,
    dayId: number,
    activityIds: number[],
  ): Promise<SetDayActivitiesResult> {
    if (!(await env.DB.prepare(`SELECT id FROM ${t.days} WHERE id = ?`).bind(dayId).first()))
      return { ok: false, error: 'unknown-day' };
    if (new Set(activityIds).size !== activityIds.length)
      return { ok: false, error: 'duplicate-activity' };
    const known = activityIds.length
      ? await all<{ id: number }>(
          `SELECT id FROM activities WHERE id IN (${activityIds.map(() => '?').join(',')})`,
          ...activityIds,
        )
      : [];
    if (known.length !== activityIds.length) return { ok: false, error: 'unknown-activity' };
    await env.DB.batch([
      env.DB.prepare(`DELETE FROM ${t.dayActivities} WHERE day_id = ?`).bind(dayId),
      ...activityIds.map((activityId, index) =>
        env.DB.prepare(
          `INSERT INTO ${t.dayActivities} (day_id, position, activity_id) VALUES (?, ?, ?)`,
        ).bind(dayId, index + 1, activityId),
      ),
    ]);
    return { ok: true };
  }

  async function uploadActivityPicture(
    input: Parameters<Journal['uploadActivityPicture']>[0],
  ): Promise<UploadActivityPictureResult> {
    const { name, activityId } = input;
    if (!(await find(activityId))) return { ok: false, error: 'unknown-activity' };
    if (!name || name.includes('/')) return { ok: false, error: 'invalid-name' };
    const contentType = IMAGE_TYPES[name.split('.').pop()?.toLowerCase() ?? ''];
    if (!contentType) return { ok: false, error: 'unsupported-type' };
    const existing = await env.DB.prepare(
      'SELECT id FROM activity_pictures WHERE activity_id = ? AND name = ?',
    )
      .bind(activityId, name)
      .first<{ id: number }>();
    if (existing && !input.overwrite) return { ok: false, error: 'exists' };
    if (!readPhotoFile(input.file)) return { ok: false, error: 'unreadable' };

    // R2 first: a failed put leaves no row without a file.
    const [fileKey, thumbKey] = keysOf(activityId, name);
    await env.PHOTOS.put(fileKey, input.file, {
      httpMetadata: { contentType, cacheControl: CACHE_CONTROL },
    });
    await env.PHOTOS.put(thumbKey, input.thumb, {
      httpMetadata: { contentType: 'image/webp', cacheControl: CACHE_CONTROL },
    });
    if (existing) {
      await env.DB.prepare('UPDATE activity_pictures SET version = version + 1 WHERE id = ?')
        .bind(existing.id)
        .run();
    } else {
      await env.DB.prepare(
        `INSERT INTO activity_pictures (activity_id, position, name)
         VALUES (?1, (SELECT COALESCE(MAX(position), 0) + 1 FROM activity_pictures WHERE activity_id = ?1), ?2)`,
      )
        .bind(activityId, name)
        .run();
    }
    return { ok: true, activity: (await find(activityId))!, replaced: existing !== null };
  }

  async function setActivityPictures(
    activityId: number,
    pictureIds: number[],
  ): Promise<ActivityPicturesResult> {
    const activity = await find(activityId);
    if (!activity) return { ok: false, error: 'unknown-activity' };
    if (new Set(pictureIds).size !== pictureIds.length)
      return { ok: false, error: 'duplicate-picture' };
    const own = activity.pictures.map((picture) => picture.id);
    if (pictureIds.length !== own.length || !pictureIds.every((id) => own.includes(id)))
      return { ok: false, error: 'unknown-picture' };
    await env.DB.batch(
      pictureIds.map((pictureId, index) =>
        env.DB.prepare('UPDATE activity_pictures SET position = ? WHERE id = ?').bind(
          index + 1,
          pictureId,
        ),
      ),
    );
    return { ok: true, activity: (await find(activityId))! };
  }

  async function deleteActivityPicture(pictureId: number): Promise<ActivityPicturesResult> {
    const picture = await env.DB.prepare(
      'SELECT id, activity_id, name FROM activity_pictures WHERE id = ?',
    )
      .bind(pictureId)
      .first<{ id: number; activity_id: number; name: string }>();
    if (!picture) return { ok: false, error: 'unknown-picture' };
    await env.DB.prepare('DELETE FROM activity_pictures WHERE id = ?').bind(pictureId).run();
    // The row goes first: a failed bucket delete leaves an orphan file, never a row without one.
    await env.PHOTOS.delete(keysOf(picture.activity_id, picture.name));
    const left = (await find(picture.activity_id))!;
    await env.DB.batch(
      left.pictures.map((remaining, index) =>
        env.DB.prepare('UPDATE activity_pictures SET position = ? WHERE id = ?').bind(
          index + 1,
          remaining.id,
        ),
      ),
    );
    return { ok: true, activity: left };
  }

  async function moveActivityPicture(
    pictureId: number,
    activityId: number,
  ): Promise<MoveActivityPictureResult> {
    const picture = await env.DB.prepare(
      'SELECT id, activity_id, name FROM activity_pictures WHERE id = ?',
    )
      .bind(pictureId)
      .first<{ id: number; activity_id: number; name: string }>();
    if (!picture) return { ok: false, error: 'unknown-picture' };
    if (!(await find(activityId))) return { ok: false, error: 'unknown-activity' };
    if (picture.activity_id !== activityId) {
      if (
        await env.DB.prepare('SELECT id FROM activity_pictures WHERE activity_id = ? AND name = ?')
          .bind(activityId, picture.name)
          .first()
      ) {
        return { ok: false, error: 'exists' };
      }
      // The keys hold the Activity id: copy the files first, so the row never points at a missing file.
      const [oldFile, oldThumb] = keysOf(picture.activity_id, picture.name);
      const [newFile, newThumb] = keysOf(activityId, picture.name);
      for (const [from, to] of [
        [oldFile, newFile],
        [oldThumb, newThumb],
      ]) {
        const object = await env.PHOTOS.get(from);
        if (object) await env.PHOTOS.put(to, object.body, { httpMetadata: object.httpMetadata });
      }
      await env.DB.prepare(
        `UPDATE activity_pictures SET activity_id = ?1,
           position = (SELECT COALESCE(MAX(position), 0) + 1 FROM activity_pictures WHERE activity_id = ?1)
         WHERE id = ?2`,
      )
        .bind(activityId, pictureId)
        .run();
      await env.PHOTOS.delete([oldFile, oldThumb]);
      const left = (await find(picture.activity_id))!;
      await env.DB.batch(
        left.pictures.map((remaining, index) =>
          env.DB.prepare('UPDATE activity_pictures SET position = ? WHERE id = ?').bind(
            index + 1,
            remaining.id,
          ),
        ),
      );
    }
    return { ok: true, from: (await find(picture.activity_id))!, to: (await find(activityId))! };
  }

  return {
    moveActivityPicture,
    uploadActivityPicture,
    setActivityPictures,
    deleteActivityPicture,
    listAdminActivities,
    addActivity,
    editActivity,
    editActivities,
    deleteActivity,
    setDayActivities: (dayId, activityIds) => setActivities(TRIP_TABLES, dayId, activityIds),
    setPlanDayActivities: (dayId, activityIds) => setActivities(PLAN_TABLES, dayId, activityIds),
  };
}

/** The numbers 1…size whose bit (number − 1) is set. */
function fromBits(bits: number, size: number): number[] {
  return Array.from({ length: size }, (_, index) => index + 1).filter(
    (number) => bits & (1 << (number - 1)),
  );
}

/** The bits of a list of numbers from 1 to size; null when one is out of range or not whole. */
function toBits(numbers: unknown, size: number): number | null {
  if (!Array.isArray(numbers)) return null;
  let bits = 0;
  for (const number of numbers) {
    if (!Number.isInteger(number) || number < 1 || number > size) return null;
    bits |= 1 << (number - 1);
  }
  return bits;
}

/** The Atlas: Cities, Provinces, Airports, Seasons and Activities. */
export function buildAtlas(
  env: AdminEnv,
  urls: ActivityPictureUrls,
  listAdminPhotos: PhotosOfTrip,
): AtlasMethods & ActivityMethods {
  async function all<T>(sql: string, ...params: (string | number)[]): Promise<T[]> {
    return (
      await env.DB.prepare(sql)
        .bind(...params)
        .all<T>()
    ).results;
  }

  async function listCities(): Promise<AdminCity[]> {
    const rows = await all<{
      id: number;
      name: string;
      name_zh: string;
      province: string;
      major: number;
    }>(
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

  type CityProblem = 'invalid-name' | 'name-taken' | 'unknown-province' | 'invalid-position';

  /** What stops a City from being saved, with the name trimmed; `selfId` is the City being edited. */
  async function cityProblem(input: AddCityInput, selfId = 0): Promise<CityProblem | null> {
    if (!input.name.trim() || !input.nameZh.trim()) return 'invalid-name';
    if (!(Math.abs(input.lng) <= 180) || !(Math.abs(input.lat) <= 90)) return 'invalid-position';
    if (
      !(await env.DB.prepare('SELECT id FROM provinces WHERE id = ?')
        .bind(input.provinceId)
        .first())
    ) {
      return 'unknown-province';
    }
    if (
      await env.DB.prepare('SELECT id FROM cities WHERE name = ? AND id != ?')
        .bind(input.name.trim(), selfId)
        .first()
    ) {
      return 'name-taken';
    }
    return null;
  }

  async function listAdminCities(): Promise<AdminCityDetail[]> {
    const rows = await all<{
      id: number;
      name: string;
      name_zh: string;
      province_id: number;
      province: string;
      lng: number;
      lat: number;
      major: number;
      photos: number;
      days: number;
      stays: number;
      activities: number;
    }>(
      `SELECT cities.id, cities.name, cities.name_zh, cities.province_id, provinces.name AS province, cities.lng, cities.lat,
              cities.major,
              (SELECT COUNT(*) FROM photos WHERE photos.city_id = cities.id)
                + (SELECT COUNT(*) FROM plan_photos WHERE plan_photos.city_id = cities.id) AS photos,
              (SELECT COUNT(*) FROM days WHERE days.city_id = cities.id
                 OR days.id IN (SELECT day_id FROM day_cities WHERE day_cities.city_id = cities.id))
                + (SELECT COUNT(*) FROM plan_days WHERE plan_days.city_id = cities.id
                 OR plan_days.id IN (SELECT day_id FROM plan_day_cities WHERE plan_day_cities.city_id = cities.id)) AS days,
              (SELECT COUNT(*) FROM trip_hotels WHERE trip_hotels.city_id = cities.id)
                + (SELECT COUNT(*) FROM trip_restaurants WHERE trip_restaurants.city_id = cities.id) AS stays,
              (SELECT COUNT(*) FROM activities WHERE activities.city_id = cities.id) AS activities
       FROM cities JOIN provinces ON provinces.id = cities.province_id ORDER BY cities.name`,
    );
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      nameZh: row.name_zh,
      province: row.province,
      major: row.major === 1,
      provinceId: row.province_id,
      lng: row.lng,
      lat: row.lat,
      photos: row.photos,
      days: row.days,
      stays: row.stays,
      activities: row.activities,
    }));
  }

  async function listCityPhotos(cityId: number): Promise<CityPhoto[] | null> {
    if (!(await env.DB.prepare('SELECT id FROM cities WHERE id = ?').bind(cityId).first()))
      return null;
    const trips = await all<{ slug: string; title: string }>(
      `SELECT DISTINCT trips.slug, trips.title, trips.start_date FROM photos JOIN trips ON trips.id = photos.trip_id
       WHERE photos.city_id = ? ORDER BY trips.start_date IS NULL, trips.start_date DESC, trips.slug`,
      cityId,
    );
    const photos: CityPhoto[] = [];
    for (const trip of trips) {
      for (const photo of (await listAdminPhotos(trip.slug)) ?? []) {
        if (photo.city?.id === cityId)
          photos.push({ ...photo, trip: { slug: trip.slug, title: trip.title } });
      }
    }
    return photos;
  }

  async function addCity(input: AddCityInput): Promise<AddCityResult> {
    const problem = await cityProblem(input);
    if (problem) return { ok: false, error: problem };
    const row = await env.DB.prepare(
      'INSERT INTO cities (name, name_zh, province_id, lng, lat, major) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
    )
      .bind(
        input.name.trim(),
        input.nameZh.trim(),
        input.provinceId,
        input.lng,
        input.lat,
        input.major ? 1 : 0,
      )
      .first<{ id: number }>();
    const city = (await listCities()).find((candidate) => candidate.id === row!.id)!;
    return { ok: true, city };
  }

  async function editCity(input: EditCityInput): Promise<EditCityResult> {
    const current = await env.DB.prepare('SELECT province_id FROM cities WHERE id = ?')
      .bind(input.id)
      .first<{ province_id: number }>();
    if (!current) return { ok: false, error: 'unknown-city' };
    const problem = await cityProblem(input, input.id);
    if (problem) return { ok: false, error: problem };

    // A Province Cover must be a Photo of a City in its Province.
    const covers =
      current.province_id === input.provinceId
        ? []
        : await all<{ name: string }>(
            `SELECT provinces.name FROM province_covers
             JOIN photos ON photos.id = province_covers.photo_id
             JOIN provinces ON provinces.id = province_covers.province_id
             WHERE province_covers.province_id = ? AND photos.city_id = ?`,
            current.province_id,
            input.id,
          );
    await env.DB.batch([
      env.DB.prepare(
        'UPDATE cities SET name = ?, name_zh = ?, province_id = ?, lng = ?, lat = ?, major = ? WHERE id = ?',
      ).bind(
        input.name.trim(),
        input.nameZh.trim(),
        input.provinceId,
        input.lng,
        input.lat,
        input.major ? 1 : 0,
        input.id,
      ),
      ...(covers.length === 0
        ? []
        : [
            env.DB.prepare(
              'DELETE FROM province_covers WHERE province_id = ? AND photo_id IN (SELECT id FROM photos WHERE city_id = ?)',
            ).bind(current.province_id, input.id),
          ]),
    ]);
    const city = (await listAdminCities()).find((candidate) => candidate.id === input.id)!;
    return { ok: true, city, clearedCovers: covers.map((cover) => cover.name) };
  }

  /** How many things use one City: Photos, Days, hotels and restaurants, Activities. */
  async function cityUses(cityId: number): Promise<number> {
    const row = await env.DB.prepare(
      `SELECT (SELECT COUNT(*) FROM photos WHERE city_id = ?1)
            + (SELECT COUNT(*) FROM plan_photos WHERE city_id = ?1)
            + (SELECT COUNT(*) FROM days WHERE city_id = ?1 OR id IN (SELECT day_id FROM day_cities WHERE city_id = ?1))
            + (SELECT COUNT(*) FROM plan_days WHERE city_id = ?1 OR id IN (SELECT day_id FROM plan_day_cities WHERE city_id = ?1))
            + (SELECT COUNT(*) FROM trip_hotels WHERE city_id = ?1)
            + (SELECT COUNT(*) FROM trip_restaurants WHERE city_id = ?1)
            + (SELECT COUNT(*) FROM activities WHERE city_id = ?1) AS uses`,
    )
      .bind(cityId)
      .first<{ uses: number }>();
    return row!.uses;
  }

  async function deleteCity(cityId: number): Promise<DeleteCityResult> {
    if (!(await env.DB.prepare('SELECT id FROM cities WHERE id = ?').bind(cityId).first()))
      return { ok: false, error: 'unknown-city' };
    if ((await cityUses(cityId)) > 0) return { ok: false, error: 'in-use' };
    await env.DB.batch([
      env.DB.prepare('DELETE FROM airports WHERE city_id = ?').bind(cityId),
      env.DB.prepare('DELETE FROM cities WHERE id = ?').bind(cityId),
    ]);
    return { ok: true };
  }

  async function listAdminProvinces(): Promise<AdminProvinceDetail[]> {
    const [provinces, cities, airports] = await Promise.all([
      all<{ id: number; name: string; name_zh: string; season: number }>(
        'SELECT id, name, name_zh, season FROM provinces ORDER BY name',
      ),
      all<{
        id: number;
        name: string;
        name_zh: string;
        province_id: number;
        lng: number;
        lat: number;
      }>('SELECT id, name, name_zh, province_id, lng, lat FROM cities ORDER BY name'),
      all<{ code: string; city_id: number; direct_weekdays: number }>(
        'SELECT code, city_id, direct_weekdays FROM airports ORDER BY code',
      ),
    ]);
    return provinces.map((province) => ({
      id: province.id,
      name: province.name,
      nameZh: province.name_zh,
      season: fromBits(province.season, 12),
      cities: cities
        .filter((city) => city.province_id === province.id)
        .map((city) => ({
          id: city.id,
          name: city.name,
          nameZh: city.name_zh,
          lng: city.lng,
          lat: city.lat,
          airports: airports
            .filter((airport) => airport.city_id === city.id)
            .map((airport) => ({
              code: airport.code,
              directWeekdays: fromBits(airport.direct_weekdays, 7),
            })),
        })),
    }));
  }

  async function setProvinceSeason(
    provinceId: number,
    months: number[],
  ): Promise<SetProvinceSeasonResult> {
    const season = toBits(months, 12);
    if (season === null) return { ok: false, error: 'invalid-months' };
    const result = await env.DB.prepare('UPDATE provinces SET season = ? WHERE id = ?')
      .bind(season, provinceId)
      .run();
    return result.meta.changes === 0 ? { ok: false, error: 'unknown-province' } : { ok: true };
  }

  async function setAirport(input: SetAirportInput): Promise<SetAirportResult> {
    const code = typeof input.code === 'string' ? input.code.trim().toUpperCase() : '';
    if (!/^[A-Z]{3}$/.test(code)) return { ok: false, error: 'invalid-code' };
    const weekdays = toBits(input.directWeekdays, 7);
    if (weekdays === null) return { ok: false, error: 'invalid-weekdays' };
    if (!(await env.DB.prepare('SELECT id FROM cities WHERE id = ?').bind(input.cityId).first())) {
      return { ok: false, error: 'unknown-city' };
    }
    const owner = await env.DB.prepare('SELECT city_id FROM airports WHERE code = ?')
      .bind(code)
      .first<{ city_id: number }>();
    if (owner && owner.city_id !== input.cityId) return { ok: false, error: 'code-taken' };
    await env.DB.prepare(
      'INSERT INTO airports (code, city_id, direct_weekdays) VALUES (?, ?, ?) ON CONFLICT (code) DO UPDATE SET direct_weekdays = excluded.direct_weekdays',
    )
      .bind(code, input.cityId, weekdays)
      .run();
    return { ok: true, airport: { code, directWeekdays: fromBits(weekdays, 7) } };
  }

  async function deleteAirport(code: string): Promise<DeleteAirportResult> {
    const result = await env.DB.prepare('DELETE FROM airports WHERE code = ?')
      .bind(code.toUpperCase())
      .run();
    return result.meta.changes === 0 ? { ok: false, error: 'unknown-airport' } : { ok: true };
  }

  return {
    ...buildActivities(env, urls),
    listCities,
    listProvinces,
    addCity,
    deleteCity,
    listAdminProvinces,
    setProvinceSeason,
    setAirport,
    deleteAirport,
    editCity,
    listAdminCities,
    listCityPhotos,
  };
}
