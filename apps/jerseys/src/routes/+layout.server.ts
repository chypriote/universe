import { catalogFromPlatform } from '#lib/server/catalog';
import { ownerToken } from '@universe/owner/cookie';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const token = ownerToken(cookies);
	const isOwner = token !== '' && (await catalogFromPlatform().verifyToken(token));
	return { isOwner };
};
