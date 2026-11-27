import type { Journal } from './types';

/** Set by the build (`astro.config.mjs`): a new deploy never reads a snapshot made by the old code. */
declare const __BUILD_ID__: string;

const PREFIX = 'snapshots/';
/** A data migration run by hand does not pass through the admin, so a snapshot expires after this. */
const MAX_AGE_MS = 60 * 60 * 1000;

const keyOf = (name: string, slug?: string) =>
  `${PREFIX}${__BUILD_ID__}/${name}${slug === undefined ? '' : `/${encodeURIComponent(slug)}`}.json`;

/**
 * The Journal with the pages read from a JSON snapshot in the bucket (docs/adr/0004).
 * A miss, an old snapshot or an unreadable one builds the page from D1 and stores it again. The bucket
 * never breaks a page: any bucket error falls back to D1.
 */
export function withSnapshots(journal: Journal, bucket: R2Bucket): Journal {
  async function cached<T>(name: string, slug: string | undefined, build: () => Promise<T | null>) {
    const key = keyOf(name, slug);
    try {
      const hit = await bucket.get(key);
      if (hit && Date.now() - hit.uploaded.getTime() < MAX_AGE_MS) return await hit.json<T>();
    } catch (error) {
      console.error('Snapshot read failed', key, error);
    }
    const page = await build();
    // Only pages that exist: an unknown slug must not write to the bucket.
    if (page) {
      try {
        await bucket.put(key, JSON.stringify(page), { httpMetadata: { contentType: 'application/json' } });
      } catch (error) {
        console.error('Snapshot write failed', key, error);
      }
    }
    return page;
  }

  /** A page that always exists: the build never answers null. */
  const always = async <T>(name: string, build: () => Promise<T>) => (await cached(name, undefined, build))!;

  return {
    ...journal,
    getTrip: (slug) => cached('trip', slug, () => journal.getTrip(slug)),
    getPlan: (slug) => cached('plan', slug, () => journal.getPlan(slug)),
    listTripCards: () => always('trip-cards', () => journal.listTripCards()),
    listPlanCards: () => always('plan-cards', () => journal.listPlanCards()),
    getHomeMap: () => always('home-map', () => journal.getHomeMap()),
    getGallery: () => always('gallery', () => journal.getGallery()),
    getFareData: () => always('fares', () => journal.getFareData()),
  };
}

/** Deletes every snapshot, of every build. The next page load builds it again. */
export async function dropSnapshots(bucket: R2Bucket) {
  let cursor: string | undefined;
  do {
    const listed = await bucket.list({ prefix: PREFIX, cursor });
    if (listed.objects.length > 0) await bucket.delete(listed.objects.map((object) => object.key));
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
}
