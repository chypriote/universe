import type { APIRoute } from 'astro';
import { galleryWorkspace } from '@/lib/journal';
import { badRequest, jsonBody, respond } from '../_respond';

export const prerender = false;

/** Edits a plan Photo: `{ cityId }` (null for none) and/or `{ title }` (empty clears it). */
export const PATCH: APIRoute = async ({ params, request }) => {
  const input = await jsonBody<{ cityId?: unknown; title?: unknown }>(request);
  const photoId = Number(params.id);
  if (!Number.isInteger(photoId) || !input) return badRequest('invalid-body');
  const { cityId, title } = input;
  if (cityId !== undefined && cityId !== null && typeof cityId !== 'number')
    return badRequest('invalid-body');
  if (title !== undefined && typeof title !== 'string') return badRequest('invalid-body');
  if (cityId === undefined && title === undefined) return badRequest('invalid-body');
  const journal = galleryWorkspace();
  if (cityId !== undefined) {
    const result = await journal.setPlanPhotoCity(photoId, cityId);
    if (!result.ok || title === undefined) return respond(result);
  }
  return respond(await journal.setPlanPhotoTitle(photoId, title as string));
};

/** Deletes a plan Photo and its files. */
export const DELETE: APIRoute = async ({ params }) => {
  const photoId = Number(params.id);
  if (!Number.isInteger(photoId)) return badRequest('invalid-body');
  return respond(await galleryWorkspace().deletePlanPhoto(photoId));
};
