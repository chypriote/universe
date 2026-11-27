import type { Journal, TripPage } from './types';

/** Set by the build (`astro.config.mjs`): a new deploy never reads a snapshot made by the old code. */
declare const __BUILD_ID__: string;

const PREFIX = 'snapshots/';
/** A data migration run by hand does not pass through the admin, so a snapshot expires after this. */
const MAX_AGE_MS = 60 * 60 * 1000;

const keyOf = (kind: 'trip' | 'plan', slug: string) => `${PREFIX}${__BUILD_ID__}/${kind}/${encodeURIComponent(slug)}.json`;

/**
 * The Journal with the Trip and plan pages read from a JSON snapshot in the bucket (docs/adr/0004).
 * A miss, an old snapshot or an unreadable one builds the page from D1 and stores it again. The bucket
 * never breaks a page: any bucket error falls back to D1.
 */
export function withSnapshots(journal: Journal, bucket: R2Bucket): Journal {
  async function cached(kind: 'trip' | 'plan', slug: string, build: () => Promise<TripPage | null>) {
    const key = keyOf(kind, slug);
    try {
      const hit = await bucket.get(key);
      if (hit && Date.now() - hit.uploaded.getTime() < MAX_AGE_MS) return await hit.json<TripPage>();
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

  return {
    ...journal,
    getTrip: (slug) => cached('trip', slug, () => journal.getTrip(slug)),
    getPlan: (slug) => cached('plan', slug, () => journal.getPlan(slug)),
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
