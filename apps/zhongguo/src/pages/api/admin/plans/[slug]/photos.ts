import type { APIRoute } from 'astro';
import { journalFromEnv } from '@/lib/journal';
import { badRequest, respond } from '../../_respond';

export const prerender = false;

/** Uploads one Photo of the plan: a multipart form with `file`, `thumb` and optional `overwrite`. */
export const POST: APIRoute = async ({ params, request }) => {
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  const thumb = form?.get('thumb');
  if (!form || !(file instanceof File) || !(thumb instanceof File)) return badRequest('missing-file');
  return respond(
    await journalFromEnv().uploadPlanPhoto({
      plan: params.slug ?? '',
      name: file.name,
      file: await file.arrayBuffer(),
      thumb: await thumb.arrayBuffer(),
      overwrite: form.get('overwrite') === 'true',
    }),
  );
};
