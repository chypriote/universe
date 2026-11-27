import { orientationOf, type AdminEnv } from './admin';
import { ID_CHUNK } from './photo-store';
import type { TripTables } from './tables';

type Refused<E extends string> = { ok: false; error: E };
type Done = { ok: true };

/**
 * The cover, its focal point, the Highlight Photos and the Day Photos of a Trip or of a Trip plan, written once against its tables.
 * `unknown` is the error for a slug that is not a Trip (or not a plan), which the admin pages read by name.
 */
export function buildCoverPhotos<Unknown extends string>(
  env: AdminEnv,
  tables: TripTables,
  unknown: Unknown,
) {
  const { trips, fk, days, dayPhotos, photos, highlights } = tables;
  const refuse = <E extends string>(error: E): Refused<E> => ({ ok: false, error });
  const ok: Done = { ok: true };

  const bySlug = (slug: string) =>
    env.DB.prepare(`SELECT id, cover_photo_id FROM ${trips} WHERE slug = ?`)
      .bind(slug)
      .first<{ id: number; cover_photo_id: number | null }>();

  /** The Photos of a Trip or plan among the given ids, with their size. */
  async function photosOf(ownerId: number, ids: number[]) {
    const rows: { id: number; width: number; height: number }[] = [];
    for (let start = 0; start < ids.length; start += ID_CHUNK) {
      const chunk = ids.slice(start, start + ID_CHUNK);
      const { results } = await env.DB.prepare(
        `SELECT id, width, height FROM ${photos} WHERE ${fk} = ? AND id IN (${chunk.map(() => '?').join(',')})`,
      )
        .bind(ownerId, ...chunk)
        .all<{ id: number; width: number; height: number }>();
      rows.push(...results);
    }
    return rows;
  }

  /** A landscape Photo of its own; the focal point goes back to the centre. */
  async function setCover(
    slug: string,
    photoId: number,
  ): Promise<Done | Refused<Unknown | 'unknown-photo' | 'not-landscape'>> {
    const owner = await bySlug(slug);
    if (!owner) return refuse(unknown);
    const [photo] = await photosOf(owner.id, [photoId]);
    if (!photo) return refuse('unknown-photo');
    if (orientationOf(photo) !== 'landscape') return refuse('not-landscape');
    await env.DB.prepare(
      `UPDATE ${trips} SET cover_photo_id = ?, cover_focus_x = 50, cover_focus_y = 50 WHERE id = ?`,
    )
      .bind(photoId, owner.id)
      .run();
    return ok;
  }

  /** The focal point in percent (0 to 100); it needs a cover. */
  async function setCoverFocus(
    slug: string,
    x: number,
    y: number,
  ): Promise<Done | Refused<Unknown | 'no-cover' | 'invalid-focus'>> {
    const inRange = (value: number) => Number.isFinite(value) && value >= 0 && value <= 100;
    if (!inRange(x) || !inRange(y)) return refuse('invalid-focus');
    const owner = await bySlug(slug);
    if (!owner) return refuse(unknown);
    if (owner.cover_photo_id === null) return refuse('no-cover');
    await env.DB.prepare(`UPDATE ${trips} SET cover_focus_x = ?, cover_focus_y = ? WHERE id = ?`)
      .bind(Math.round(x), Math.round(y), owner.id)
      .run();
    return ok;
  }

  /** Exactly 4 distinct portrait Photos of its own, in order. */
  async function setHighlightPhotos(
    slug: string,
    photoIds: number[],
  ): Promise<
    Done | Refused<Unknown | 'unknown-photo' | 'wrong-count' | 'duplicate-photo' | 'not-portrait'>
  > {
    const owner = await bySlug(slug);
    if (!owner) return refuse(unknown);
    if (photoIds.length !== 4) return refuse('wrong-count');
    if (new Set(photoIds).size !== photoIds.length) return refuse('duplicate-photo');
    const found = await photosOf(owner.id, photoIds);
    if (found.length !== photoIds.length) return refuse('unknown-photo');
    if (!found.every((photo) => orientationOf(photo) === 'portrait')) return refuse('not-portrait');
    await env.DB.batch([
      env.DB.prepare(`DELETE FROM ${highlights} WHERE ${fk} = ?`).bind(owner.id),
      ...photoIds.map((photoId, index) =>
        env.DB.prepare(
          `INSERT INTO ${highlights} (${fk}, position, photo_id) VALUES (?, ?, ?)`,
        ).bind(owner.id, index + 1, photoId),
      ),
    ]);
    return ok;
  }

  /** The Photos of a Day in order, all of its own Trip or plan. A Photo on another Day leaves it. */
  async function setDayPhotos(
    dayId: number,
    photoIds: number[],
  ): Promise<Done | Refused<'unknown-day' | 'unknown-photo' | 'duplicate-photo'>> {
    const day = await env.DB.prepare(`SELECT id, ${fk} AS owner_id FROM ${days} WHERE id = ?`)
      .bind(dayId)
      .first<{ id: number; owner_id: number }>();
    if (!day) return refuse('unknown-day');
    if (new Set(photoIds).size !== photoIds.length) return refuse('duplicate-photo');
    if ((await photosOf(day.owner_id, photoIds)).length !== photoIds.length)
      return refuse('unknown-photo');
    await env.DB.batch([
      env.DB.prepare(`DELETE FROM ${dayPhotos} WHERE day_id = ?`).bind(dayId),
      ...photoIds.map((photoId) =>
        env.DB.prepare(`DELETE FROM ${dayPhotos} WHERE photo_id = ?`).bind(photoId),
      ),
      ...photoIds.map((photoId, index) =>
        env.DB.prepare(
          `INSERT INTO ${dayPhotos} (day_id, position, photo_id) VALUES (?, ?, ?)`,
        ).bind(dayId, index + 1, photoId),
      ),
    ]);
    return ok;
  }

  return { setCover, setCoverFocus, setHighlightPhotos, setDayPhotos };
}
