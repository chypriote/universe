import type { APIRoute } from 'astro';
import { journalFromEnv } from '@/lib/journal';
import { badRequest, jsonBody, respond } from '../../_respond';

export const prerender = false;

/** Sets the Photos of a plan Day: `{ photoIds }`, in order. */
export const PUT: APIRoute = async ({ params, request }) => {
  const input = await jsonBody<{ photoIds?: unknown }>(request);
  const dayId = Number(params.id);
  if (!Number.isInteger(dayId) || !Array.isArray(input?.photoIds) || !input.photoIds.every((id) => typeof id === 'number')) {
    return badRequest('invalid-body');
  }
  return respond(await journalFromEnv().setPlanDayPhotos(dayId, input.photoIds));
};
