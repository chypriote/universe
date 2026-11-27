import { catalogFromPlatform } from '#lib/server/catalog';
import type { BirdView, NestFilter, RoostedFilter, SeenFilter } from '#lib/server/catalog';

const positiveInt = (value: string | null) => {
	const n = Number(value);
	return value !== null && Number.isInteger(n) && n > 0 ? n : undefined;
};

/** The filters in a tab URL: `habitat`, `song`, `seen` (only | not), `nest` (only | not), `roosted` (only) and `search`. */
export function parseFilters(params: URLSearchParams) {
	const nest = params.get('nest');
	const seen = params.get('seen');
	return {
		habitat: positiveInt(params.get('habitat')),
		song: positiveInt(params.get('song')),
		seen: (seen === 'only' || seen === 'not' ? seen : 'all') as SeenFilter,
		nest: (nest === 'only' || nest === 'not' ? nest : 'all') as NestFilter,
		roosted: (params.get('roosted') === 'only' ? 'only' : 'all') as RoostedFilter,
		search: params.get('search')?.trim() ?? ''
	};
}

/** The load of one tab page: its tiles under the URL's filters, and the filter options. */
export async function loadView(url: URL, view: BirdView) {
	const catalog = catalogFromPlatform();
	const filters = parseFilters(url.searchParams);
	const [birds, habitats, songs] = await Promise.all([
		catalog.listBirds({ view, ...filters }),
		catalog.listValues('habitat'),
		catalog.listValues('song')
	]);
	return {
		view,
		birds,
		filters,
		habitats: habitats.map(({ id, name }) => ({ id, name })),
		songs: songs.map(({ id, name }) => ({ id, name }))
	};
}
