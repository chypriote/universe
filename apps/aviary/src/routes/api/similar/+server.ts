import { catalogFromPlatform, UnauthorizedError } from '#lib/server/catalog';
import { ownerToken } from '@universe/owner/cookie';
import type { RequestHandler } from './$types';

/** Birds whose name matches `?q=`, Archived included. The access guard answers 401 without a session. */
export const GET: RequestHandler = async ({ url, cookies }) => {
	try {
		const birds = await catalogFromPlatform().findSimilarNames(
			ownerToken(cookies),
			url.searchParams.get('q') ?? ''
		);
		return Response.json(birds);
	} catch (e) {
		if (e instanceof UnauthorizedError) {
			return Response.json({ error: 'Owner login required' }, { status: 401 });
		}
		throw e;
	}
};
