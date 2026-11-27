import type { APIRoute } from 'astro';
import { galleryWorkspace } from '@/lib/journal';
import { badRequest, jsonBody, respond } from '../_respond';

export const prerender = false;

/** Uploads one picture: a multipart form with `activityId`, `file`, `thumb` and optional `overwrite`. */
export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  const thumb = form?.get('thumb');
  const activityId = Number(form?.get('activityId'));
  if (!form || !Number.isInteger(activityId) || !(file instanceof File) || !(thumb instanceof File))
    return badRequest('missing-file');
  return respond(
    await galleryWorkspace().uploadActivityPicture({
      activityId,
      name: file.name,
      file: await file.arrayBuffer(),
      thumb: await thumb.arrayBuffer(),
      overwrite: form.get('overwrite') === 'true',
    }),
  );
};

/** Sets the order of an Activity's pictures: `{ activityId, pictureIds }`. */
export const PATCH: APIRoute = async ({ request }) => {
  const input = await jsonBody<{ activityId?: unknown; pictureIds?: unknown }>(request);
  if (
    typeof input?.activityId !== 'number' ||
    !Array.isArray(input.pictureIds) ||
    !input.pictureIds.every((id) => typeof id === 'number')
  )
    return badRequest('invalid-body');
  return respond(await galleryWorkspace().setActivityPictures(input.activityId, input.pictureIds));
};

/** Deletes one picture and its files: `{ pictureId }`. */
export const DELETE: APIRoute = async ({ request }) => {
  const input = await jsonBody<{ pictureId?: unknown }>(request);
  if (typeof input?.pictureId !== 'number') return badRequest('invalid-body');
  return respond(await galleryWorkspace().deleteActivityPicture(input.pictureId));
};
