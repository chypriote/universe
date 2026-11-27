import type { APIRoute } from 'astro';
import { provinceCovers } from '@/lib/journal';
import { badRequest, jsonBody, respond } from '../../_respond';

export const prerender = false;

/** Sets the focal point of the Province Cover: `{ x, y }` in percent. */
export const PUT: APIRoute = async ({ params, request }) => {
	const input = await jsonBody<{ x?: unknown; y?: unknown }>(request);
	if (typeof input?.x !== 'number' || typeof input.y !== 'number')
		return badRequest('invalid-body');
	return respond(await provinceCovers().setProvinceCoverFocus(params.name ?? '', input.x, input.y));
};
