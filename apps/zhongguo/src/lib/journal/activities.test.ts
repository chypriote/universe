import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { createJournal } from './index';
import type { ActivityInput } from './index';
import { addActivity, addCity, addDay, addPlan, addPlanDay, addProvince, addTrip, listActivity, resetDatabase } from './seed.test-helper';

const journal = createJournal(env);

beforeEach(resetDatabase);

async function world() {
  const sichuan = await addProvince('Sichuan');
  const gansu = await addProvince('Gansu');
  return { chengdu: await addCity('Chengdu', sichuan), lanzhou: await addCity('Lanzhou', gansu) };
}

const input = (cityId: number, changes: Partial<ActivityInput> = {}): ActivityInput => ({
  name: 'Pandas',
  nameZh: '熊猫基地',
  pinyin: 'Xióngmāo Jīdì',
  cityId,
  kind: 'nature',
  description: '',
  address: '',
  addressZh: '',
  lat: null,
  lng: null,
  rating: null,
  price: null,
  ...changes,
});

describe('Activities admin', () => {
  it('adds an Activity and lists it with its City and Province, by City and name', async () => {
    const { chengdu, lanzhou } = await world();

    const added = await journal.addActivity(
      input(chengdu, { name: ' Pandas ', rating: 'do-not-miss', price: 0, lat: 30.73, lng: 104.14, addressZh: '成都市' }),
    );
    await journal.addActivity(input(lanzhou, { name: 'Old street', nameZh: '老街', pinyin: 'Lǎojiē', kind: 'heritage' }));
    await journal.addActivity(input(chengdu, { name: 'Archive', nameZh: '档案', pinyin: 'Dàng’àn', kind: 'show' }));

    expect(added).toMatchObject({
      ok: true,
      activity: { name: 'Pandas', city: 'Chengdu', province: 'Sichuan', rating: 'do-not-miss', price: 0, lat: 30.73, days: 0 },
    });
    expect((await journal.listAdminActivities()).map((activity) => [activity.city, activity.name])).toEqual([
      ['Chengdu', 'Archive'],
      ['Chengdu', 'Pandas'],
      ['Lanzhou', 'Old street'],
    ]);
  });

  it('refuses a blank name, an unknown kind, rating, City, a bad price or position, and a name taken in the City', async () => {
    const { chengdu, lanzhou } = await world();
    await journal.addActivity(input(chengdu));

    const refused = async (changes: Partial<ActivityInput>, cityId = chengdu) =>
      (await journal.addActivity(input(cityId, changes)) as { error: string }).error;

    expect(await refused({ name: ' ' })).toBe('invalid-name');
    expect(await refused({ nameZh: '' })).toBe('invalid-name');
    expect(await refused({ pinyin: '' })).toBe('invalid-name');
    expect(await refused({ kind: 'food' as never })).toBe('invalid-kind');
    expect(await refused({ rating: 'great' as never })).toBe('invalid-rating');
    expect(await refused({ price: -1 })).toBe('invalid-price');
    expect(await refused({ price: 1.5 })).toBe('invalid-price');
    expect(await refused({ lat: 30, lng: null })).toBe('invalid-position');
    expect(await refused({ lat: 91, lng: 100 })).toBe('invalid-position');
    expect(await refused({}, 9999)).toBe('unknown-city');
    expect(await refused({})).toBe('name-taken');
    expect((await journal.addActivity(input(lanzhou))).ok).toBe(true);
    expect(await journal.listAdminActivities()).toHaveLength(2);
  });

  it('edits an Activity, keeps its own name, and moves it to another City', async () => {
    const { chengdu, lanzhou } = await world();
    const added = await journal.addActivity(input(chengdu));
    const id = (added as { activity: { id: number } }).activity.id;
    await journal.addActivity(input(chengdu, { name: 'Archive' }));

    const edited = await journal.editActivity({ ...input(lanzhou, { rating: 'skippable', price: 40 }), id });

    expect(edited).toMatchObject({ ok: true, activity: { id, city: 'Lanzhou', rating: 'skippable', price: 40 } });
    expect(await journal.editActivity({ ...input(chengdu, { name: 'Archive' }), id })).toEqual({ ok: false, error: 'name-taken' });
    expect(await journal.editActivity({ ...input(chengdu), id: 9999 })).toEqual({ ok: false, error: 'unknown-activity' });
    expect(await journal.editActivity({ ...input(chengdu, { price: -3 }), id })).toEqual({ ok: false, error: 'invalid-price' });
  });

  it('counts the Days and Plan Days that list it, and deletes it only when none does', async () => {
    const { chengdu } = await world();
    const trip = await addTrip({ slug: 'sichuan' });
    const day = await addDay(trip, chengdu, '2025-03-01', { position: 1 });
    const plan = await addPlan();
    const planDay = await addPlanDay(plan, chengdu, 1);
    const used = await addActivity('Pandas', chengdu);
    const free = await addActivity('Archive', chengdu);
    await listActivity('day_activities', day, 1, used);
    await listActivity('plan_day_activities', planDay, 1, used);

    expect((await journal.listAdminActivities()).map((activity) => [activity.name, activity.days])).toEqual([
      ['Archive', 0],
      ['Pandas', 2],
    ]);
    expect(await journal.deleteActivity(used)).toEqual({ ok: false, error: 'in-use' });
    expect(await journal.deleteActivity(free)).toEqual({ ok: true });
    expect(await journal.deleteActivity(free)).toEqual({ ok: false, error: 'unknown-activity' });
    expect(await journal.listAdminActivities()).toHaveLength(1);
  });
});
