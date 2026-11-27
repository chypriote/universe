import { catalogFromPlatform, UnauthorizedError } from '#lib/server/catalog';
import { error } from '@sveltejs/kit';
import { ownerToken } from '@universe/owner/cookie';
import type { RequestHandler } from './$types';

/** The popup view of one Bird. */
export const GET: RequestHandler = async ({ params, cookies }) => {
	try {
		const bird = await catalogFromPlatform().getBird(ownerToken(cookies), Number(params.id));
		if (!bird) error(404, 'No bird');
		return Response.json(bird, { headers: { 'cache-control': 'private, no-store' } });
	} catch (e) {
		if (e instanceof UnauthorizedError) {
			return Response.json({ error: 'Owner login required' }, { status: 401 });
		}
		throw e;
	}
};
