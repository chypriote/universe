import { SNAPSHOT_PREFIX } from './snapshots';

/** What a write part changed. The module alone knows which snapshots each one drops (docs/adr/0004). */
export type Change =
	'trip' | 'plan' | 'province-cover' | 'season' | 'airport' | 'activity' | 'city';

/** The snapshots of the Trip pages: Trips, their Photos and Days, and what lists them. */
const TRIP_PAGES = ['trip/', 'trip-cards.json', 'home-map.json', 'gallery.json'];
/** The snapshots of the plan pages and the flight prices that follow the plans. */
const PLAN_PAGES = ['plan/', 'plan-cards.json', 'fares.json'];

/**
 * The snapshots each change can drop, as names under the build folder: a name ending in `/` is every snapshot in that
 * folder. A City feeds every page, so it drops all (null).
 */
const DROPPED: Record<Change, string[] | null> = {
	trip: TRIP_PAGES,
	plan: PLAN_PAGES,
	'province-cover': ['home-map.json'],
	season: ['fares.json'],
	airport: ['fares.json'],
	// Only Trip and plan pages show Activities.
	activity: ['trip/', 'plan/'],
	city: null
};

export type Invalidation = { changed(change: Change): Promise<void> };

/**
 * Deletes, in every build, the snapshots a change can drop; the next page load builds them again. A bucket error never
 * fails the write: the snapshots are left to expire.
 */
export function snapshotInvalidation(bucket: R2Bucket): Invalidation {
	return {
		async changed(change) {
			const names = DROPPED[change];
			const wanted = (key: string) => {
				if (!names) return true;
				const name = key.split('/').slice(2).join('/');
				return names.some((candidate) =>
					candidate.endsWith('/') ? name.startsWith(candidate) : name === candidate
				);
			};
			try {
				let cursor: string | undefined;
				do {
					const listed = await bucket.list({ prefix: SNAPSHOT_PREFIX, cursor });
					const keys = listed.objects.map((object) => object.key).filter(wanted);
					if (keys.length > 0) await bucket.delete(keys);
					cursor = listed.truncated ? listed.cursor : undefined;
				} while (cursor);
			} catch (error) {
				console.error('Dropping snapshots failed', change, error);
			}
		}
	};
}

/** A write answers `{ ok: false }` when it refused; any other answer means it went through. */
type Write = (...args: never[]) => Promise<unknown>;

/**
 * A write part that tells the invalidation what each of its writes changed, after the write succeeded.
 * A refused write (`ok: false`) and every method not named here call nothing.
 */
export function invalidating<Part extends object>(
	part: Part,
	changes: { [Name in keyof Part as Part[Name] extends Write ? Name : never]?: Change },
	invalidation: Invalidation
): Part {
	const wrapped = { ...part } as Record<string, unknown>;
	for (const [name, change] of Object.entries(changes) as [string, Change][]) {
		const write = (part as Record<string, (...args: unknown[]) => Promise<{ ok?: boolean }>>)[name];
		wrapped[name] = async (...args: unknown[]) => {
			const result = await write(...args);
			if (result.ok !== false) await invalidation.changed(change);
			return result;
		};
	}
	return wrapped as Part;
}
