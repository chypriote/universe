import type { APIRoute } from 'astro';
import { journalWorkspace } from '@/lib/journal';
import { badRequest, jsonBody, respond } from '../_respond';

export const prerender = false;

/** Creates an empty plan: `{ title }`. */
export const POST: APIRoute = async ({ request }) => {
	const input = await jsonBody<{ title?: unknown }>(request);
	if (typeof input?.title !== 'string') return badRequest('invalid-body');
	return respond(await journalWorkspace().createPlan(input.title));
};
