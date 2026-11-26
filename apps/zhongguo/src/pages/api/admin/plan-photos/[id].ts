import type { APIRoute } from 'astro';
import { journalFromEnv } from '@/lib/journal';
import { badRequest, jsonBody, respond } from '../_respond';

export const prerender = false;

/** Sets the City of a plan Photo: `{ cityId }`, null for none. */
export const PATCH: APIRoute = async ({ params, request }) => {
  const input = await jsonBody<{ cityId?: unknown }>(request);
  const photoId = Number(params.id);
  if (!Number.isInteger(photoId) || (input?.cityId !== null && typeof input?.cityId !== 'number')) return badRequest('invalid-body');
  return respond(await journalFromEnv().setPlanPhotoCity(photoId, input.cityId));
};

/** Deletes a plan Photo and its files. */
export const DELETE: APIRoute = async ({ params }) => {
  const photoId = Number(params.id);
  if (!Number.isInteger(photoId)) return badRequest('invalid-body');
  return respond(await journalFromEnv().deletePlanPhoto(photoId));
};
