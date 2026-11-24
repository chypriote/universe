import type { APIRoute } from 'astro';
import { journalFromEnv } from '@/lib/journal';
import { badRequest, jsonBody, respond } from '../../_respond';

export const prerender = false;

/** Adds a Day to the Trip: `{ date, cityId, title, notes? }`. */
export const POST: APIRoute = async ({ params, request }) => {
  const input = await jsonBody<{ date?: unknown; cityId?: unknown; title?: unknown; notes?: unknown }>(request);
  if (
    typeof input?.date !== 'string' ||
    typeof input.cityId !== 'number' ||
    typeof input.title !== 'string' ||
    (input.notes !== undefined && typeof input.notes !== 'string')
  ) {
    return badRequest('invalid-body');
  }
  return respond(
    await journalFromEnv().addDay(params.slug ?? '', { date: input.date, cityId: input.cityId, title: input.title, notes: input.notes }),
  );
};
