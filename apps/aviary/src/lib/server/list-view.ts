import { catalogFromPlatform } from '#lib/server/catalog';
import type { BirdView } from '#lib/server/catalog';
import { ownerToken } from '@universe/owner/cookie';
import type { Cookies } from '@sveltejs/kit';

/** The load of one tab page: its tiles. */
export async function loadView(cookies: Cookies, view: BirdView) {
	return { view, birds: await catalogFromPlatform().listBirds(ownerToken(cookies), { view }) };
}
