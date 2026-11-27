import type { APIRoute } from 'astro';
import { journalFromEnv } from '@/lib/journal';
import type { ActivityInput, EditActivitiesInput } from '@/lib/journal';
import { badRequest, jsonBody, respond } from '../_respond';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const input = await jsonBody<ActivityInput>(request);
  return input ? respond(await journalFromEnv().addActivity(input)) : badRequest('invalid-body');
};

/** Every Activity with the number of Days that list it. */
export const GET: APIRoute = async () => Response.json({ ok: true, activities: await journalFromEnv().listAdminActivities() });

/** Sets one kind and/or rating on several Activities: `{ ids, kind?, rating? }`. */
export const PATCH: APIRoute = async ({ request }) => {
  const input = await jsonBody<EditActivitiesInput>(request);
  if (!input || !Array.isArray(input.ids) || !input.ids.every((id) => typeof id === 'number')) return badRequest('invalid-body');
  return respond(await journalFromEnv().editActivities(input));
};
