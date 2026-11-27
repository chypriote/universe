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

/** The public URLs of an Activity picture and of its thumbnail. */
export type ActivityPictureUrls = {
  pictureUrl(activityId: number, name: string, version: number): string;
  thumbUrl(activityId: number, name: string, version: number): string;
};

const IMAGE_TYPES: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const CACHE_CONTROL = 'public, max-age=31536000, immutable';

/** The bucket keys of a picture and of its thumbnail. */
const keysOf = (activityId: number, name: string) => [`activities/${activityId}/${name}`, `thumbs/activities/${activityId}/${name}.webp`];

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

/** The Activities of the admin: places and things to do, each in one City. */
export function buildActivities(env: AdminEnv, urls: ActivityPictureUrls): ActivityMethods {
  async function all<T>(sql: string, ...params: (string | number)[]): Promise<T[]> {
    return (await env.DB.prepare(sql).bind(...params).all<T>()).results;
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
    if (input.rating !== null && !ACTIVITY_RATINGS.some((rating) => rating.value === input.rating)) return 'invalid-rating';
    if (input.price !== null && !(Number.isInteger(input.price) && input.price >= 0)) return 'invalid-price';
    const { lat, lng } = input;
    if ((lat === null) !== (lng === null)) return 'invalid-position';
    if (lat !== null && lng !== null && !(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) return 'invalid-position';
    if (!(await env.DB.prepare('SELECT id FROM cities WHERE id = ?').bind(input.cityId).first())) return 'unknown-city';
    const taken = await env.DB.prepare('SELECT id FROM activities WHERE city_id = ? AND name = ? AND id != ?')
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
    if (input.kind === undefined && input.rating === undefined) return { ok: false, error: 'nothing-to-change' };
    if (input.kind !== undefined && !ACTIVITY_KINDS.some((kind) => kind.value === input.kind)) return { ok: false, error: 'invalid-kind' };
    if (input.rating != null && !ACTIVITY_RATINGS.some((rating) => rating.value === input.rating)) return { ok: false, error: 'invalid-rating' };
    const marks = ids.map(() => '?').join(',');
    const known = ids.length > 0 && ids.length <= 90 ? await all<{ id: number }>(`SELECT id FROM activities WHERE id IN (${marks})`, ...ids) : [];
    if (ids.length === 0 || known.length !== ids.length) return { ok: false, error: 'unknown-activity' };
    const sets = [...(input.kind !== undefined ? ['kind = ?'] : []), ...(input.rating !== undefined ? ['rating = ?'] : [])];
    const values = [...(input.kind !== undefined ? [input.kind] : []), ...(input.rating !== undefined ? [input.rating] : [])];
    await env.DB.prepare(`UPDATE activities SET ${sets.join(', ')} WHERE id IN (${marks})`).bind(...values, ...ids).run();
    const rows = await all<ActivityRow>(`${SELECT} WHERE activities.id IN (${marks}) ORDER BY cities.name, activities.name`, ...ids);
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
    if (activity.pictures.length > 0) await env.PHOTOS.delete(activity.pictures.flatMap((picture) => keysOf(id, picture.name)));
    return { ok: true };
  }

  async function setActivities(days: string, listed: string, dayId: number, activityIds: number[]): Promise<SetDayActivitiesResult> {
    if (!(await env.DB.prepare(`SELECT id FROM ${days} WHERE id = ?`).bind(dayId).first())) return { ok: false, error: 'unknown-day' };
    if (new Set(activityIds).size !== activityIds.length) return { ok: false, error: 'duplicate-activity' };
    const known = activityIds.length
      ? await all<{ id: number }>(`SELECT id FROM activities WHERE id IN (${activityIds.map(() => '?').join(',')})`, ...activityIds)
      : [];
    if (known.length !== activityIds.length) return { ok: false, error: 'unknown-activity' };
    await env.DB.batch([
      env.DB.prepare(`DELETE FROM ${listed} WHERE day_id = ?`).bind(dayId),
      ...activityIds.map((activityId, index) =>
        env.DB.prepare(`INSERT INTO ${listed} (day_id, position, activity_id) VALUES (?, ?, ?)`).bind(dayId, index + 1, activityId),
      ),
    ]);
    return { ok: true };
  }

  async function uploadActivityPicture(input: Parameters<Journal['uploadActivityPicture']>[0]): Promise<UploadActivityPictureResult> {
    const { name, activityId } = input;
    if (!(await find(activityId))) return { ok: false, error: 'unknown-activity' };
    if (!name || name.includes('/')) return { ok: false, error: 'invalid-name' };
    const contentType = IMAGE_TYPES[name.split('.').pop()?.toLowerCase() ?? ''];
    if (!contentType) return { ok: false, error: 'unsupported-type' };
    const existing = await env.DB.prepare('SELECT id FROM activity_pictures WHERE activity_id = ? AND name = ?')
      .bind(activityId, name)
      .first<{ id: number }>();
    if (existing && !input.overwrite) return { ok: false, error: 'exists' };
    if (!readPhotoFile(input.file)) return { ok: false, error: 'unreadable' };

    // R2 first: a failed put leaves no row without a file.
    const [fileKey, thumbKey] = keysOf(activityId, name);
    await env.PHOTOS.put(fileKey, input.file, { httpMetadata: { contentType, cacheControl: CACHE_CONTROL } });
    await env.PHOTOS.put(thumbKey, input.thumb, { httpMetadata: { contentType: 'image/webp', cacheControl: CACHE_CONTROL } });
    if (existing) {
      await env.DB.prepare('UPDATE activity_pictures SET version = version + 1 WHERE id = ?').bind(existing.id).run();
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

  async function setActivityPictures(activityId: number, pictureIds: number[]): Promise<ActivityPicturesResult> {
    const activity = await find(activityId);
    if (!activity) return { ok: false, error: 'unknown-activity' };
    if (new Set(pictureIds).size !== pictureIds.length) return { ok: false, error: 'duplicate-picture' };
    const own = activity.pictures.map((picture) => picture.id);
    if (pictureIds.length !== own.length || !pictureIds.every((id) => own.includes(id))) return { ok: false, error: 'unknown-picture' };
    await env.DB.batch(
      pictureIds.map((pictureId, index) => env.DB.prepare('UPDATE activity_pictures SET position = ? WHERE id = ?').bind(index + 1, pictureId)),
    );
    return { ok: true, activity: (await find(activityId))! };
  }

  async function deleteActivityPicture(pictureId: number): Promise<ActivityPicturesResult> {
    const picture = await env.DB.prepare('SELECT id, activity_id, name FROM activity_pictures WHERE id = ?')
      .bind(pictureId)
      .first<{ id: number; activity_id: number; name: string }>();
    if (!picture) return { ok: false, error: 'unknown-picture' };
    await env.DB.prepare('DELETE FROM activity_pictures WHERE id = ?').bind(pictureId).run();
    // The row goes first: a failed bucket delete leaves an orphan file, never a row without one.
    await env.PHOTOS.delete(keysOf(picture.activity_id, picture.name));
    const left = (await find(picture.activity_id))!;
    await env.DB.batch(
      left.pictures.map((remaining, index) => env.DB.prepare('UPDATE activity_pictures SET position = ? WHERE id = ?').bind(index + 1, remaining.id)),
    );
    return { ok: true, activity: left };
  }

  async function moveActivityPicture(pictureId: number, activityId: number): Promise<MoveActivityPictureResult> {
    const picture = await env.DB.prepare('SELECT id, activity_id, name FROM activity_pictures WHERE id = ?')
      .bind(pictureId)
      .first<{ id: number; activity_id: number; name: string }>();
    if (!picture) return { ok: false, error: 'unknown-picture' };
    if (!(await find(activityId))) return { ok: false, error: 'unknown-activity' };
    if (picture.activity_id !== activityId) {
      if (await env.DB.prepare('SELECT id FROM activity_pictures WHERE activity_id = ? AND name = ?').bind(activityId, picture.name).first()) {
        return { ok: false, error: 'exists' };
      }
      // The keys hold the Activity id: copy the files first, so the row never points at a missing file.
      const [oldFile, oldThumb] = keysOf(picture.activity_id, picture.name);
      const [newFile, newThumb] = keysOf(activityId, picture.name);
      for (const [from, to] of [[oldFile, newFile], [oldThumb, newThumb]]) {
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
        left.pictures.map((remaining, index) => env.DB.prepare('UPDATE activity_pictures SET position = ? WHERE id = ?').bind(index + 1, remaining.id)),
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
    setDayActivities: (dayId, activityIds) => setActivities('days', 'day_activities', dayId, activityIds),
    setPlanDayActivities: (dayId, activityIds) => setActivities('plan_days', 'plan_day_activities', dayId, activityIds),
  };
}
