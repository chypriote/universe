import type { APIRoute } from 'astro';
import { journalFromEnv } from '@/lib/journal';
import { badRequest, jsonBody, respond } from '../../_respond';

export const prerender = false;

/** Sets the focal point of the Trip Cover: `{ x, y }` in percent. */
export const PUT: APIRoute = async ({ params, request }) => {
  const input = await jsonBody<{ x?: unknown; y?: unknown }>(request);
  if (typeof input?.x !== 'number' || typeof input.y !== 'number') return badRequest('invalid-body');
  return respond(await journalFromEnv().setTripCoverFocus(params.slug ?? '', input.x, input.y));
};
