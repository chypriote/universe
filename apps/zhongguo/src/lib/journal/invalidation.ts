import { SNAPSHOT_PREFIX } from './snapshots';

/** What a write part changed. The module alone knows which snapshots each one drops (docs/adr/0004). */
export type Change =
  'trip' | 'plan' | 'province-cover' | 'season' | 'airport' | 'activity' | 'city' | 'unknown';

/** The snapshots of the Trip pages: Trips, their Photos and Days, and what lists them. */
const TRIP_PAGES = ['trip/', 'trip-cards.json', 'home-map.json', 'gallery.json'];
/** The snapshots of the plan pages and the flight prices that follow the plans. */
const PLAN_PAGES = ['plan/', 'plan-cards.json', 'fares.json'];

/**
 * The snapshots each change can drop, as names under the build folder: a name ending in `/` is every snapshot in that
 * folder. A City feeds every page, and a write nobody
 * classified may change anything, so both drop all (null).
 */
const DROPPED: Record<Change, string[] | null> = {
  trip: TRIP_PAGES,
  plan: PLAN_PAGES,
  'province-cover': ['home-map.json'],
  season: ['fares.json'],
  airport: ['fares.json'],
  // Only Trip and plan pages show Activities.
  activity: ['trip/', 'plan/'],
  city: null,
  unknown: null,
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
          candidate.endsWith('/') ? name.startsWith(candidate) : name === candidate,
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
    },
  };
}

/** A write answers `{ ok: false }` when it refused; any other answer means it went through. */
type Write = (...args: never[]) => Promise<unknown>;

/** Reads are named `get…`, `list…` or `read…`; every other method of a part writes. */
const isRead = (name: string) => /^(get|list|read)(?![a-z])/.test(name);

/** A write went through unless it refused (`ok: false`) or deleted nothing (`deleted: []`). */
function wentThrough(result: unknown) {
  const answer = result as { ok?: boolean; deleted?: unknown[] } | null | undefined;
  if (answer?.ok === false) return false;
  return !(Array.isArray(answer?.deleted) && answer.deleted.length === 0);
}

/**
 * A write part that tells the invalidation what each of its writes changed, after the write succeeded.
 * A write the map does not name drops every snapshot: safe by default. A refused write, a delete that deleted
 * nothing and every read (`get…`, `list…`) call nothing.
 */
export function invalidating<Part extends object>(
  part: Part,
  changes: { [Name in keyof Part as Part[Name] extends Write ? Name : never]?: Change },
  invalidation: Invalidation,
): Part {
  const wrapped = { ...part } as Record<string, unknown>;
  const named = changes as Record<string, Change>;
  for (const [name, member] of Object.entries(part)) {
    if (typeof member !== 'function' || isRead(name)) continue;
    const write = member as (...args: unknown[]) => Promise<unknown>;
    wrapped[name] = async (...args: unknown[]) => {
      const result = await write.apply(part, args);
      if (wentThrough(result)) await invalidation.changed(named[name] ?? 'unknown');
      return result;
    };
  }
  return wrapped as Part;
}
