import type { AdminEnv, PhotoUrls } from './admin';
import { editDayRows, PLAN_DAY_TABLES } from './day-edit';
import { loadPlanPhotos } from './plan-photos';
import type {
  AddPlanDayInput,
  AddPlanDayResult,
  AdminPlan,
  AdminPlanDetail,
  CreatePlanResult,
  EditDayInput,
  EditDayResult,
  Journal,
  PlanDayResult,
  SetPlanResult,
} from './types';

type PlanAdminMethods = Pick<
  Journal,
  | 'listAdminPlans'
  | 'getAdminPlan'
  | 'createPlan'
  | 'setPlanVisible'
  | 'setPlanSearchFlights'
  | 'addPlanDay'
  | 'editPlanDay'
  | 'deletePlanDay'
  | 'movePlanDay'
>;

/** The admin of Trip plans (ADR 0003): the plans, their switches and their numbered Days. */
export function buildPlanAdmin(env: AdminEnv, urls: PhotoUrls): PlanAdminMethods {
  async function all<T>(sql: string, ...params: (string | number)[]): Promise<T[]> {
    return (await env.DB.prepare(sql).bind(...params).all<T>()).results;
  }

  const planBySlug = (slug: string) =>
    env.DB.prepare('SELECT id, slug FROM plans WHERE slug = ?').bind(slug).first<{ id: number; slug: string }>();

  async function listAdminPlans(): Promise<AdminPlan[]> {
    const rows = await all<{ slug: string; title: string; visible: number; search_flights: number; days: number }>(
      `SELECT slug, title, visible, search_flights, (SELECT COUNT(*) FROM plan_days WHERE plan_id = plans.id) AS days
       FROM plans ORDER BY title`,
    );
    return rows.map((row) => ({
      slug: row.slug,
      title: row.title,
      visible: row.visible === 1,
      searchFlights: row.search_flights === 1,
      days: row.days,
    }));
  }

  async function getAdminPlan(slug: string): Promise<AdminPlanDetail | null> {
    const plan = await env.DB.prepare(
      'SELECT id, slug, title, visible, search_flights, cover_photo_id, cover_focus_x, cover_focus_y FROM plans WHERE slug = ?',
    )
      .bind(slug)
      .first<{
        id: number;
        slug: string;
        title: string;
        visible: number;
        search_flights: number;
        cover_photo_id: number | null;
        cover_focus_x: number;
        cover_focus_y: number;
      }>();
    if (!plan) return null;
    const rows = await all<{ id: number; position: number; title: string; notes: string; city_id: number; city: string; province: string; season: number }>(
      `SELECT plan_days.id, plan_days.position, plan_days.title, plan_days.notes, cities.id AS city_id, cities.name AS city,
              provinces.name AS province, provinces.season
       FROM plan_days JOIN cities ON cities.id = plan_days.city_id JOIN provinces ON provinces.id = cities.province_id
       WHERE plan_days.plan_id = ? ORDER BY plan_days.position`,
      plan.id,
    );
    const route = await all<{ day_id: number; id: number; name: string }>(
      `SELECT plan_day_cities.day_id, cities.id, cities.name FROM plan_day_cities
       JOIN plan_days ON plan_days.id = plan_day_cities.day_id JOIN cities ON cities.id = plan_day_cities.city_id
       WHERE plan_days.plan_id = ? ORDER BY plan_day_cities.day_id, plan_day_cities.position`,
      plan.id,
    );
    const onDays = await all<{ day_id: number; photo_id: number }>(
      `SELECT plan_day_photos.day_id, plan_day_photos.photo_id FROM plan_day_photos
       JOIN plan_days ON plan_days.id = plan_day_photos.day_id
       WHERE plan_days.plan_id = ? ORDER BY plan_day_photos.day_id, plan_day_photos.position`,
      plan.id,
    );
    const highlights = await all<{ photo_id: number }>(
      'SELECT photo_id FROM plan_highlight_photos WHERE plan_id = ? ORDER BY position',
      plan.id,
    );
    return {
      slug: plan.slug,
      title: plan.title,
      visible: plan.visible === 1,
      searchFlights: plan.search_flights === 1,
      photos: await loadPlanPhotos(env, urls, plan.id),
      coverId: plan.cover_photo_id,
      coverFocus: { x: plan.cover_focus_x, y: plan.cover_focus_y },
      highlightIds: highlights.map((row) => row.photo_id),
      days: rows.map((row, index) => ({
        id: row.id,
        number: index + 1,
        title: row.title,
        notes: row.notes,
        city: { id: row.city_id, name: row.city },
        route: route.filter((entry) => entry.day_id === row.id).map((entry) => ({ id: entry.id, name: entry.name })),
        province: row.province,
        photoIds: onDays.filter((entry) => entry.day_id === row.id).map((entry) => entry.photo_id),
      })),
      seasons: rows.map((row) => row.season),
    };
  }

  async function createPlan(title: string): Promise<CreatePlanResult> {
    const name = title.trim();
    const slug = name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    if (!name || !slug) return { ok: false, error: 'invalid-title' };
    // Photo files sit under trips/<slug>/ for Trips and plans alike, so a slug is unique across both.
    const taken = await env.DB.prepare('SELECT slug FROM trips WHERE slug = ? UNION SELECT slug FROM plans WHERE slug = ?')
      .bind(slug, slug)
      .first();
    if (taken) return { ok: false, error: 'slug-taken' };
    await env.DB.prepare('INSERT INTO plans (slug, title) VALUES (?, ?)').bind(slug, name).run();
    return { ok: true, slug };
  }

  async function setPlanColumn(slug: string, column: 'visible' | 'search_flights', value: boolean): Promise<SetPlanResult> {
    const plan = await planBySlug(slug);
    if (!plan) return { ok: false, error: 'unknown-plan' };
    await env.DB.prepare(`UPDATE plans SET ${column} = ? WHERE id = ?`).bind(value ? 1 : 0, plan.id).run();
    return { ok: true };
  }

  async function addPlanDay(slug: string, input: AddPlanDayInput): Promise<AddPlanDayResult> {
    const plan = await planBySlug(slug);
    if (!plan) return { ok: false, error: 'unknown-plan' };
    const title = input.title?.trim();
    if (!title) return { ok: false, error: 'invalid-title' };
    if (!(await env.DB.prepare('SELECT id FROM cities WHERE id = ?').bind(input.cityId).first())) {
      return { ok: false, error: 'unknown-city' };
    }
    const row = await env.DB.prepare(
      `INSERT INTO plan_days (plan_id, position, city_id, title, notes)
       VALUES (?1, COALESCE((SELECT MAX(position) FROM plan_days WHERE plan_id = ?1), 0) + 1, ?2, ?3, ?4) RETURNING id`,
    )
      .bind(plan.id, input.cityId, title, input.notes ?? '')
      .first<{ id: number }>();
    return { ok: true, dayId: row!.id };
  }

  const editPlanDay = (input: EditDayInput): Promise<EditDayResult> => editDayRows(env, PLAN_DAY_TABLES, input);

  async function deletePlanDay(dayId: number): Promise<PlanDayResult> {
    const day = await env.DB.prepare('SELECT plan_id FROM plan_days WHERE id = ?').bind(dayId).first<{ plan_id: number }>();
    if (!day) return { ok: false, error: 'unknown-day' };
    await env.DB.batch([
      env.DB.prepare('DELETE FROM plan_day_cities WHERE day_id = ?').bind(dayId),
      env.DB.prepare('DELETE FROM plan_day_photos WHERE day_id = ?').bind(dayId),
      env.DB.prepare('DELETE FROM plan_day_attractions WHERE day_id = ?').bind(dayId),
      env.DB.prepare('DELETE FROM plan_day_train_rides WHERE day_id = ?').bind(dayId),
      env.DB.prepare('DELETE FROM plan_days WHERE id = ?').bind(dayId),
    ]);
    // Positions are unique per plan: park them below zero, then number the Days that remain.
    const left = await all<{ id: number }>('SELECT id FROM plan_days WHERE plan_id = ? ORDER BY position', day.plan_id);
    await env.DB.batch([
      env.DB.prepare('UPDATE plan_days SET position = -position WHERE plan_id = ?').bind(day.plan_id),
      ...left.map((row, index) => env.DB.prepare('UPDATE plan_days SET position = ? WHERE id = ?').bind(index + 1, row.id)),
    ]);
    return { ok: true };
  }

  async function movePlanDay(dayId: number, direction: 'up' | 'down'): Promise<PlanDayResult> {
    const day = await env.DB.prepare('SELECT plan_id, position FROM plan_days WHERE id = ?')
      .bind(dayId)
      .first<{ plan_id: number; position: number }>();
    if (!day) return { ok: false, error: 'unknown-day' };
    const neighbour = await env.DB.prepare('SELECT id, position FROM plan_days WHERE plan_id = ? AND position = ?')
      .bind(day.plan_id, day.position + (direction === 'up' ? -1 : 1))
      .first<{ id: number; position: number }>();
    if (!neighbour) return { ok: true };
    await env.DB.batch([
      env.DB.prepare('UPDATE plan_days SET position = -1 WHERE id = ?').bind(dayId),
      env.DB.prepare('UPDATE plan_days SET position = ? WHERE id = ?').bind(day.position, neighbour.id),
      env.DB.prepare('UPDATE plan_days SET position = ? WHERE id = ?').bind(neighbour.position, dayId),
    ]);
    return { ok: true };
  }

  return {
    listAdminPlans,
    getAdminPlan,
    createPlan,
    setPlanVisible: (slug, visible) => setPlanColumn(slug, 'visible', visible),
    setPlanSearchFlights: (slug, searchFlights) => setPlanColumn(slug, 'search_flights', searchFlights),
    addPlanDay,
    editPlanDay,
    deletePlanDay,
    movePlanDay,
  };
}
