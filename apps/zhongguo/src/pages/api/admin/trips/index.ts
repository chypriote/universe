import type { APIRoute } from 'astro';
import { journalWorkspace } from '@/lib/journal';
import { badRequest, jsonBody, respond } from '../_respond';

export const prerender = false;

/** Creates a Trip: `{ title, startDate, planDayIds }`; the Plan Days become its Days. */
export const POST: APIRoute = async ({ request }) => {
  const input = await jsonBody<{ title?: unknown; startDate?: unknown; planDayIds?: unknown }>(
    request,
  );
  if (
    typeof input?.title !== 'string' ||
    typeof input.startDate !== 'string' ||
    !Array.isArray(input.planDayIds) ||
    !input.planDayIds.every((id) => typeof id === 'number')
  ) {
    return badRequest('invalid-body');
  }
  return respond(
    await journalWorkspace().createTrip({
      title: input.title,
      startDate: input.startDate,
      planDayIds: input.planDayIds,
    }),
  );
};
