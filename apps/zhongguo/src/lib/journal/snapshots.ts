import type { PublicReads } from './types';

/** Set by the build (`astro.config.mjs`): a new deploy never reads a snapshot made by the old code. */
declare const __BUILD_ID__: string;

const PREFIX = 'snapshots/';
/** A data migration run by hand does not pass through the admin, so a snapshot expires after this. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/** `npm run china` writes the flight searches without the admin, so the fare data expires sooner. */
const FARES_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const keyOf = (name: string, slug?: string) =>
	`${PREFIX}${__BUILD_ID__}/${name}${slug === undefined ? '' : `/${encodeURIComponent(slug)}`}.json`;

/**
 * The Journal with the pages read from a JSON snapshot in the bucket (docs/adr/0004).
 * A miss, an old snapshot or an unreadable one builds the page from D1 and stores it again. The bucket
 * never breaks a page: any bucket error falls back to D1. When D1 fails (its daily quota, say), an old
 * snapshot of the same build is served instead of the error.
 */
export function withSnapshots(journal: PublicReads, bucket: R2Bucket): PublicReads {
	async function cached<T>(
		name: string,
		slug: string | undefined,
		build: () => Promise<T | null>,
		maxAge = MAX_AGE_MS
	) {
		const key = keyOf(name, slug);
		let old: R2ObjectBody | null = null;
		try {
			const hit = await bucket.get(key);
			if (hit && Date.now() - hit.uploaded.getTime() < maxAge) return await hit.json<T>();
			old = hit;
		} catch (error) {
			console.error('Snapshot read failed', key, error);
		}
		let page: T | null;
		try {
			page = await build();
		} catch (error) {
			if (!old) throw error;
			console.error('D1 failed, serving the old snapshot', key, error);
			return await old.json<T>();
		}
		// Only pages that exist: an unknown slug must not write to the bucket.
		if (page) {
			try {
				await bucket.put(key, JSON.stringify(page), {
					httpMetadata: { contentType: 'application/json' }
				});
			} catch (error) {
				console.error('Snapshot write failed', key, error);
			}
		}
		return page;
	}

	/** A page that always exists: the build never answers null. */
	const always = async <T>(name: string, build: () => Promise<T>, maxAge?: number) =>
		(await cached(name, undefined, build, maxAge))!;

	return {
		...journal,
		getTrip: (slug) => cached('trip', slug, () => journal.getTrip(slug)),
		getPlan: (slug) => cached('plan', slug, () => journal.getPlan(slug)),
		listTripCards: () => always('trip-cards', () => journal.listTripCards()),
		listPlanCards: () => always('plan-cards', () => journal.listPlanCards()),
		getHomeMap: () => always('home-map', () => journal.getHomeMap()),
		getGallery: () => always('gallery', () => journal.getGallery()),
		getFareData: () => always('fares', () => journal.getFareData(), FARES_MAX_AGE_MS)
	};
}

/** The snapshots of the Trip pages: Trips, their Photos and Days, and what lists them. */
const TRIP_PAGES = ['trip/', 'trip-cards.json', 'home-map.json', 'gallery.json'];
/** The snapshots of the plan pages and the flight prices that follow the plans. */
const PLAN_PAGES = ['plan/', 'plan-cards.json', 'fares.json'];

/**
 * The snapshots a write to an admin API can change, as names under the build folder: a name ending in `/` is every
 * snapshot in that folder. Cities, Activities and any route not listed here feed every page, so they drop all.
 * @returns null for all of them.
 */
export function snapshotsChangedBy(path: string): string[] | null {
	const [area, , part] = path.replace(/^\/api\/admin\//, '').split('/');
	switch (area) {
		case 'trips':
		case 'days':
		case 'photos':
			return TRIP_PAGES;
		case 'plans':
		case 'plan-days':
		case 'plan-photos':
			return PLAN_PAGES;
		case 'seasons':
		case 'airports':
			return ['fares.json'];
		case 'provinces':
			return part === 'cover' || part === 'focus' ? ['home-map.json'] : null;
		default:
			return null;
	}
}

/** Deletes the snapshots of every build, all of them or the named ones (see `snapshotsChangedBy`). The next page load builds them again. */
export async function dropSnapshots(bucket: R2Bucket, names: string[] | null = null) {
	const wanted = (key: string) => {
		if (!names) return true;
		const name = key.split('/').slice(2).join('/');
		return names.some((candidate) =>
			candidate.endsWith('/') ? name.startsWith(candidate) : name === candidate
		);
	};
	let cursor: string | undefined;
	do {
		const listed = await bucket.list({ prefix: PREFIX, cursor });
		const keys = listed.objects.map((object) => object.key).filter(wanted);
		if (keys.length > 0) await bucket.delete(keys);
		cursor = listed.truncated ? listed.cursor : undefined;
	} while (cursor);
}
