import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createJournal } from './index';
import { addCity, addDay, addPlan, addPlanDay, addProvince, addTrip, resetDatabase } from './seed.test-helper';
import { dropSnapshots, withSnapshots } from './snapshots';

beforeEach(resetDatabase);

/** A Journal that counts the page builds, over the real one. */
function counted() {
  const journal = createJournal(env);
  const calls = { getTrip: 0, getPlan: 0 };
  const wrapped = {
    ...journal,
    getTrip: (slug: string) => (calls.getTrip++, journal.getTrip(slug)),
    getPlan: (slug: string) => (calls.getPlan++, journal.getPlan(slug)),
  };
  return { journal: withSnapshots(wrapped, env.PHOTOS), calls, raw: journal };
}

async function seed() {
  const province = await addProvince('Yunnan', '云南');
  const city = await addCity('Kunming', province, { major: true, nameZh: '昆明' });
  const trip = await addTrip({ slug: 'yunnan-trip', title: 'Yunnan trip' });
  await addDay(trip, city, '2027-05-01');
  const plan = await addPlan({ slug: 'yunnan-plan', title: 'Yunnan plan' });
  await addPlanDay(plan, city, 1);
}

describe('Snapshots', () => {
  it('builds a Trip page once, then serves the same page from the bucket', async () => {
    await seed();
    const { journal, calls } = counted();

    const first = await journal.getTrip('yunnan-trip');
    const second = await journal.getTrip('yunnan-trip');

    expect(calls.getTrip).toBe(1);
    expect(second).toEqual(first);
    expect((await env.PHOTOS.list({ prefix: 'snapshots/' })).objects).toHaveLength(1);
  });

  it('keeps a Trip and a plan with the same slug apart', async () => {
    await seed();
    const { journal, calls } = counted();

    await journal.getTrip('yunnan-trip');
    await journal.getPlan('yunnan-plan');
    await journal.getPlan('yunnan-plan');

    expect(calls).toEqual({ getTrip: 1, getPlan: 1 });
  });

  it('serves the lists, the home map, the Gallery and the fare data from the bucket too', async () => {
    await seed();
    const { raw } = counted();
    const spies = ['listTripCards', 'listPlanCards', 'getHomeMap', 'getGallery', 'getFareData'] as const;
    const counts = Object.fromEntries(spies.map((name) => [name, 0]));
    const wrapped = { ...raw };
    for (const name of spies) {
      const original = raw[name].bind(raw);
      (wrapped as Record<string, unknown>)[name] = () => (counts[name]++, original());
    }
    const cached = withSnapshots(wrapped, env.PHOTOS);

    const first = await Promise.all(spies.map((name) => cached[name]()));
    const second = await Promise.all(spies.map((name) => cached[name]()));

    expect(counts).toEqual({ listTripCards: 1, listPlanCards: 1, getHomeMap: 1, getGallery: 1, getFareData: 1 });
    expect(second).toEqual(JSON.parse(JSON.stringify(first)));
  });

  it('stores nothing for a page that does not exist', async () => {
    const { journal } = counted();

    expect(await journal.getTrip('nope')).toBeNull();

    expect((await env.PHOTOS.list({ prefix: 'snapshots/' })).objects).toHaveLength(0);
  });

  it('builds the page again after the snapshots are dropped', async () => {
    await seed();
    const { journal, calls, raw } = counted();
    await journal.getTrip('yunnan-trip');
    await raw.setTripVisible('yunnan-trip', false);

    expect(await journal.getTrip('yunnan-trip')).not.toBeNull();
    await dropSnapshots(env.PHOTOS);

    expect(await journal.getTrip('yunnan-trip')).toBeNull();
    expect(calls.getTrip).toBe(2);
  });

  it('builds the page again when the snapshot is more than an hour old', async () => {
    await seed();
    const { journal, calls } = counted();
    await journal.getTrip('yunnan-trip');

    vi.useFakeTimers({ toFake: ['Date'], now: Date.now() + 61 * 60 * 1000 });
    try {
      await journal.getTrip('yunnan-trip');
    } finally {
      vi.useRealTimers();
    }

    expect(calls.getTrip).toBe(2);
  });

  it('builds the page from D1 when the snapshot is unreadable', async () => {
    await seed();
    const { journal, calls } = counted();
    await journal.getTrip('yunnan-trip');
    const [{ key }] = (await env.PHOTOS.list({ prefix: 'snapshots/' })).objects;
    await env.PHOTOS.put(key, 'not json');

    expect(await journal.getTrip('yunnan-trip')).not.toBeNull();
    expect(calls.getTrip).toBe(2);
  });
});
