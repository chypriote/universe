import { catalogFromPlatform, UnauthorizedError } from '#lib/server/catalog';
import { MAX_THUMB_BYTES } from '#lib/server/catalog/rules';
import { error } from '@sveltejs/kit';
import { ownerToken } from '@universe/owner/cookie';
import type { RequestHandler } from './$types';

/** The only way to a Picture. The guard already answers 401 without a session; the Catalog checks again. `?size=thumb` is the small copy. */
export const GET: RequestHandler = async ({ params, cookies, url }) => {
	let picture;
	try {
		picture = await catalogFromPlatform().getPicture(
			ownerToken(cookies),
			Number(params.id),
			url.searchParams.get('size') === 'thumb' ? 'thumb' : undefined
		);
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

/** The browser stores the thumbnail it made of a Picture that had none. */
export const PUT: RequestHandler = async ({ params, cookies, request }) => {
	if (request.headers.get('content-type') !== 'image/jpeg') error(400, 'JPEG only');
	const bytes = await request.arrayBuffer();
	if (bytes.byteLength === 0 || bytes.byteLength > MAX_THUMB_BYTES) error(400, 'Bad size');
	try {
		const stored = await catalogFromPlatform().putThumbnail(
			ownerToken(cookies),
			Number(params.id),
			bytes
		);
		if (!stored) error(404, 'No picture');
	} catch (e) {
		if (e instanceof UnauthorizedError) {
			return Response.json({ error: 'Owner login required' }, { status: 401 });
		}
		throw e;
	}
	return new Response(null, { status: 204 });
};
