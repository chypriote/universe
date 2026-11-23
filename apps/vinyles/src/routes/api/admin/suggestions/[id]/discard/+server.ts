import { json } from '@sveltejs/kit';
import { catalogFromPlatform } from '#lib/server/catalog';
import { ownerToken } from '@universe/owner/cookie';
import { endpointError } from '#lib/server/owner-actions';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, platform, cookies }) => {
	try {
		await catalogFromPlatform(platform).discardSuggestion(ownerToken(cookies), Number(params.id));
		return json({ ok: true });
	} catch (error) {
		return endpointError(error);
	}
};
