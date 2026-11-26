import type { APIRoute } from 'astro';
import { journalFromEnv } from '@/lib/journal';
import { badRequest, jsonBody, respond } from '../../_respond';

export const prerender = false;

/** Adds a Day at the end of the plan: `{ cityId, title, notes? }`. */
export const POST: APIRoute = async ({ params, request }) => {
  const input = await jsonBody<{ cityId?: unknown; title?: unknown; notes?: unknown }>(request);
  if (typeof input?.cityId !== 'number' || typeof input.title !== 'string' || (input.notes !== undefined && typeof input.notes !== 'string')) {
    return badRequest('invalid-body');
  }
  return respond(await journalFromEnv().addPlanDay(params.slug ?? '', { cityId: input.cityId, title: input.title, notes: input.notes }));
};
