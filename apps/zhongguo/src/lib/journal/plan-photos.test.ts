import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { createJournal } from './index';
import { landscape, portrait } from './jpeg.test-helper';
import {
  addCity,
  addPlan,
  addPlanDay,
  addProvince,
  addTrip,
  resetDatabase,
} from './seed.test-helper';

const journal = createJournal(env);
const thumb = () => new Uint8Array([1, 2, 3]).buffer;

beforeEach(resetDatabase);

async function xinjiang() {
  const province = await addProvince('Xinjiang');
  const urumqi = await addCity('Urumqi', province);
  const planId = await addPlan({ slug: 'xinjiang', title: 'Xinjiang' });
  const dayId = await addPlanDay(planId, urumqi, 1);
  return { urumqi, planId, dayId };
}

const upload = (name: string, file: ArrayBuffer, overwrite = false) =>
  journal.uploadPlanPhoto({ plan: 'xinjiang', name, file, thumb: thumb(), overwrite });

const keys = async () => (await env.PHOTOS.list()).objects.map((object) => object.key).sort();

describe('Plan Photos: upload', () => {
  it('stores the file and its thumbnail under trips/<slug>/ and thumbs/<slug>/ and lists the Photo in the plan', async () => {
    await xinjiang();

    const result = await upload('lake.jpg', landscape());

    expect(result).toMatchObject({
      ok: true,
      replaced: false,
      photo: { name: 'lake.jpg', orientation: 'landscape', city: null },
    });
    expect(await keys()).toEqual(['thumbs/xinjiang/lake.jpg.webp', 'trips/xinjiang/lake.jpg']);
    expect((await journal.getAdminPlan('xinjiang'))!.photos.map((photo) => photo.name)).toEqual([
      'lake.jpg',
    ]);
  });

  it('refuses a name that is taken, unless it overwrites, and a new file bumps the version', async () => {
    await xinjiang();
    const first = await upload('lake.jpg', landscape());

    expect(await upload('lake.jpg', landscape())).toEqual({ ok: false, error: 'exists' });
    const again = await upload('lake.jpg', portrait(), true);

    expect(again).toMatchObject({ ok: true, replaced: true, photo: { orientation: 'portrait' } });
    expect(again.ok && first.ok && again.photo.id).toBe(first.ok && first.photo.id);
    expect(again.ok && again.photo.url).toContain('lake.jpg');
  });

  it('refuses a file that is not an image, a type it does not know, a path in the name and an unknown plan', async () => {
    await xinjiang();

    expect(await upload('lake.jpg', new Uint8Array([1, 2, 3]).buffer)).toEqual({
      ok: false,
      error: 'unreadable',
    });
    expect(await upload('lake.gif', landscape())).toEqual({ ok: false, error: 'unsupported-type' });
    expect(await upload('a/lake.jpg', landscape())).toEqual({ ok: false, error: 'invalid-name' });
    expect(
      await journal.uploadPlanPhoto({
        plan: 'nowhere',
        name: 'lake.jpg',
        file: landscape(),
        thumb: thumb(),
      }),
    ).toEqual({
      ok: false,
      error: 'unknown-plan',
    });
    expect(await keys()).toEqual([]);
  });

  it('refuses a new file that breaks the orientation of the cover', async () => {
    await xinjiang();
    const photo = await upload('lake.jpg', landscape());
    await journal.setPlanCover('xinjiang', photo.ok ? photo.photo.id : 0);

    expect(await upload('lake.jpg', portrait(), true)).toEqual({
      ok: false,
      error: 'breaks-cover',
    });
  });

  it('is not a Trip Photo: the Gallery and the Trip admin never see it', async () => {
    await xinjiang();
    await addTrip({ slug: 'sichuan' });
    await upload('lake.jpg', landscape());

    expect(await journal.listAdminPhotos('sichuan')).toEqual([]);
    expect(await journal.listAdminPhotos('xinjiang')).toBeNull();
    expect(await journal.getGallery()).toMatchObject({ photos: [], cities: [], provinces: [] });
  });
});

describe('Plan Photos: cover and Highlight Photos', () => {
  it('takes a landscape cover with a focal point, and refuses a portrait one', async () => {
    await xinjiang();
    const wide = await upload('wide.jpg', landscape());
    const tall = await upload('tall.jpg', portrait());
    const wideId = wide.ok ? wide.photo.id : 0;
    const tallId = tall.ok ? tall.photo.id : 0;

    expect(await journal.setPlanCoverFocus('xinjiang', 20, 30)).toEqual({
      ok: false,
      error: 'no-cover',
    });
    expect(await journal.setPlanCover('xinjiang', tallId)).toEqual({
      ok: false,
      error: 'not-landscape',
    });
    expect(await journal.setPlanCover('xinjiang', 9999)).toEqual({
      ok: false,
      error: 'unknown-photo',
    });
    expect(await journal.setPlanCover('xinjiang', wideId)).toEqual({ ok: true });
    expect(await journal.setPlanCoverFocus('xinjiang', 20.4, 30)).toEqual({ ok: true });
    expect(await journal.setPlanCoverFocus('xinjiang', 120, 30)).toEqual({
      ok: false,
      error: 'invalid-focus',
    });

    expect(await journal.getAdminPlan('xinjiang')).toMatchObject({
      coverId: wideId,
      coverFocus: { x: 20, y: 30 },
    });
  });

  it('takes 4 portrait Highlight Photos in order, and nothing else', async () => {
    await xinjiang();
    const ids: number[] = [];
    for (const name of ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg']) {
      const result = await upload(name, portrait());
      ids.push(result.ok ? result.photo.id : 0);
    }
    const wide = await upload('wide.jpg', landscape());

    expect(await journal.setPlanHighlightPhotos('xinjiang', ids.slice(0, 3))).toEqual({
      ok: false,
      error: 'wrong-count',
    });
    expect(
      await journal.setPlanHighlightPhotos('xinjiang', [ids[0], ids[0], ids[1], ids[2]]),
    ).toEqual({ ok: false, error: 'duplicate-photo' });
    expect(
      await journal.setPlanHighlightPhotos('xinjiang', [
        ...ids.slice(0, 3),
        wide.ok ? wide.photo.id : 0,
      ]),
    ).toEqual({ ok: false, error: 'not-portrait' });
    expect(await journal.setPlanHighlightPhotos('xinjiang', [...ids.slice(0, 3), 9999])).toEqual({
      ok: false,
      error: 'unknown-photo',
    });
    expect(
      await journal.setPlanHighlightPhotos('xinjiang', [ids[3], ids[2], ids[1], ids[0]]),
    ).toEqual({ ok: true });

    expect((await journal.getAdminPlan('xinjiang'))!.highlightIds).toEqual([
      ids[3],
      ids[2],
      ids[1],
      ids[0],
    ]);
  });

  it('refuses a Photo of another plan', async () => {
    await xinjiang();
    await addPlan({ slug: 'tibet' });
    const other = await journal.uploadPlanPhoto({
      plan: 'tibet',
      name: 'monastery.jpg',
      file: landscape(),
      thumb: thumb(),
    });

    expect(await journal.setPlanCover('xinjiang', other.ok ? other.photo.id : 0)).toEqual({
      ok: false,
      error: 'unknown-photo',
    });
  });
});

describe('Plan Photos: Days', () => {
  it('puts Photos on a Day in order, and a Photo that joins another Day leaves the first', async () => {
    const { planId, urumqi, dayId } = await xinjiang();
    const second = await addPlanDay(planId, urumqi, 2);
    const one = await upload('one.jpg', landscape());
    const two = await upload('two.jpg', landscape());
    const ids = [one.ok ? one.photo.id : 0, two.ok ? two.photo.id : 0];

    expect(await journal.setPlanDayPhotos(dayId, [ids[1], ids[0]])).toEqual({ ok: true });
    expect(await journal.setPlanDayPhotos(second, [ids[1]])).toEqual({ ok: true });

    const plan = (await journal.getAdminPlan('xinjiang'))!;
    expect(plan.days.map((day) => day.photoIds)).toEqual([[ids[0]], [ids[1]]]);
  });

  it('refuses a repeated Photo, a Photo of another plan and an unknown Day', async () => {
    const { dayId } = await xinjiang();
    await addPlan({ slug: 'tibet' });
    const other = await journal.uploadPlanPhoto({
      plan: 'tibet',
      name: 'monastery.jpg',
      file: landscape(),
      thumb: thumb(),
    });
    const own = await upload('one.jpg', landscape());
    const ownId = own.ok ? own.photo.id : 0;

    expect(await journal.setPlanDayPhotos(dayId, [ownId, ownId])).toEqual({
      ok: false,
      error: 'duplicate-photo',
    });
    expect(await journal.setPlanDayPhotos(dayId, [other.ok ? other.photo.id : 0])).toEqual({
      ok: false,
      error: 'unknown-photo',
    });
    expect(await journal.setPlanDayPhotos(9999, [])).toEqual({ ok: false, error: 'unknown-day' });
  });

  it('keeps the Photos of a deleted Day, on no Day', async () => {
    const { dayId } = await xinjiang();
    const one = await upload('one.jpg', landscape());
    await journal.setPlanDayPhotos(dayId, [one.ok ? one.photo.id : 0]);

    await journal.deletePlanDay(dayId);

    expect((await journal.getAdminPlan('xinjiang'))!.photos.map((photo) => photo.name)).toEqual([
      'one.jpg',
    ]);
  });
});

describe('Plan Photos: City, title and delete', () => {
  it('sets and clears the City of a Photo', async () => {
    const { urumqi } = await xinjiang();
    const one = await upload('one.jpg', landscape());
    const id = one.ok ? one.photo.id : 0;

    expect(await journal.setPlanPhotoCity(id, urumqi)).toEqual({ ok: true });
    expect((await journal.getAdminPlan('xinjiang'))!.photos[0].city).toEqual({
      id: urumqi,
      name: 'Urumqi',
    });
    expect(await journal.setPlanPhotoCity(id, 9999)).toEqual({ ok: false, error: 'unknown-city' });
    expect(await journal.setPlanPhotoCity(9999, null)).toEqual({
      ok: false,
      error: 'unknown-photo',
    });
    expect(await journal.setPlanPhotoCity(id, null)).toEqual({ ok: true });
    expect((await journal.getAdminPlan('xinjiang'))!.photos[0].city).toBeNull();
  });

  it('sets and clears the title of a Photo', async () => {
    await xinjiang();
    const one = await upload('one.jpg', landscape());
    const id = one.ok ? one.photo.id : 0;

    expect(await journal.setPlanPhotoTitle(id, '  Karakul at dawn  ')).toEqual({ ok: true });
    expect((await journal.getAdminPlan('xinjiang'))!.photos[0].title).toBe('Karakul at dawn');
    expect(await journal.setPlanPhotoTitle(id, '')).toEqual({ ok: true });
    expect((await journal.getAdminPlan('xinjiang'))!.photos[0].title).toBeNull();
    expect(await journal.setPlanPhotoTitle(9999, 'x')).toEqual({
      ok: false,
      error: 'unknown-photo',
    });
  });

  it('deletes a Photo with its files and its place on a Day', async () => {
    const { dayId } = await xinjiang();
    const one = await upload('one.jpg', landscape());
    const id = one.ok ? one.photo.id : 0;
    await journal.setPlanDayPhotos(dayId, [id]);

    expect(await journal.deletePlanPhoto(id)).toEqual({ ok: true });

    const plan = (await journal.getAdminPlan('xinjiang'))!;
    expect(plan.photos).toEqual([]);
    expect(plan.days[0].photoIds).toEqual([]);
    expect(await keys()).toEqual([]);
    expect(await journal.deletePlanPhoto(id)).toEqual({ ok: false, error: 'unknown-photo' });
  });

  it('keeps the cover and the Highlight Photos: pick another one first', async () => {
    await xinjiang();
    const wide = await upload('wide.jpg', landscape());
    const ids: number[] = [];
    for (const name of ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg']) {
      const result = await upload(name, portrait());
      ids.push(result.ok ? result.photo.id : 0);
    }
    const wideId = wide.ok ? wide.photo.id : 0;
    await journal.setPlanCover('xinjiang', wideId);
    await journal.setPlanHighlightPhotos('xinjiang', ids);

    expect(await journal.deletePlanPhoto(wideId)).toEqual({ ok: false, error: 'in-use' });
    expect(await journal.deletePlanPhoto(ids[0])).toEqual({ ok: false, error: 'in-use' });
    expect((await keys()).length).toBe(10);
  });

  it('is not in the Gallery or the Visited map, and keeps its City from being deleted', async () => {
    const { urumqi } = await xinjiang();
    const one = await upload('one.jpg', landscape());
    await journal.setPlanPhotoCity(one.ok ? one.photo.id : 0, urumqi);

    expect(await journal.getGallery()).toMatchObject({ photos: [], provinces: [] });
    expect(await journal.deleteCity(urumqi)).toEqual({ ok: false, error: 'in-use' });
  });
});
