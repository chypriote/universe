import { catalogFromPlatform } from '#lib/server/catalog';
import type { BirdView } from '#lib/server/catalog';
import { ownerToken } from '@universe/owner/cookie';
import type { Cookies } from '@sveltejs/kit';

/** The load of one tab page: its tiles, and the Habitat and Songs lists the Bird form picks from. */
export async function loadView(cookies: Cookies, view: BirdView) {
	const catalog = catalogFromPlatform();
	const token = ownerToken(cookies);
	const [birds, habitats, songs] = await Promise.all([
		catalog.listBirds(token, { view }),
		catalog.listValues(token, 'habitat'),
		catalog.listValues(token, 'song')
	]);
	return { view, birds, habitats, songs };
}
