import type { APIRoute } from 'astro';
import { journalFromEnv } from '@/lib/journal';
import { badRequest, jsonBody, respond } from '../../_respond';

export const prerender = false;

/** Sets the plan cover: `{ photoId }`. */
export const PUT: APIRoute = async ({ params, request }) => {
  const input = await jsonBody<{ photoId?: unknown }>(request);
  if (typeof input?.photoId !== 'number') return badRequest('invalid-body');
  return respond(await journalFromEnv().setPlanCover(params.slug ?? '', input.photoId));
};
