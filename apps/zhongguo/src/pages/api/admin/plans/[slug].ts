import type { APIRoute } from 'astro';
import { journalFromEnv } from '@/lib/journal';
import { badRequest, jsonBody, respond } from '../_respond';

export const prerender = false;

/** Switches a plan on or off the site, `{ visible }`, or its flight search, `{ searchFlights }`. */
export const PATCH: APIRoute = async ({ params, request }) => {
  const input = await jsonBody<{ visible?: unknown; searchFlights?: unknown }>(request);
  const journal = journalFromEnv();
  if (typeof input?.visible === 'boolean') return respond(await journal.setPlanVisible(params.slug ?? '', input.visible));
  if (typeof input?.searchFlights === 'boolean') return respond(await journal.setPlanSearchFlights(params.slug ?? '', input.searchFlights));
  return badRequest('invalid-body');
};
