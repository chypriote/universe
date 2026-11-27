import type { APIRoute } from 'astro';
import { atlas } from '@/lib/journal';
import type { AddCityInput } from '@/lib/journal';
import { badRequest, jsonBody, respond } from '../_respond';

export const prerender = false;

/** The Photos of a City from every Trip. */
export const GET: APIRoute = async ({ params }) => {
	const photos = await atlas().listCityPhotos(Number(params.id));
	return photos ? Response.json(photos) : badRequest('unknown-city');
};

/** Edits the City: the same fields as adding one. */
export const PATCH: APIRoute = async ({ params, request }) => {
	const input = await jsonBody<AddCityInput>(request);
	return input
		? respond(await atlas().editCity({ ...input, id: Number(params.id) }))
		: badRequest('invalid-body');
};

export const DELETE: APIRoute = async ({ params }) =>
	respond(await atlas().deleteCity(Number(params.id)));
