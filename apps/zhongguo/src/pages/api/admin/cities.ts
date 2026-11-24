import type { APIRoute } from 'astro';
import { journalFromEnv } from '@/lib/journal';
import type { AddCityInput } from '@/lib/journal';
import { badRequest, jsonBody, respond } from './_respond';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const input = await jsonBody<AddCityInput>(request);
  return input ? respond(await journalFromEnv().addCity(input)) : badRequest('invalid-body');
};
