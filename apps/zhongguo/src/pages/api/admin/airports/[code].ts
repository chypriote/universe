import type { APIRoute } from 'astro';
import { journalFromEnv } from '@/lib/journal';
import { badRequest, jsonBody, respond } from '../_respond';

export const prerender = false;

/** Adds the Airport to a City or saves its direct weekdays: `{ cityId, directWeekdays }`, 1 = Monday. */
export const PUT: APIRoute = async ({ params, request }) => {
  const input = await jsonBody<{ cityId?: unknown; directWeekdays?: unknown }>(request);
  if (typeof input?.cityId !== 'number' || !Array.isArray(input.directWeekdays)) return badRequest('invalid-body');
  return respond(
    await journalFromEnv().setAirport({ code: params.code ?? '', cityId: input.cityId, directWeekdays: input.directWeekdays }),
  );
};

export const DELETE: APIRoute = async ({ params }) => respond(await journalFromEnv().deleteAirport(params.code ?? ''));
