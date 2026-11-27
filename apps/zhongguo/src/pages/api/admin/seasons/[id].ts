import type { APIRoute } from 'astro';
import { atlas } from '@/lib/journal';
import { badRequest, jsonBody, respond } from '../_respond';

export const prerender = false;

/** Replaces the Season of a Province: `{ months }`, 1 = January. */
export const PUT: APIRoute = async ({ params, request }) => {
  const input = await jsonBody<{ months?: unknown }>(request);
  if (!Array.isArray(input?.months)) return badRequest('invalid-body');
  return respond(await atlas().setProvinceSeason(Number(params.id), input.months));
};
