import { catalogFromPlatform, UnauthorizedError } from '#lib/server/catalog';
import { error } from '@sveltejs/kit';
import { ownerToken } from '@universe/owner/cookie';
import type { RequestHandler } from './$types';

/** The only way to a Picture. The guard already answers 401 without a session; the Catalog checks again. */
export const GET: RequestHandler = async ({ params, cookies }) => {
	let picture;
	try {
		picture = await catalogFromPlatform().getPicture(ownerToken(cookies), Number(params.id));
	} catch (e) {
		if (e instanceof UnauthorizedError) {
			return Response.json({ error: 'Owner login required' }, { status: 401 });
		}
		throw e;
	}
	if (!picture) error(404, 'No picture');
	return new Response(picture.body, {
		headers: { 'content-type': picture.contentType, 'cache-control': 'private, max-age=86400' }
	});
};
