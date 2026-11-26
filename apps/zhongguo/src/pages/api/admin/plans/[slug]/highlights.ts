import type { APIRoute } from 'astro';
import { journalFromEnv } from '@/lib/journal';
import { badRequest, jsonBody, respond } from '../../_respond';

export const prerender = false;

/** Sets the Highlight Photos of a plan: `{ photoIds }`, in order. */
export const PUT: APIRoute = async ({ params, request }) => {
  const input = await jsonBody<{ photoIds?: unknown }>(request);
  if (!Array.isArray(input?.photoIds) || !input.photoIds.every((id) => typeof id === 'number')) {
    return badRequest('invalid-body');
  }
  return respond(await journalFromEnv().setPlanHighlightPhotos(params.slug ?? '', input.photoIds));
};
