import { catalogFromPlatform } from '#lib/server/catalog';
import { MAX_THUMB_BYTES } from '#lib/server/catalog/rules';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** The only way to a Picture. The guard already answers 401 without a session. `?size=thumb` is the small copy. */
export const GET: RequestHandler = async ({ params, url }) => {
	const picture = await catalogFromPlatform().getPicture(
		Number(params.id),
		url.searchParams.get('size') === 'thumb' ? 'thumb' : undefined
	);
	if (!picture) error(404, 'No picture');
	return new Response(picture.body, {
		headers: { 'content-type': picture.contentType, 'cache-control': 'private, max-age=86400' }
	});
};

/** The browser stores the thumbnail it made of a Picture that had none. */
export const PUT: RequestHandler = async ({ params, request }) => {
	if (request.headers.get('content-type') !== 'image/jpeg') error(400, 'JPEG only');
	const bytes = await request.arrayBuffer();
	if (bytes.byteLength === 0 || bytes.byteLength > MAX_THUMB_BYTES) error(400, 'Bad size');
	const stored = await catalogFromPlatform().putThumbnail(Number(params.id), bytes);
	if (!stored) error(404, 'No picture');
	return new Response(null, { status: 204 });
};
