import type { APIRoute } from 'astro';
import { galleryWorkspace } from '@/lib/journal';
import { badRequest, jsonBody, respond } from '../_respond';

export const prerender = false;

/** Moves one picture to another Activity: `{ pictureId, activityId }`. */
export const POST: APIRoute = async ({ request }) => {
	const input = await jsonBody<{ pictureId?: unknown; activityId?: unknown }>(request);
	if (typeof input?.pictureId !== 'number' || typeof input.activityId !== 'number')
		return badRequest('invalid-body');
	return respond(await galleryWorkspace().moveActivityPicture(input.pictureId, input.activityId));
};
