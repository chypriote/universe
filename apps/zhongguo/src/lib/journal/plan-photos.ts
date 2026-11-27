import { fits, orientationOf, type AdminEnv, type PhotoUrls } from './admin';
import { buildCoverPhotos } from './cover-photos';
import { readPhotoFile } from './photo-file';
import {
  checkFileName,
  cityExists,
  findPhotoByName,
  frameKindsOf,
  insertPhoto,
  photoExists,
  putPhotoFiles,
  removePhotos,
  replacePhotoFile,
  titleValue,
  updatePhotos,
} from './photo-store';
import { PLAN_TABLES } from './tables';
import type { AdminPlanPhoto, Journal } from './types';

type PlanPhotoMethods = Pick<
  Journal,
  | 'setPlanCover'
  | 'setPlanCoverFocus'
  | 'setPlanHighlightPhotos'
  | 'setPlanDayPhotos'
  | 'uploadPlanPhoto'
  | 'setPlanPhotoCity'
  | 'setPlanPhotoTitle'
  | 'deletePlanPhoto'
>;

type PhotoRow = {
  id: number;
  name: string;
  slug: string;
  width: number;
  height: number;
  version: number;
  title: string | null;
  city_id: number | null;
  city: string | null;
};

/** The Photos of a plan by name, or the one with the given id. */
export async function loadPlanPhotos(
  env: AdminEnv,
  urls: PhotoUrls,
  planId: number,
  photoId?: number,
): Promise<AdminPlanPhoto[]> {
  const { results } = await env.DB.prepare(
    `SELECT plan_photos.id, plan_photos.name, plans.slug, plan_photos.width, plan_photos.height, plan_photos.version, plan_photos.title,
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
    title: row.title,
  }));
}

/** The Photos of Trip plans: files under trips/<slug>/ like Trip Photos, rows in the plan tables (ADR 0003). */
export function buildPlanPhotos(env: AdminEnv, urls: PhotoUrls): PlanPhotoMethods {
  const cover = buildCoverPhotos(env, PLAN_TABLES, 'unknown-plan');
  const planBySlug = (slug: string) =>
    env.DB.prepare(
      'SELECT id, slug, cover_photo_id, cover_focus_x, cover_focus_y FROM plans WHERE slug = ?',
    )
      .bind(slug)
      .first<{ id: number; slug: string; cover_photo_id: number | null }>();

  async function uploadPlanPhoto(
    input: Parameters<Journal['uploadPlanPhoto']>[0],
  ): ReturnType<Journal['uploadPlanPhoto']> {
    const { name } = input;
    const checked = checkFileName(name);
    if ('error' in checked) return { ok: false, error: checked.error };
    const plan = await planBySlug(input.plan);
    if (!plan) return { ok: false, error: 'unknown-plan' };
    const existing = await findPhotoByName(env, PLAN_TABLES, plan.id, name);
    if (existing && !input.overwrite) return { ok: false, error: 'exists' };
    const file = readPhotoFile(input.file);
    if (!file) return { ok: false, error: 'unreadable' };

    if (
      existing &&
      (await frameKindsOf(env, PLAN_TABLES, existing.id)).some((kind) => !fits(kind, file))
    ) {
      return { ok: false, error: 'breaks-cover' };
    }

    await putPhotoFiles(env, plan.slug, name, checked.contentType, input.file, input.thumb);
    let photoId: number;
    if (existing) {
      photoId = existing.id;
      await replacePhotoFile(env, PLAN_TABLES, existing.id, file);
    } else {
      photoId = await insertPhoto(env, PLAN_TABLES, plan.id, name, file);
    }
    const [photo] = await loadPlanPhotos(env, urls, plan.id, photoId);
    return { ok: true, photo, replaced: existing !== null };
  }

  async function setPlanPhotoCity(photoId: number, cityId: number | null) {
    if (!(await photoExists(env, PLAN_TABLES, photoId)))
      return { ok: false as const, error: 'unknown-photo' as const };
    if (cityId !== null && !(await cityExists(env, cityId)))
      return { ok: false as const, error: 'unknown-city' as const };
    await updatePhotos(env, PLAN_TABLES, [photoId], ['city_id = ?'], [cityId]);
    return { ok: true as const };
  }

  async function setPlanPhotoTitle(photoId: number, title: string) {
    if (!(await photoExists(env, PLAN_TABLES, photoId)))
      return { ok: false as const, error: 'unknown-photo' as const };
    await updatePhotos(env, PLAN_TABLES, [photoId], ['title = ?'], [titleValue(title)]);
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
    const highlight = await env.DB.prepare(
      'SELECT 1 AS used FROM plan_highlight_photos WHERE photo_id = ?',
    )
      .bind(photoId)
      .first();
    if (photo.cover_photo_id === photoId || highlight)
      return { ok: false as const, error: 'in-use' as const };
    await removePhotos(env, PLAN_TABLES, [photo]);
    return { ok: true as const };
  }

  return {
    setPlanCover: cover.setCover,
    setPlanCoverFocus: cover.setCoverFocus,
    setPlanHighlightPhotos: cover.setHighlightPhotos,
    setPlanDayPhotos: cover.setDayPhotos,
    uploadPlanPhoto,
    setPlanPhotoCity,
    setPlanPhotoTitle,
    deletePlanPhoto,
  };
}
