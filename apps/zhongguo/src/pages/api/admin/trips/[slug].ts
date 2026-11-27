import type { APIRoute } from 'astro';
import { journalWorkspace } from '@/lib/journal';
import { badRequest, jsonBody, respond } from '../_respond';

export const prerender = false;

/** Switches a Trip on or off, `{ visible }`. */
export const PATCH: APIRoute = async ({ params, request }) => {
	const input = await jsonBody<{ visible?: unknown }>(request);
	if (typeof input?.visible !== 'boolean') return badRequest('invalid-body');
	return respond(await journalWorkspace().setTripVisible(params.slug ?? '', input.visible));
};
