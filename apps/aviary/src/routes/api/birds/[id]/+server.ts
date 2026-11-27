import { catalogFromPlatform } from '#lib/server/catalog';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** The popup view of one Bird. */
export const GET: RequestHandler = async ({ params }) => {
	const bird = await catalogFromPlatform().getBird(Number(params.id));
	if (!bird) error(404, 'No bird');
	return Response.json(bird, { headers: { 'cache-control': 'private, no-store' } });
};
