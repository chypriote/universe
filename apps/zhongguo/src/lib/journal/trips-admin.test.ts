import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { createJournal } from './index';
import { landscape } from './jpeg.test-helper';
import {
  addCity,
  addDay,
  addPhoto,
  addProvince,
  addTrip,
  resetDatabase,
  setTripCover,
} from './seed.test-helper';

const journal = createJournal(env);
const names = (photos: { url: string }[]) => photos.map((photo) => photo.url.split('/').pop());

beforeEach(resetDatabase);

/** A Trip with two Days (1 and 2 March) in Chengdu. */
async function sichuanTrip() {
  const sichuan = await addProvince('Sichuan', '四川');
  const gansu = await addProvince('Gansu', '甘肃');
  const chengdu = await addCity('Chengdu', sichuan, { major: true });
  const lanzhou = await addCity('Lanzhou', gansu, { major: true });
  const trip = await addTrip({ slug: 'sichuan' });
  const day1 = await addDay(trip, chengdu, '2025-03-01', { position: 1, title: 'Arrival' });
  const day2 = await addDay(trip, chengdu, '2025-03-02', { position: 2, title: 'Pandas' });
  return { trip, chengdu, lanzhou, day1, day2 };
}

describe('Day Photos', () => {
  it('keep the order they are set in', async () => {
    const { trip, day1 } = await sichuanTrip();
    const a = await addPhoto(trip, '2025-03-01', { name: 'a.jpg' });
    const b = await addPhoto(trip, '2025-03-01', { name: 'b.jpg' });
    const c = await addPhoto(trip, '2025-03-01', { name: 'c.jpg' });

    const result = await journal.setDayPhotos(day1, [c, a, b]);

    expect(result).toEqual({ ok: true });
    const page = await journal.getTrip('sichuan');
    expect(names(page!.days[0].photos)).toEqual(['c.jpg', 'a.jpg', 'b.jpg']);
  });

  it('move a Photo to another Day, which takes it off the first', async () => {
    const { trip, day2 } = await sichuanTrip();
    const a = await addPhoto(trip, '2025-03-01', { name: 'a.jpg' });
    await addPhoto(trip, '2025-03-01', { name: 'b.jpg' });
    const c = await addPhoto(trip, '2025-03-02', { name: 'c.jpg' });

    await journal.setDayPhotos(day2, [c, a]);

    const page = await journal.getTrip('sichuan');
    expect(names(page!.days[0].photos)).toEqual(['b.jpg']);
    expect(names(page!.days[1].photos)).toEqual(['c.jpg', 'a.jpg']);
  });

  it('can leave a Photo on no Day, and it stays in the Gallery under its Trip', async () => {
    const { trip, chengdu, day1 } = await sichuanTrip();
    await addPhoto(trip, '2025-03-01', { name: 'a.jpg', cityId: chengdu });
    const b = await addPhoto(trip, '2025-03-01', { name: 'b.jpg', cityId: chengdu });

    await journal.setDayPhotos(day1, [b]);

    const page = await journal.getTrip('sichuan');
    expect(names(page!.days[0].photos)).toEqual(['b.jpg']);
    const gallery = await journal.getGallery();
    expect(gallery.photos.map((photo) => [names([photo])[0], photo.day, photo.href])).toEqual([
      ['a.jpg', null, '/trips/sichuan'],
      ['b.jpg', 1, '/trips/sichuan#day-1'],
    ]);
  });

  it('refuse a Photo of another Trip, a duplicate and an unknown Day', async () => {
    const { trip, day1 } = await sichuanTrip();
    const other = await addTrip({ slug: 'other' });
    const a = await addPhoto(trip, '2025-03-01', { name: 'a.jpg' });
    const foreign = await addPhoto(other, '2025-03-01', { name: 'f.jpg' });

    expect(await journal.setDayPhotos(day1, [a, foreign])).toEqual({ ok: false, error: 'unknown-photo' });
    expect(await journal.setDayPhotos(day1, [a, a])).toEqual({ ok: false, error: 'duplicate-photo' });
    expect(await journal.setDayPhotos(9999, [a])).toEqual({ ok: false, error: 'unknown-day' });
    const page = await journal.getTrip('sichuan');
    expect(names(page!.days[0].photos)).toEqual(['a.jpg']);
  });

  it('get a new upload, appended to the Day of its date', async () => {
    const { trip } = await sichuanTrip();
    await addPhoto(trip, '2025-03-02', { name: 'old.jpg' });

    await journal.uploadPhoto({
      trip: 'sichuan',
      name: 'new.jpg',
      file: landscape(),
      thumb: new Uint8Array([1]).buffer,
      date: '2025-03-02',
    });

    const page = await journal.getTrip('sichuan');
    expect(names(page!.days[1].photos)).toEqual(['old.jpg', 'new.jpg']);
  });

  it('follow an edited date to the Day of the new date, or to no Day', async () => {
    const { trip } = await sichuanTrip();
    const a = await addPhoto(trip, '2025-03-01', { name: 'a.jpg' });
    await addPhoto(trip, '2025-03-02', { name: 'x.jpg' });

    await journal.editPhotos({ ids: [a], date: '2025-03-02' });
    let page = await journal.getTrip('sichuan');
    expect(names(page!.days[0].photos)).toEqual([]);
    expect(names(page!.days[1].photos)).toEqual(['x.jpg', 'a.jpg']);

    await journal.editPhotos({ ids: [a], date: '2025-05-05' });
    page = await journal.getTrip('sichuan');
    expect(names(page!.days[1].photos)).toEqual(['x.jpg']);
    expect((await journal.getGallery()).photos.map((photo) => photo.day)).toEqual([2, null]);
  });

  it('lose a deleted Photo', async () => {
    const { trip } = await sichuanTrip();
    const a = await addPhoto(trip, '2025-03-01', { name: 'a.jpg' });
    await addPhoto(trip, '2025-03-01', { name: 'b.jpg' });

    await journal.deletePhotos({ ids: [a] });

    const page = await journal.getTrip('sichuan');
    expect(names(page!.days[0].photos)).toEqual(['b.jpg']);
  });
});

describe('Trip on or off', () => {
  it('lists every Trip, hidden and plans included, with its state', async () => {
    await sichuanTrip();
    await addTrip({ slug: 'idea', start: null, end: null, visible: false });

    expect(await journal.listAdminTrips()).toEqual([
      { slug: 'sichuan', title: 'sichuan', visible: true, hasDays: true, photos: 0 },
      { slug: 'idea', title: 'idea', visible: false, hasDays: false, photos: 0 },
    ]);
  });

  it('counts every Photo of each Trip, on a hidden Day or a hidden Trip too', async () => {
    const { trip, day2 } = await sichuanTrip();
    await addPhoto(trip, '2025-03-01');
    await addPhoto(trip, '2025-03-02');
    await addPhoto(trip, '2025-03-02');
    await journal.setDayVisible(day2, false);
    const hidden = await addTrip({ slug: 'hidden', start: null, end: null, visible: false });
    await addPhoto(hidden, '2025-04-01');
    await addTrip({ slug: 'empty', start: null, end: null });

    const photos = Object.fromEntries((await journal.listAdminTrips()).map((item) => [item.slug, item.photos]));

    expect(photos).toEqual({ sichuan: 3, hidden: 1, empty: 0 });
  });

  it('changes every public read when switched off and on', async () => {
    const { trip, chengdu } = await sichuanTrip();
    const photo = await addPhoto(trip, '2025-03-01', { cityId: chengdu });
    await setTripCover(trip, photo);

    expect(await journal.setTripVisible('sichuan', false)).toEqual({ ok: true });
    expect(await journal.getTrip('sichuan')).toBeNull();
    expect(await journal.listTripCards()).toEqual([]);
    expect(await journal.getGallery()).toEqual({ photos: [], provinces: [], cities: [] });
    expect(await journal.getHomeMap()).toEqual([]);
    expect((await journal.getAdminTrip('sichuan'))?.visible).toBe(false);

    await journal.setTripVisible('sichuan', true);
    expect(await journal.getTrip('sichuan')).not.toBeNull();
    expect(await journal.listTripCards()).toHaveLength(1);
    expect((await journal.getGallery()).photos).toHaveLength(1);
    expect(await journal.getHomeMap()).toHaveLength(1);
  });

  it('refuses an unknown Trip', async () => {
    expect(await journal.setTripVisible('nope', false)).toEqual({ ok: false, error: 'unknown-trip' });
  });
});

describe('Day on or off', () => {
  async function threeDays() {
    const { trip, chengdu } = await sichuanTrip();
    const day3 = await addDay(trip, chengdu, '2025-03-03', { position: 3, title: 'Departure' });
    const photo = await addPhoto(trip, '2025-03-02', { name: 'rain.jpg', cityId: chengdu });
    return { trip, chengdu, day3, photo };
  }
  const numbers = async () => (await journal.getTrip('sichuan'))!.days.map((day) => [day.number, day.date]);

  it('renumbers the other Days when hidden, keeps its date and Photos, and numbers back when shown', async () => {
    const { photo } = await threeDays();
    const detail = (await journal.getAdminTrip('sichuan'))!;
    const pandas = detail.days[1].id;

    expect(await journal.setDayVisible(pandas, false)).toEqual({ ok: true });

    expect(await numbers()).toEqual([
      [1, '2025-03-01'],
      [2, '2025-03-03'],
    ]);
    const hidden = (await journal.getAdminTrip('sichuan'))!.days[1];
    expect(hidden).toMatchObject({ date: '2025-03-02', visible: false, number: null, photoIds: [photo] });
    expect((await journal.getGallery()).photos).toEqual([]);

    await journal.setDayVisible(pandas, true);

    expect(await numbers()).toEqual([
      [1, '2025-03-01'],
      [2, '2025-03-02'],
      [3, '2025-03-03'],
    ]);
    expect((await journal.getGallery()).photos).toHaveLength(1);
  });

  it('refuses an unknown Day', async () => {
    expect(await journal.setDayVisible(9999, false)).toEqual({ ok: false, error: 'unknown-day' });
  });
});

describe('Trip Cover', () => {
  it('is set from a landscape Photo of the Trip', async () => {
    const { trip } = await sichuanTrip();
    const photo = await addPhoto(trip, '2025-03-01', { name: 'wide.jpg' });

    expect(await journal.setTripCover('sichuan', photo)).toEqual({ ok: true });

    expect((await journal.getAdminTrip('sichuan'))?.coverId).toBe(photo);
    expect((await journal.listTripCards())[0].cover).toBe('https://photos.test/thumbs/sichuan/wide.jpg.webp');
  });

  it('refuses a portrait or square Photo, a Photo of another Trip and an unknown Trip', async () => {
    const { trip } = await sichuanTrip();
    const other = await addTrip({ slug: 'other' });
    const tall = await addPhoto(trip, '2025-03-01', { width: 3000, height: 4000 });
    const square = await addPhoto(trip, '2025-03-01', { width: 3000, height: 3000 });
    const foreign = await addPhoto(other, '2025-03-01');

    expect(await journal.setTripCover('sichuan', tall)).toEqual({ ok: false, error: 'not-landscape' });
    expect(await journal.setTripCover('sichuan', square)).toEqual({ ok: false, error: 'not-landscape' });
    expect(await journal.setTripCover('sichuan', foreign)).toEqual({ ok: false, error: 'unknown-photo' });
    expect(await journal.setTripCover('nope', tall)).toEqual({ ok: false, error: 'unknown-trip' });
    expect((await journal.getAdminTrip('sichuan'))?.coverId).toBeNull();
  });
});

describe('Highlight Photos', () => {
  async function portraits(count: number) {
    const { trip } = await sichuanTrip();
    const ids: number[] = [];
    for (let i = 1; i <= count; i++) {
      ids.push(await addPhoto(trip, '2025-03-01', { name: `p${i}.jpg`, width: 3000, height: 4000 }));
    }
    return { trip, ids };
  }

  it('are 4 portrait Photos kept in the order given', async () => {
    const { ids } = await portraits(5);
    const order = [ids[3], ids[0], ids[4], ids[1]];

    expect(await journal.setHighlightPhotos('sichuan', order)).toEqual({ ok: true });
    expect((await journal.getAdminTrip('sichuan'))?.highlightIds).toEqual(order);
    expect((await journal.listTripCards())[0].highlights.map((url) => url.split('/').pop())).toEqual([
      'p4.jpg.webp',
      'p1.jpg.webp',
      'p5.jpg.webp',
      'p2.jpg.webp',
    ]);

    await journal.setHighlightPhotos('sichuan', [ids[1], ids[2], ids[3], ids[4]]);
    expect((await journal.getAdminTrip('sichuan'))?.highlightIds).toEqual([ids[1], ids[2], ids[3], ids[4]]);
  });

  it('refuse a count other than 4, a duplicate, a landscape or square Photo, and keep the old ones', async () => {
    const { trip, ids } = await portraits(4);
    const wide = await addPhoto(trip, '2025-03-01', { name: 'wide.jpg' });
    const square = await addPhoto(trip, '2025-03-01', { name: 'sq.jpg', width: 3000, height: 3000 });
    await journal.setHighlightPhotos('sichuan', ids);

    expect(await journal.setHighlightPhotos('sichuan', ids.slice(0, 3))).toEqual({ ok: false, error: 'wrong-count' });
    expect(await journal.setHighlightPhotos('sichuan', [...ids, wide])).toEqual({ ok: false, error: 'wrong-count' });
    expect(await journal.setHighlightPhotos('sichuan', [ids[0], ids[0], ids[1], ids[2]])).toEqual({ ok: false, error: 'duplicate-photo' });
    expect(await journal.setHighlightPhotos('sichuan', [ids[0], ids[1], ids[2], wide])).toEqual({ ok: false, error: 'not-portrait' });
    expect(await journal.setHighlightPhotos('sichuan', [ids[0], ids[1], ids[2], square])).toEqual({ ok: false, error: 'not-portrait' });
    expect(await journal.setHighlightPhotos('sichuan', [ids[0], ids[1], ids[2], 9999])).toEqual({ ok: false, error: 'unknown-photo' });
    expect(await journal.setHighlightPhotos('nope', ids)).toEqual({ ok: false, error: 'unknown-trip' });
    expect((await journal.getAdminTrip('sichuan'))?.highlightIds).toEqual(ids);
  });
});

describe('Edit Day', () => {
  it('changes the title and notes', async () => {
    const { day1 } = await sichuanTrip();

    expect(await journal.editDay({ dayId: day1, title: '  Landing ', notes: 'Hotpot.' })).toEqual({ ok: true });

    const page = await journal.getTrip('sichuan');
    expect(page!.days[0]).toMatchObject({ title: 'Landing', notes: 'Hotpot.' });
  });

  it('changes the main City, and so the Visited Province', async () => {
    const { day1, day2, lanzhou } = await sichuanTrip();
    expect((await journal.getHomeMap()).map((province) => province.name)).toEqual(['Sichuan']);

    await journal.editDay({ dayId: day1, cityId: lanzhou });
    await journal.editDay({ dayId: day2, cityId: lanzhou });

    expect((await journal.getHomeMap()).map((province) => province.name)).toEqual(['Gansu']);
    expect((await journal.getAdminTrip('sichuan'))?.days[0]).toMatchObject({ city: { name: 'Lanzhou' }, province: 'Gansu' });
  });

  it('sets the Cities the Day passes through before its main City, in order', async () => {
    const { day1, lanzhou } = await sichuanTrip();

    expect(await journal.editDay({ dayId: day1, alsoCityIds: [lanzhou] })).toEqual({ ok: true });
    expect((await journal.getAdminTrip('sichuan'))?.days[0].alsoIn.map((city) => city.name)).toEqual(['Lanzhou']);
    expect((await journal.getTrip('sichuan'))?.days[0].cities.map((city) => city.name)).toEqual(['Lanzhou', 'Chengdu']);

    await journal.editDay({ dayId: day1, alsoCityIds: [] });
    expect((await journal.getAdminTrip('sichuan'))?.days[0].alsoIn).toEqual([]);
    expect(await journal.editDay({ dayId: day1, alsoCityIds: [9999] })).toEqual({ ok: false, error: 'unknown-city' });
  });

  it('refuses an unknown Day or City and a blank title, changing nothing', async () => {
    const { day1 } = await sichuanTrip();

    expect(await journal.editDay({ dayId: 9999, title: 'x' })).toEqual({ ok: false, error: 'unknown-day' });
    expect(await journal.editDay({ dayId: day1, title: 'x', cityId: 9999 })).toEqual({ ok: false, error: 'unknown-city' });
    expect(await journal.editDay({ dayId: day1, title: '  ' })).toEqual({ ok: false, error: 'invalid-title' });
    expect((await journal.getAdminTrip('sichuan'))?.days[0].title).toBe('Arrival');
  });
});

describe('Admin Trip', () => {
  it('lists the Days with their Photos, and the Photos on no Day', async () => {
    const { trip, day1 } = await sichuanTrip();
    const a = await addPhoto(trip, '2025-03-01', { name: 'a.jpg' });
    const lost = await addPhoto(trip, '2025-04-04', { name: 'lost.jpg' });

    const detail = (await journal.getAdminTrip('sichuan'))!;

    expect(detail.days.map((day) => [day.id, day.number, day.photoIds])).toEqual([
      [day1, 1, [a]],
      [detail.days[1].id, 2, []],
    ]);
    expect(detail.photos.map((photo) => [photo.id, photo.day])).toEqual([
      [a, 1],
      [lost, null],
    ]);
    expect(await journal.getAdminTrip('nope')).toBeNull();
  });
});

