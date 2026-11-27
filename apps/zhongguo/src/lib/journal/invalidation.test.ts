import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { invalidating, snapshotInvalidation } from './invalidation';

const NAMES = [
  'trip/yunnan-trip.json',
  'trip-cards.json',
  'plan/yunnan-plan.json',
  'plan-cards.json',
  'home-map.json',
  'gallery.json',
  'fares.json',
];

const snapshot = (name: string, build = 'build-1') => `snapshots/${build}/${name}`;

async function left() {
  const { objects } = await env.PHOTOS.list();
  return objects.map((object) => object.key).sort();
}

/** Every key still there, except the named snapshots of build-1 (and the old build's home map when named). */
function allBut(...names: string[]) {
  const keys = [
    ...NAMES.map((name) => snapshot(name)),
    snapshot('home-map.json', 'build-0'),
    'trips/yunnan/photo.jpg',
  ];
  return keys.filter((key) => !names.map((name) => snapshot(name)).includes(key)).sort();
}

beforeEach(async () => {
  const { objects } = await env.PHOTOS.list();
  if (objects.length > 0) await env.PHOTOS.delete(objects.map((object) => object.key));
  for (const name of NAMES) await env.PHOTOS.put(snapshot(name), '{}');
  await env.PHOTOS.put(snapshot('home-map.json', 'build-0'), '{}');
  await env.PHOTOS.put('trips/yunnan/photo.jpg', 'x');
});

describe('Snapshot invalidation', () => {
  it('after a Trip changed, the Trip pages, their lists, the home map and the Gallery are gone', async () => {
    await snapshotInvalidation(env.PHOTOS).changed('trip');

    const dropped = ['trip/yunnan-trip.json', 'trip-cards.json', 'home-map.json', 'gallery.json'];
    // The home map of the old build goes too: a drop covers every build.
    expect(await left()).toEqual(
      allBut(...dropped).filter((key) => key !== snapshot('home-map.json', 'build-0')),
    );
  });

  it('after a plan changed, the plan pages, their list and the fares are gone', async () => {
    await snapshotInvalidation(env.PHOTOS).changed('plan');

    expect(await left()).toEqual(allBut('plan/yunnan-plan.json', 'plan-cards.json', 'fares.json'));
  });

  it.each(['season', 'airport'] as const)(
    'after a %s changed, only the fares are gone',
    async (change) => {
      await snapshotInvalidation(env.PHOTOS).changed(change);

      expect(await left()).toEqual(allBut('fares.json'));
    },
  );

  it('after an Activity changed, only the Trip and plan pages are gone', async () => {
    await snapshotInvalidation(env.PHOTOS).changed('activity');

    expect(await left()).toEqual(allBut('trip/yunnan-trip.json', 'plan/yunnan-plan.json'));
  });

  it('after a Province Cover changed, the home map is gone in every build and the Trips stay', async () => {
    await snapshotInvalidation(env.PHOTOS).changed('province-cover');

    const keys = await left();
    expect(keys).not.toContain(snapshot('home-map.json'));
    expect(keys).not.toContain(snapshot('home-map.json', 'build-0'));
    expect(keys).toContain(snapshot('trip/yunnan-trip.json'));
    expect(keys).toContain(snapshot('trip-cards.json'));
  });

  it('after a City changed, every snapshot is gone but the photos stay', async () => {
    await snapshotInvalidation(env.PHOTOS).changed('city');

    expect(await left()).toEqual(['trips/yunnan/photo.jpg']);
  });

  it('never fails the write when the bucket fails', async () => {
    const broken = { list: () => Promise.reject(new Error('bucket down')) } as unknown as R2Bucket;

    await expect(snapshotInvalidation(broken).changed('trip')).resolves.toBeUndefined();
  });
});

describe('A write part that invalidates', () => {
  const part = {
    save: async (ok: boolean) =>
      ok ? { ok: true as const } : { ok: false as const, error: 'nope' },
    read: async () => 'untouched',
  };

  it('drops after a successful write', async () => {
    const wrapped = invalidating(part, { save: 'season' }, snapshotInvalidation(env.PHOTOS));

    await wrapped.save(true);

    expect(await left()).not.toContain(snapshot('fares.json'));
  });

  it('drops nothing after a refused write, nor after a read', async () => {
    const wrapped = invalidating(part, { save: 'season' }, snapshotInvalidation(env.PHOTOS));

    expect(await wrapped.save(false)).toEqual({ ok: false, error: 'nope' });
    expect(await wrapped.read()).toBe('untouched');

    expect(await left()).toContain(snapshot('fares.json'));
  });

  it('drops every snapshot after a write it was not told about', async () => {
    const wrapped = invalidating(
      { ...part, rename: async () => ({ ok: true as const }) },
      { save: 'season' },
      snapshotInvalidation(env.PHOTOS),
    );

    await wrapped.rename();

    expect(await left()).toEqual(['trips/yunnan/photo.jpg']);
  });

  it('drops nothing after a refused unlisted write', async () => {
    const wrapped = invalidating(
      { ...part, rename: async () => ({ ok: false as const }) },
      { save: 'season' },
      snapshotInvalidation(env.PHOTOS),
    );

    await wrapped.rename();

    expect(await left()).toEqual(allBut());
  });

  it('counts a write that answers without ok as a success', async () => {
    const wrapped = invalidating(
      { removeAll: async () => ({ deleted: [1], kept: [] }) },
      { removeAll: 'trip' },
      snapshotInvalidation(env.PHOTOS),
    );

    await wrapped.removeAll();

    expect(await left()).not.toContain(snapshot('trip-cards.json'));
  });

  it('drops nothing when a delete deleted nothing', async () => {
    const wrapped = invalidating(
      { removeAll: async () => ({ deleted: [] as number[], kept: [{ id: 2 }] }) },
      { removeAll: 'trip' },
      snapshotInvalidation(env.PHOTOS),
    );

    await wrapped.removeAll();

    expect(await left()).toEqual(allBut());
  });

  it('does not wrap a read', async () => {
    const wrapped = invalidating(
      { ...part, listThings: async () => [1], getThing: async () => 2 },
      { save: 'season' },
      snapshotInvalidation(env.PHOTOS),
    );

    await wrapped.listThings();
    await wrapped.getThing();

    expect(await left()).toEqual(allBut());
  });
});
