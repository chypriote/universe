import type { APIRoute } from 'astro';
import { journalFromEnv } from '@/lib/journal';
import type { DeletePhotosInput, EditPhotosInput } from '@/lib/journal';
import { badRequest, jsonBody, respond } from './_respond';

export const prerender = false;

/** The Photos of a Trip: `?trip=<slug>`. */
export const GET: APIRoute = async ({ url }) => {
  const photos = await journalFromEnv().listAdminPhotos(url.searchParams.get('trip') ?? '');
  return photos ? Response.json(photos) : badRequest('unknown-trip');
};

/** Uploads one Photo: a multipart form with `trip`, `file`, `thumb` and optional `date`, `title`, `cityId`, `overwrite`. */
export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  const thumb = form?.get('thumb');
  if (!form || !(file instanceof File) || !(thumb instanceof File)) return badRequest('missing-file');

  const text = (key: string) => String(form.get(key) ?? '').trim() || undefined;
  const cityId = text('cityId');
  return respond(
    await journalFromEnv().uploadPhoto({
      trip: text('trip') ?? '',
      name: file.name,
      file: await file.arrayBuffer(),
      thumb: await thumb.arrayBuffer(),
      date: text('date'),
      title: text('title'),
      cityId: cityId === undefined ? undefined : Number(cityId),
      overwrite: form.get('overwrite') === 'true',
    }),
  );
};

export const PATCH: APIRoute = async ({ request }) => {
  const input = await jsonBody<EditPhotosInput>(request);
  return input ? respond(await journalFromEnv().editPhotos(input)) : badRequest('invalid-body');
};

export const DELETE: APIRoute = async ({ request }) => {
  const input = await jsonBody<DeletePhotosInput>(request);
  return input ? respond(await journalFromEnv().deletePhotos(input)) : badRequest('invalid-body');
};
