import type { APIRoute } from 'astro';
import { atlas } from '@/lib/journal';
import type { ActivityInput } from '@/lib/journal';
import { badRequest, jsonBody, respond } from '../_respond';

export const prerender = false;

/** Edits the Activity: the same fields as adding one. */
export const PATCH: APIRoute = async ({ params, request }) => {
	const input = await jsonBody<ActivityInput>(request);
	return input
		? respond(await atlas().editActivity({ ...input, id: Number(params.id) }))
		: badRequest('invalid-body');
};

export const DELETE: APIRoute = async ({ params }) =>
	respond(await atlas().deleteActivity(Number(params.id)));
