import type { APIRoute } from 'astro';
import { journalFromEnv } from '@/lib/journal';
import { badRequest, jsonBody, respond } from '../../_respond';

export const prerender = false;

/** Sets the Activities of a Day: `{ activityIds }`, in visit order. */
export const PUT: APIRoute = async ({ params, request }) => {
  const input = await jsonBody<{ activityIds?: unknown }>(request);
  const dayId = Number(params.id);
  if (!Number.isInteger(dayId) || !Array.isArray(input?.activityIds) || !input.activityIds.every((id) => typeof id === 'number')) {
    return badRequest('invalid-body');
  }
  return respond(await journalFromEnv().setDayActivities(dayId, input.activityIds));
};
