import type { APIRoute } from 'astro';
import { atlas } from '@/lib/journal';
import type { AddCityInput } from '@/lib/journal';
import { badRequest, jsonBody, respond } from '../_respond';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const input = await jsonBody<AddCityInput>(request);
  return input ? respond(await atlas().addCity(input)) : badRequest('invalid-body');
};

/** Every City with what uses it. */
export const GET: APIRoute = async () =>
  Response.json({ ok: true, cities: await atlas().listAdminCities() });
