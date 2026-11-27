import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { createJournal } from './index';
import { landscape } from './jpeg.test-helper';
import type { ActivityInput } from './index';
import {
  addActivity,
  addCity,
  addDay,
  addPlan,
  addPlanDay,
  addProvince,
  addTrip,
  listActivity,
  resetDatabase,
} from './seed.test-helper';

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
      input(chengdu, {
        name: ' Pandas ',
        rating: 'do-not-miss',
        price: 0,
        lat: 30.73,
        lng: 104.14,
        addressZh: '成都市',
      }),
    );
    await journal.addActivity(
      input(lanzhou, { name: 'Old street', nameZh: '老街', pinyin: 'Lǎojiē', kind: 'heritage' }),
    );
    await journal.addActivity(
      input(chengdu, { name: 'Archive', nameZh: '档案', pinyin: 'Dàng’àn', kind: 'show' }),
    );

    expect(added).toMatchObject({
      ok: true,
      activity: {
        name: 'Pandas',
        city: 'Chengdu',
        province: 'Sichuan',
        rating: 'do-not-miss',
        price: 0,
        lat: 30.73,
        days: 0,
      },
    });
    expect(
      (await journal.listAdminActivities()).map((activity) => [activity.city, activity.name]),
    ).toEqual([
      ['Chengdu', 'Archive'],
      ['Chengdu', 'Pandas'],
      ['Lanzhou', 'Old street'],
    ]);
  });

  it('refuses a blank name, an unknown kind, rating, City, a bad price or position, and a name taken in the City', async () => {
    const { chengdu, lanzhou } = await world();
    await journal.addActivity(input(chengdu));

    const refused = async (changes: Partial<ActivityInput>, cityId = chengdu) =>
      ((await journal.addActivity(input(cityId, changes))) as { error: string }).error;

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

    const edited = await journal.editActivity({
      ...input(lanzhou, { rating: 'skippable', price: 40 }),
      id,
    });

    expect(edited).toMatchObject({
      ok: true,
      activity: { id, city: 'Lanzhou', rating: 'skippable', price: 40 },
    });
    expect(await journal.editActivity({ ...input(chengdu, { name: 'Archive' }), id })).toEqual({
      ok: false,
      error: 'name-taken',
    });
    expect(await journal.editActivity({ ...input(chengdu), id: 9999 })).toEqual({
      ok: false,
      error: 'unknown-activity',
    });
    expect(await journal.editActivity({ ...input(chengdu, { price: -3 }), id })).toEqual({
      ok: false,
      error: 'invalid-price',
    });
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

    expect(
      (await journal.listAdminActivities()).map((activity) => [activity.name, activity.days]),
    ).toEqual([
      ['Archive', 0],
      ['Pandas', 2],
    ]);
    expect(await journal.deleteActivity(used)).toEqual({ ok: false, error: 'in-use' });
    expect(await journal.deleteActivity(free)).toEqual({ ok: true });
    expect(await journal.deleteActivity(free)).toEqual({ ok: false, error: 'unknown-activity' });
    expect(await journal.listAdminActivities()).toHaveLength(1);
  });
});

describe('Activities admin: batch', () => {
  it('sets one kind and one rating on several Activities, and leaves the other fields', async () => {
    const { chengdu } = await world();
    const pandas = await addActivity('Pandas', chengdu);
    const temple = await addActivity('Temple', chengdu);
    const other = await addActivity('Market', chengdu);

    const result = await journal.editActivities({
      ids: [pandas, temple],
      kind: 'nature',
      rating: 'recommended',
    });

    expect(
      result.ok &&
        result.activities.map((activity) => [activity.name, activity.kind, activity.rating]),
    ).toEqual([
      ['Pandas', 'nature', 'recommended'],
      ['Temple', 'nature', 'recommended'],
    ]);
    const market = (await journal.listAdminActivities()).find((activity) => activity.id === other)!;
    expect([market.kind, market.rating]).toEqual(['heritage', null]);
  });

  it('changes only the field given, and clears the rating with null', async () => {
    const { chengdu } = await world();
    const pandas = await addActivity('Pandas', chengdu);
    await journal.editActivities({ ids: [pandas], kind: 'show', rating: 'avoid' });

    const result = await journal.editActivities({ ids: [pandas], rating: null });

    expect(result.ok && [result.activities[0].kind, result.activities[0].rating]).toEqual([
      'show',
      null,
    ]);
  });

  it('refuses an unknown Activity, kind or rating, and an empty change', async () => {
    const { chengdu } = await world();
    const pandas = await addActivity('Pandas', chengdu);

    expect(await journal.editActivities({ ids: [pandas, 9999], kind: 'show' })).toEqual({
      ok: false,
      error: 'unknown-activity',
    });
    expect(await journal.editActivities({ ids: [pandas], kind: 'food' as never })).toEqual({
      ok: false,
      error: 'invalid-kind',
    });
    expect(await journal.editActivities({ ids: [pandas], rating: 'meh' as never })).toEqual({
      ok: false,
      error: 'invalid-rating',
    });
    expect(await journal.editActivities({ ids: [pandas] })).toEqual({
      ok: false,
      error: 'nothing-to-change',
    });
  });
});

describe('Activities of a Day', () => {
  it('sets the Activities of a Day in order, from any City, and replaces the old list', async () => {
    const { chengdu, lanzhou } = await world();
    const trip = await addTrip({ slug: 'sichuan' });
    const day = await addDay(trip, chengdu, '2025-03-01', { position: 1 });
    const pandas = await addActivity('Pandas', chengdu);
    const old = await addActivity('Old street', lanzhou);
    const archive = await addActivity('Archive', chengdu);

    expect(await journal.setDayActivities(day, [pandas, old])).toEqual({ ok: true });
    expect((await journal.getAdminTrip('sichuan'))!.days[0].activityIds).toEqual([pandas, old]);

    expect(await journal.setDayActivities(day, [archive, pandas])).toEqual({ ok: true });
    expect((await journal.getAdminTrip('sichuan'))!.days[0].activityIds).toEqual([archive, pandas]);
    expect(
      (await journal.getTrip('sichuan'))!.days[0].activities.map((activity) => activity.name),
    ).toEqual(['Archive', 'Pandas']);

    expect(await journal.setDayActivities(day, [])).toEqual({ ok: true });
    expect((await journal.getAdminTrip('sichuan'))!.days[0].activityIds).toEqual([]);
  });

  it('refuses an unknown Day or Activity and an Activity listed twice, and keeps the old list', async () => {
    const { chengdu } = await world();
    const trip = await addTrip({ slug: 'sichuan' });
    const day = await addDay(trip, chengdu, '2025-03-01', { position: 1 });
    const pandas = await addActivity('Pandas', chengdu);
    await journal.setDayActivities(day, [pandas]);

    expect(await journal.setDayActivities(9999, [pandas])).toEqual({
      ok: false,
      error: 'unknown-day',
    });
    expect(await journal.setDayActivities(day, [pandas, 9999])).toEqual({
      ok: false,
      error: 'unknown-activity',
    });
    expect(await journal.setDayActivities(day, [pandas, pandas])).toEqual({
      ok: false,
      error: 'duplicate-activity',
    });
    expect((await journal.getAdminTrip('sichuan'))!.days[0].activityIds).toEqual([pandas]);
  });

  it('sets the Activities of a Plan Day, shared with a Trip Day', async () => {
    const { chengdu } = await world();
    const trip = await addTrip({ slug: 'sichuan' });
    const day = await addDay(trip, chengdu, '2025-03-01', { position: 1 });
    const planDay = await addPlanDay(await addPlan({ slug: 'sichuan-plan' }), chengdu, 1);
    const pandas = await addActivity('Pandas', chengdu);

    expect(await journal.setPlanDayActivities(planDay, [pandas])).toEqual({ ok: true });
    expect(await journal.setDayActivities(day, [pandas])).toEqual({ ok: true });
    expect((await journal.getAdminPlan('sichuan-plan'))!.days[0].activityIds).toEqual([pandas]);
    expect(await journal.setPlanDayActivities(9999, [pandas])).toEqual({
      ok: false,
      error: 'unknown-day',
    });
    expect((await journal.listAdminActivities())[0].days).toBe(2);
  });
});

describe('Activity pictures', () => {
  const thumb = () => new Uint8Array([1, 2, 3]).buffer;
  const upload = (activityId: number, name: string, overwrite = false) =>
    journal.uploadActivityPicture({
      activityId,
      name,
      file: landscape(),
      thumb: thumb(),
      overwrite,
    });
  const keys = async () => (await env.PHOTOS.list()).objects.map((object) => object.key).sort();

  it('stores the file and its thumbnail and keeps pictures in upload order', async () => {
    const { chengdu } = await world();
    const pandas = await addActivity('Pandas', chengdu);

    await upload(pandas, 'b.jpg');
    const result = await upload(pandas, 'a.jpg');

    expect(result.ok && result.activity.pictures.map((picture) => picture.name)).toEqual([
      'b.jpg',
      'a.jpg',
    ]);
    expect(await keys()).toEqual([
      `activities/${pandas}/a.jpg`,
      `activities/${pandas}/b.jpg`,
      `thumbs/activities/${pandas}/a.jpg.webp`,
      `thumbs/activities/${pandas}/b.jpg.webp`,
    ]);
  });

  it('refuses a name twice unless it overwrites, and bad names, types and files', async () => {
    const { chengdu } = await world();
    const pandas = await addActivity('Pandas', chengdu);
    await upload(pandas, 'a.jpg');

    expect(await upload(pandas, 'a.jpg')).toEqual({ ok: false, error: 'exists' });
    const replaced = await upload(pandas, 'a.jpg', true);
    expect(replaced.ok && replaced.replaced).toBe(true);
    expect(replaced.ok && replaced.activity.pictures).toHaveLength(1);
    expect(await upload(pandas, 'a.gif')).toEqual({ ok: false, error: 'unsupported-type' });
    expect(await upload(pandas, 'x/a.jpg')).toEqual({ ok: false, error: 'invalid-name' });
    expect(await upload(9999, 'a.jpg')).toEqual({ ok: false, error: 'unknown-activity' });
    expect(
      await journal.uploadActivityPicture({
        activityId: pandas,
        name: 'bad.jpg',
        file: new Uint8Array([1]).buffer,
        thumb: thumb(),
      }),
    ).toEqual({ ok: false, error: 'unreadable' });
  });

  it('reorders the pictures and refuses a list that is not exactly its own', async () => {
    const { chengdu } = await world();
    const pandas = await addActivity('Pandas', chengdu);
    await upload(pandas, 'a.jpg');
    const second = await upload(pandas, 'b.jpg');
    const [a, b] = second.ok ? second.activity.pictures.map((picture) => picture.id) : [];

    const result = await journal.setActivityPictures(pandas, [b, a]);

    expect(result.ok && result.activity.pictures.map((picture) => picture.name)).toEqual([
      'b.jpg',
      'a.jpg',
    ]);
    expect(await journal.setActivityPictures(pandas, [a])).toEqual({
      ok: false,
      error: 'unknown-picture',
    });
    expect(await journal.setActivityPictures(pandas, [a, a])).toEqual({
      ok: false,
      error: 'duplicate-picture',
    });
    expect(await journal.setActivityPictures(9999, [])).toEqual({
      ok: false,
      error: 'unknown-activity',
    });
  });

  it('deletes a picture with its files and closes the gap', async () => {
    const { chengdu } = await world();
    const pandas = await addActivity('Pandas', chengdu);
    await upload(pandas, 'a.jpg');
    const second = await upload(pandas, 'b.jpg');
    const [a] = second.ok ? second.activity.pictures.map((picture) => picture.id) : [];

    const result = await journal.deleteActivityPicture(a);

    expect(result.ok && result.activity.pictures.map((picture) => picture.name)).toEqual(['b.jpg']);
    expect(await keys()).toEqual([
      `activities/${pandas}/b.jpg`,
      `thumbs/activities/${pandas}/b.jpg.webp`,
    ]);
    expect(await journal.deleteActivityPicture(a)).toEqual({ ok: false, error: 'unknown-picture' });
  });

  it('moves a picture to another Activity with its files, last there, and closes the gap', async () => {
    const { chengdu } = await world();
    const pandas = await addActivity('Pandas', chengdu);
    const temple = await addActivity('Temple', chengdu);
    await upload(pandas, 'a.jpg');
    const second = await upload(pandas, 'b.jpg');
    await upload(temple, 'c.jpg');
    const [a] = second.ok ? second.activity.pictures.map((picture) => picture.id) : [];

    const result = await journal.moveActivityPicture(a, temple);

    expect(result.ok && result.from.pictures.map((picture) => picture.name)).toEqual(['b.jpg']);
    expect(result.ok && result.to.pictures.map((picture) => picture.name)).toEqual([
      'c.jpg',
      'a.jpg',
    ]);
    expect(await keys()).toEqual([
      `activities/${pandas}/b.jpg`,
      `activities/${temple}/a.jpg`,
      `activities/${temple}/c.jpg`,
      `thumbs/activities/${pandas}/b.jpg.webp`,
      `thumbs/activities/${temple}/a.jpg.webp`,
      `thumbs/activities/${temple}/c.jpg.webp`,
    ]);
  });

  it('refuses to move a picture onto a name the other Activity has, or to an unknown Activity or picture', async () => {
    const { chengdu } = await world();
    const pandas = await addActivity('Pandas', chengdu);
    const temple = await addActivity('Temple', chengdu);
    const first = await upload(pandas, 'a.jpg');
    await upload(temple, 'a.jpg');
    const [a] = first.ok ? first.activity.pictures.map((picture) => picture.id) : [];

    expect(await journal.moveActivityPicture(a, temple)).toEqual({ ok: false, error: 'exists' });
    expect(await journal.moveActivityPicture(a, 9999)).toEqual({
      ok: false,
      error: 'unknown-activity',
    });
    expect(await journal.moveActivityPicture(9999, temple)).toEqual({
      ok: false,
      error: 'unknown-picture',
    });
  });

  it('removes the pictures and their files when the Activity is deleted', async () => {
    const { chengdu } = await world();
    const pandas = await addActivity('Pandas', chengdu);
    await upload(pandas, 'a.jpg');

    expect(await journal.deleteActivity(pandas)).toEqual({ ok: true });

    expect(await keys()).toEqual([]);
  });

  it('shows the first picture of an Activity on its Plan Day, with price and address', async () => {
    const { chengdu } = await world();
    const pandas = await addActivity('Pandas', chengdu);
    const planDay = await addPlanDay(await addPlan({ slug: 'sichuan-plan' }), chengdu, 1);
    await journal.editActivity({
      ...input(chengdu),
      id: pandas,
      rating: 'do-not-miss',
      price: 55,
      addressZh: '成都市',
    });
    await journal.setPlanDayActivities(planDay, [pandas]);
    expect((await journal.getPlan('sichuan-plan'))!.days[0].activities[0].picture).toBeNull();
    await upload(pandas, 'a.jpg');

    const [activity] = (await journal.getPlan('sichuan-plan'))!.days[0].activities;

    expect(activity).toMatchObject({
      kind: 'nature',
      rating: 'do-not-miss',
      price: 55,
      addressZh: '成都市',
    });
    expect(activity.picture).toContain(`thumbs/activities/${pandas}/a.jpg.webp`);
  });
});

describe('Listing Activities', () => {
  it('lists more than 100 Activities, as the admin pages do for every Day', async () => {
    const { chengdu } = await world();
    for (let index = 0; index < 150; index++) await addActivity(`Place ${index}`, chengdu);

    expect(await journal.listAdminActivities()).toHaveLength(150);
  });
});
