import { catalogFromPlatform } from '#lib/server/catalog';
import type { BirdView, NestFilter } from '#lib/server/catalog';
import { ownerToken } from '@universe/owner/cookie';
import type { Cookies } from '@sveltejs/kit';

const positiveInt = (value: string | null) => {
	const n = Number(value);
	return value !== null && Number.isInteger(n) && n > 0 ? n : undefined;
};

/** The filters in a tab URL: `habitat`, `song`, `nest` (only | not) and `search`. */
export function parseFilters(params: URLSearchParams) {
	const nest = params.get('nest');
	return {
		habitat: positiveInt(params.get('habitat')),
		song: positiveInt(params.get('song')),
		nest: (nest === 'only' || nest === 'not' ? nest : 'all') as NestFilter,
		search: params.get('search')?.trim() ?? ''
	};
}

/** The load of one tab page: its tiles under the URL's filters, and the filter options. */
export async function loadView(cookies: Cookies, url: URL, view: BirdView) {
	const catalog = catalogFromPlatform();
	const token = ownerToken(cookies);
	const filters = parseFilters(url.searchParams);
	const [birds, habitats, songs] = await Promise.all([
		catalog.listBirds(token, { view, ...filters }),
		catalog.listValues(token, 'habitat'),
		catalog.listValues(token, 'song')
	]);
	return {
		view,
		birds,
		filters,
		habitats: habitats.map(({ id, name }) => ({ id, name })),
		songs: songs.map(({ id, name }) => ({ id, name }))
	};
}
