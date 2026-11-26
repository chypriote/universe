import type { AdminEnv } from './admin';
import { ACTIVITY_KINDS, ACTIVITY_RATINGS } from './activity-kinds';
import type {
  ActivityInput,
  ActivityProblem,
  AddActivityResult,
  AdminActivity,
  DeleteActivityResult,
  EditActivityInput,
  EditActivityResult,
  Journal,
} from './types';

type ActivityMethods = Pick<Journal, 'listAdminActivities' | 'addActivity' | 'editActivity' | 'deleteActivity'>;

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
export function buildActivities(env: AdminEnv): ActivityMethods {
  async function all<T>(sql: string, ...params: (string | number)[]): Promise<T[]> {
    return (await env.DB.prepare(sql).bind(...params).all<T>()).results;
  }

  const SELECT = `SELECT activities.id, activities.name, activities.name_zh, activities.pinyin, activities.city_id,
         cities.name AS city, provinces.name AS province, activities.kind, activities.description, activities.address,
         activities.address_zh, activities.lat, activities.lng, activities.rating, activities.price,
         (SELECT COUNT(*) FROM day_activities WHERE day_activities.activity_id = activities.id)
           + (SELECT COUNT(*) FROM plan_day_activities WHERE plan_day_activities.activity_id = activities.id) AS days
       FROM activities JOIN cities ON cities.id = activities.city_id JOIN provinces ON provinces.id = cities.province_id`;

  const toActivity = (row: ActivityRow): AdminActivity => ({
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
  });

  async function listAdminActivities(): Promise<AdminActivity[]> {
    return (await all<ActivityRow>(`${SELECT} ORDER BY cities.name, activities.name`)).map(toActivity);
  }

  const find = async (id: number) => {
    const [row] = await all<ActivityRow>(`${SELECT} WHERE activities.id = ?`, id);
    return row ? toActivity(row) : null;
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

  async function deleteActivity(id: number): Promise<DeleteActivityResult> {
    const activity = await find(id);
    if (!activity) return { ok: false, error: 'unknown-activity' };
    if (activity.days > 0) return { ok: false, error: 'in-use' };
    await env.DB.prepare('DELETE FROM activities WHERE id = ?').bind(id).run();
    return { ok: true };
  }

  return { listAdminActivities, addActivity, editActivity, deleteActivity };
}
