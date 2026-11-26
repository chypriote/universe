import type { APIRoute } from 'astro';
import { journalFromEnv } from '@/lib/journal';
import { badRequest, jsonBody, respond } from '../_respond';

export const prerender = false;

/** Switches a Trip on or off, `{ visible }`, or on or off the Plan page, `{ onPlan }`. */
export const PATCH: APIRoute = async ({ params, request }) => {
  const input = await jsonBody<{ visible?: unknown; onPlan?: unknown }>(request);
  const journal = journalFromEnv();
  if (typeof input?.onPlan === 'boolean') return respond(await journal.setTripOnPlan(params.slug ?? '', input.onPlan));
  if (typeof input?.visible !== 'boolean') return badRequest('invalid-body');
  return respond(await journal.setTripVisible(params.slug ?? '', input.visible));
};
