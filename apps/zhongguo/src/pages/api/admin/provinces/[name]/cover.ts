import type { APIRoute } from 'astro';
import { provinceCovers } from '@/lib/journal';
import { badRequest, jsonBody, respond } from '../../_respond';

export const prerender = false;

/** Sets the Province Cover: `{ photoId }`. */
export const PUT: APIRoute = async ({ params, request }) => {
	const input = await jsonBody<{ photoId?: unknown }>(request);
	if (typeof input?.photoId !== 'number') return badRequest('invalid-body');
	return respond(await provinceCovers().setProvinceCover(params.name ?? '', input.photoId));
};

/** Clears the Province Cover: the Province falls back to its first Photo. */
export const DELETE: APIRoute = async ({ params }) =>
	respond(await provinceCovers().clearProvinceCover(params.name ?? ''));
