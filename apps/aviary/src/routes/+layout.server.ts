import { catalogFromPlatform } from '#lib/server/catalog';
import { ownerToken } from '@universe/owner/cookie';
import type { LayoutServerLoad } from './$types';

/** The access guard lets only the Owner past, except the login page: no labels there. */
export const load: LayoutServerLoad = async ({ cookies }) => {
	const catalog = catalogFromPlatform();
	const token = ownerToken(cookies);
	const labels = token !== '' && (await catalog.verifyToken(token)) ? await catalog.labels() : {};
	return { labels };
};
