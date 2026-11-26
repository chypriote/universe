import { orientationOf, type AdminEnv, type PhotoUrls } from './admin';
import { readPhotoFile } from './photo-file';
import type { AdminPlanPhoto, Journal } from './types';

type PlanPhotoMethods = Pick<
  Journal,
  | 'setPlanCover'
  | 'setPlanCoverFocus'
  | 'setPlanHighlightPhotos'
  | 'setPlanDayPhotos'
  | 'uploadPlanPhoto'
  | 'setPlanPhotoCity'
  | 'deletePlanPhoto'
>;

const IMAGE_TYPES: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const CACHE_CONTROL = 'public, max-age=31536000, immutable';

type PhotoRow = { id: number; name: string; slug: string; width: number; height: number; version: number; city_id: number | null; city: string | null };

/** The Photos of a plan by name, or the one with the given id. */
export async function loadPlanPhotos(env: AdminEnv, urls: PhotoUrls, planId: number, photoId?: number): Promise<AdminPlanPhoto[]> {
  const { results } = await env.DB.prepare(
    `SELECT plan_photos.id, plan_photos.name, plans.slug, plan_photos.width, plan_photos.height, plan_photos.version,
            cities.id AS city_id, cities.name AS city
     FROM plan_photos JOIN plans ON plans.id = plan_photos.plan_id
     LEFT JOIN cities ON cities.id = plan_photos.city_id
     WHERE plan_photos.plan_id = ?1 AND (?2 IS NULL OR plan_photos.id = ?2) ORDER BY plan_photos.name`,
  )
    .bind(planId, photoId ?? null)
    .all<PhotoRow>();
  return results.map((row) => ({
    id: row.id,
    name: row.name,
    url: urls.photoUrl(row.slug, row.name, row.version),
    thumb: urls.thumbUrl(row.slug, row.name, row.version),
    orientation: orientationOf(row),
    city: row.city_id === null ? null : { id: row.city_id, name: row.city ?? '' },
  }));
}

/** The Photos of Trip plans: files under trips/<slug>/ like Trip Photos, rows in the plan tables (ADR 0003). */
export function buildPlanPhotos(env: AdminEnv, urls: PhotoUrls): PlanPhotoMethods {
  const planBySlug = (slug: string) =>
    env.DB.prepare('SELECT id, slug, cover_photo_id, cover_focus_x, cover_focus_y FROM plans WHERE slug = ?')
      .bind(slug)
      .first<{ id: number; slug: string; cover_photo_id: number | null }>();

  /** The Photos of a plan among the given ids, with their size. */
  async function photosOfPlan(planId: number, ids: number[]) {
    if (ids.length === 0) return [];
    const { results } = await env.DB.prepare(
      `SELECT id, width, height FROM plan_photos WHERE plan_id = ? AND id IN (${ids.map(() => '?').join(',')})`,
    )
      .bind(planId, ...ids)
      .all<{ id: number; width: number; height: number }>();
    return results;
  }

  async function setPlanCover(slug: string, photoId: number) {
    const plan = await planBySlug(slug);
    if (!plan) return { ok: false as const, error: 'unknown-plan' as const };
    const [photo] = await photosOfPlan(plan.id, [photoId]);
    if (!photo) return { ok: false as const, error: 'unknown-photo' as const };
    if (orientationOf(photo) !== 'landscape') return { ok: false as const, error: 'not-landscape' as const };
    await env.DB.prepare('UPDATE plans SET cover_photo_id = ?, cover_focus_x = 50, cover_focus_y = 50 WHERE id = ?').bind(photoId, plan.id).run();
    return { ok: true as const };
  }

  async function setPlanCoverFocus(slug: string, x: number, y: number) {
    const inRange = (value: number) => Number.isFinite(value) && value >= 0 && value <= 100;
    if (!inRange(x) || !inRange(y)) return { ok: false as const, error: 'invalid-focus' as const };
    const plan = await planBySlug(slug);
    if (!plan) return { ok: false as const, error: 'unknown-plan' as const };
    if (plan.cover_photo_id === null) return { ok: false as const, error: 'no-cover' as const };
    await env.DB.prepare('UPDATE plans SET cover_focus_x = ?, cover_focus_y = ? WHERE id = ?').bind(Math.round(x), Math.round(y), plan.id).run();
    return { ok: true as const };
  }

  async function setPlanHighlightPhotos(slug: string, photoIds: number[]) {
    const plan = await planBySlug(slug);
    if (!plan) return { ok: false as const, error: 'unknown-plan' as const };
    if (photoIds.length !== 4) return { ok: false as const, error: 'wrong-count' as const };
    if (new Set(photoIds).size !== photoIds.length) return { ok: false as const, error: 'duplicate-photo' as const };
    const photos = await photosOfPlan(plan.id, photoIds);
    if (photos.length !== photoIds.length) return { ok: false as const, error: 'unknown-photo' as const };
    if (!photos.every((photo) => orientationOf(photo) === 'portrait')) return { ok: false as const, error: 'not-portrait' as const };
    await env.DB.batch([
      env.DB.prepare('DELETE FROM plan_highlight_photos WHERE plan_id = ?').bind(plan.id),
      ...photoIds.map((photoId, index) =>
        env.DB.prepare('INSERT INTO plan_highlight_photos (plan_id, position, photo_id) VALUES (?, ?, ?)').bind(plan.id, index + 1, photoId),
      ),
    ]);
    return { ok: true as const };
  }

  async function setPlanDayPhotos(dayId: number, photoIds: number[]) {
    const day = await env.DB.prepare('SELECT id, plan_id FROM plan_days WHERE id = ?').bind(dayId).first<{ id: number; plan_id: number }>();
    if (!day) return { ok: false as const, error: 'unknown-day' as const };
    if (new Set(photoIds).size !== photoIds.length) return { ok: false as const, error: 'duplicate-photo' as const };
    if ((await photosOfPlan(day.plan_id, photoIds)).length !== photoIds.length) return { ok: false as const, error: 'unknown-photo' as const };
    await env.DB.batch([
      env.DB.prepare('DELETE FROM plan_day_photos WHERE day_id = ?').bind(dayId),
      ...photoIds.map((photoId) => env.DB.prepare('DELETE FROM plan_day_photos WHERE photo_id = ?').bind(photoId)),
      ...photoIds.map((photoId, index) =>
        env.DB.prepare('INSERT INTO plan_day_photos (day_id, position, photo_id) VALUES (?, ?, ?)').bind(dayId, index + 1, photoId),
      ),
    ]);
    return { ok: true as const };
  }

  async function uploadPlanPhoto(input: Parameters<Journal['uploadPlanPhoto']>[0]): ReturnType<Journal['uploadPlanPhoto']> {
    const { name } = input;
    if (!name || name.includes('/')) return { ok: false, error: 'invalid-name' };
    const contentType = IMAGE_TYPES[name.split('.').pop()?.toLowerCase() ?? ''];
    if (!contentType) return { ok: false, error: 'unsupported-type' };
    const plan = await planBySlug(input.plan);
    if (!plan) return { ok: false, error: 'unknown-plan' };
    const existing = await env.DB.prepare('SELECT id FROM plan_photos WHERE plan_id = ? AND name = ?').bind(plan.id, name).first<{ id: number }>();
    if (existing && !input.overwrite) return { ok: false, error: 'exists' };
    const file = readPhotoFile(input.file);
    if (!file) return { ok: false, error: 'unreadable' };

    if (existing) {
      const cover = await env.DB.prepare('SELECT 1 AS used FROM plans WHERE id = ? AND cover_photo_id = ?').bind(plan.id, existing.id).first();
      const highlight = await env.DB.prepare('SELECT 1 AS used FROM plan_highlight_photos WHERE photo_id = ?').bind(existing.id).first();
      const shape = orientationOf(file);
      if ((cover && shape !== 'landscape') || (highlight && shape !== 'portrait')) return { ok: false, error: 'breaks-cover' };
    }

    // R2 first: a failed put leaves no row without a file.
    await env.PHOTOS.put(`trips/${plan.slug}/${name}`, input.file, { httpMetadata: { contentType, cacheControl: CACHE_CONTROL } });
    await env.PHOTOS.put(`thumbs/${plan.slug}/${name}.webp`, input.thumb, { httpMetadata: { contentType: 'image/webp', cacheControl: CACHE_CONTROL } });
    let photoId: number;
    if (existing) {
      photoId = existing.id;
      await env.DB.prepare('UPDATE plan_photos SET width = ?, height = ?, version = version + 1 WHERE id = ?').bind(file.width, file.height, existing.id).run();
    } else {
      const row = await env.DB.prepare('INSERT INTO plan_photos (plan_id, name, width, height) VALUES (?, ?, ?, ?) RETURNING id')
        .bind(plan.id, name, file.width, file.height)
        .first<{ id: number }>();
      photoId = row!.id;
    }
    const [photo] = await loadPlanPhotos(env, urls, plan.id, photoId);
    return { ok: true, photo, replaced: existing !== null };
  }

  async function setPlanPhotoCity(photoId: number, cityId: number | null) {
    if (!(await env.DB.prepare('SELECT id FROM plan_photos WHERE id = ?').bind(photoId).first())) {
      return { ok: false as const, error: 'unknown-photo' as const };
    }
    if (cityId !== null && !(await env.DB.prepare('SELECT id FROM cities WHERE id = ?').bind(cityId).first())) {
      return { ok: false as const, error: 'unknown-city' as const };
    }
    await env.DB.prepare('UPDATE plan_photos SET city_id = ? WHERE id = ?').bind(cityId, photoId).run();
    return { ok: true as const };
  }

  async function deletePlanPhoto(photoId: number) {
    const photo = await env.DB.prepare(
      `SELECT plan_photos.id, plan_photos.name, plans.slug, plans.cover_photo_id FROM plan_photos
       JOIN plans ON plans.id = plan_photos.plan_id WHERE plan_photos.id = ?`,
    )
      .bind(photoId)
      .first<{ id: number; name: string; slug: string; cover_photo_id: number | null }>();
    if (!photo) return { ok: false as const, error: 'unknown-photo' as const };
    const highlight = await env.DB.prepare('SELECT 1 AS used FROM plan_highlight_photos WHERE photo_id = ?').bind(photoId).first();
    if (photo.cover_photo_id === photoId || highlight) return { ok: false as const, error: 'in-use' as const };
    await env.DB.batch([
      env.DB.prepare('DELETE FROM plan_day_photos WHERE photo_id = ?').bind(photoId),
      env.DB.prepare('DELETE FROM plan_photos WHERE id = ?').bind(photoId),
    ]);
    // The row goes first: a failed bucket delete leaves an orphan file, never a row without one.
    await env.PHOTOS.delete([`trips/${photo.slug}/${photo.name}`, `thumbs/${photo.slug}/${photo.name}.webp`]);
    return { ok: true as const };
  }

  return { setPlanCover, setPlanCoverFocus, setPlanHighlightPhotos, setPlanDayPhotos, uploadPlanPhoto, setPlanPhotoCity, deletePlanPhoto };
}
