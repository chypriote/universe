import type { AdminEnv } from './admin';
import type { TripTables } from './tables';

/** The Photo rules a Trip and a Trip plan share: files in the bucket, the Photo row, City and title. What differs (date, time, covers) stays with each kind. */

export const ID_CHUNK = 90;

const IMAGE_TYPES: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const CACHE_CONTROL = 'public, max-age=31536000, immutable';

/** The content type of an image file name, or the reason it is refused. */
export function checkFileName(name: string): { contentType: string } | { error: 'invalid-name' | 'unsupported-type' } {
  if (!name || name.includes('/')) return { error: 'invalid-name' };
  const contentType = IMAGE_TYPES[name.split('.').pop()?.toLowerCase() ?? ''];
  return contentType ? { contentType } : { error: 'unsupported-type' };
}

export function findPhotoByName(env: AdminEnv, S: TripTables, tripId: number, name: string) {
  return env.DB.prepare(`SELECT id FROM ${S.photos} WHERE ${S.fk} = ? AND name = ?`).bind(tripId, name).first<{ id: number }>();
}

/** What a Photo is the Trip cover of or a Highlight Photo of; a replacement file must fit each. */
export async function frameKindsOf(env: AdminEnv, S: TripTables, photoId: number): Promise<('trip-cover' | 'highlight')[]> {
  const cover = await env.DB.prepare(`SELECT 1 AS used FROM ${S.trips} WHERE cover_photo_id = ?`).bind(photoId).first();
  const highlight = await env.DB.prepare(`SELECT 1 AS used FROM ${S.highlights} WHERE photo_id = ?`).bind(photoId).first();
  return [...(cover ? (['trip-cover'] as const) : []), ...(highlight ? (['highlight'] as const) : [])];
}

/** Writes the file and its thumbnail. Called before the row is written: a failed put leaves no row without a file. */
export async function putPhotoFiles(env: AdminEnv, slug: string, name: string, contentType: string, file: ArrayBuffer, thumb: ArrayBuffer) {
  await env.PHOTOS.put(`trips/${slug}/${name}`, file, { httpMetadata: { contentType, cacheControl: CACHE_CONTROL } });
  await env.PHOTOS.put(`thumbs/${slug}/${name}.webp`, thumb, { httpMetadata: { contentType: 'image/webp', cacheControl: CACHE_CONTROL } });
}

/** A new file for an existing Photo: its size and a new version, so the old file leaves every cache. `extraSet` adds columns kind by kind. */
export async function replacePhotoFile(
  env: AdminEnv,
  S: TripTables,
  photoId: number,
  size: { width: number; height: number },
  extra: { set: string; params: (string | number | null)[] } = { set: '', params: [] },
) {
  await env.DB.prepare(`UPDATE ${S.photos} SET width = ?, height = ?, ${extra.set}version = version + 1 WHERE id = ?`)
    .bind(size.width, size.height, ...extra.params, photoId)
    .run();
}

/** A new Photo row; `extra` holds the columns that only one kind has. */
export async function insertPhoto(
  env: AdminEnv,
  S: TripTables,
  tripId: number,
  name: string,
  size: { width: number; height: number },
  extra: Record<string, string | number | null> = {},
): Promise<number> {
  const columns = [S.fk, 'name', 'width', 'height', ...Object.keys(extra)];
  const row = await env.DB.prepare(`INSERT INTO ${S.photos} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')}) RETURNING id`)
    .bind(tripId, name, size.width, size.height, ...Object.values(extra))
    .first<{ id: number }>();
  return row!.id;
}

export async function cityExists(env: AdminEnv, cityId: number) {
  return (await env.DB.prepare('SELECT id FROM cities WHERE id = ?').bind(cityId).first()) !== null;
}

/** The stored title: trimmed, null when empty. */
export const titleValue = (title: string) => title.trim() || null;

/** Sets the same columns on Photos, in batches that fit the SQL variable limit. */
export async function updatePhotos(env: AdminEnv, S: TripTables, ids: number[], sets: string[], params: (string | number | null)[]) {
  await env.DB.batch(
    Array.from({ length: Math.ceil(ids.length / ID_CHUNK) }, (_, index) => {
      const chunk = ids.slice(index * ID_CHUNK, (index + 1) * ID_CHUNK);
      return env.DB.prepare(`UPDATE ${S.photos} SET ${sets.join(', ')} WHERE id IN (${chunk.map(() => '?').join(',')})`).bind(...params, ...chunk);
    }),
  );
}

export async function photoExists(env: AdminEnv, S: TripTables, photoId: number) {
  return (await env.DB.prepare(`SELECT id FROM ${S.photos} WHERE id = ?`).bind(photoId).first()) !== null;
}

/** Deletes Photos: `before` statements and the rows in one batch, then the files. The rows go first: a failed bucket delete leaves an orphan file, never a row without one. */
export async function removePhotos(env: AdminEnv, S: TripTables, photos: { id: number; slug: string; name: string }[], before: D1PreparedStatement[] = []) {
  const statements = [
    ...before,
    ...photos.flatMap((photo) => [
      env.DB.prepare(`DELETE FROM ${S.dayPhotos} WHERE photo_id = ?`).bind(photo.id),
      env.DB.prepare(`DELETE FROM ${S.photos} WHERE id = ?`).bind(photo.id),
    ]),
  ];
  if (statements.length > 0) await env.DB.batch(statements);
  if (photos.length > 0) {
    await env.PHOTOS.delete(photos.flatMap((photo) => [`trips/${photo.slug}/${photo.name}`, `thumbs/${photo.slug}/${photo.name}.webp`]));
  }
}
