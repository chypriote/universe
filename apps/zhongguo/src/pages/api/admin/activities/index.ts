import type { APIRoute } from 'astro';
import { journalFromEnv } from '@/lib/journal';
import type { ActivityInput } from '@/lib/journal';
import { badRequest, jsonBody, respond } from '../_respond';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const input = await jsonBody<ActivityInput>(request);
  return input ? respond(await journalFromEnv().addActivity(input)) : badRequest('invalid-body');
};

/** Every Activity with the number of Days that list it. */
export const GET: APIRoute = async () => Response.json({ ok: true, activities: await journalFromEnv().listAdminActivities() });
