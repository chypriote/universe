import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { createJournal } from './index';
import {
  addActivity,
  addCity,
  setDayCities,
  setProvinceCover,
  setTripCover,
  setHighlight,
  addDay,
  addPhoto,
  addPlan,
  addPlanDay,
  addProvince,
  addTrip,
  listActivity,
  resetDatabase,
} from './seed.test-helper';

const journal = createJournal(env);

beforeEach(resetDatabase);

describe('Trip page', () => {
  it('numbers only the visible Days, so a Hidden Day leaves no gap', async () => {
    const sichuan = await addProvince('Sichuan');
    const chengdu = await addCity('Chengdu', sichuan);
    const trip = await addTrip({ slug: 'sichuan' });
    await addDay(trip, chengdu, '2025-03-01', { position: 1, title: 'Arrival' });
    await addDay(trip, chengdu, '2025-03-02', { position: 2, title: 'Rain day', visible: false });
    await addDay(trip, chengdu, '2025-03-03', { position: 3, title: 'Pandas' });
    await addDay(trip, chengdu, '2025-03-04', { position: 4, title: 'Departure' });

    const page = await journal.getTrip('sichuan');

    expect(page?.days.map((day) => [day.number, day.title])).toEqual([
      [1, 'Arrival'],
      [2, 'Pandas'],
      [3, 'Departure'],
    ]);
  });
});

describe('Hidden Trip', () => {
  it('is absent from every read', async () => {
    const sichuan = await addProvince('Sichuan');
    const chengdu = await addCity('Chengdu', sichuan, { major: true });
    const trip = await addTrip({ slug: 'secret', visible: false });
    await addDay(trip, chengdu, '2025-03-01', { position: 1 });
    const photo = await addPhoto(trip, '2025-03-01', { cityId: chengdu });
    await setProvinceCover(sichuan, photo);

    expect(await journal.getTrip('secret')).toBeNull();
    expect(await journal.listTripCards()).toEqual([]);
    expect(await journal.getGallery()).toEqual({ photos: [], provinces: [], cities: [] });
    expect(await journal.getHomeMap()).toEqual([]);
  });
});

describe('Visited Province', () => {
  it('ignores On the way photos and Hidden Days', async () => {
    const sichuan = await addProvince('Sichuan');
    const gansu = await addProvince('Gansu');
    const qinghai = await addProvince('Qinghai');
    const chengdu = await addCity('Chengdu', sichuan);
    const lanzhou = await addCity('Lanzhou', gansu);
    const trip = await addTrip();
    await addDay(trip, chengdu, '2025-03-01', { position: 1 });
    await addDay(trip, lanzhou, '2025-03-02', { position: 2, visible: false });
    await addPhoto(trip, '2025-03-01', { cityId: chengdu });
    await addPhoto(trip, '2025-03-01', { name: 'train.jpg', provinceId: qinghai });

    const gallery = await journal.getGallery();
    const home = await journal.getHomeMap();

    expect(gallery.provinces).toEqual(['Sichuan']);
    expect(home.map((province) => province.name)).toEqual(['Sichuan']);
  });

  it('is not made by a plan', async () => {
    const sichuan = await addProvince('Sichuan');
    const chengdu = await addCity('Chengdu', sichuan);
    const plan = await addPlan();
    await addPlanDay(plan, chengdu, 1);

    expect((await journal.getGallery()).provinces).toEqual([]);
    expect(await journal.getHomeMap()).toEqual([]);
  });
});

describe('Major Cities', () => {
  async function twoCityTrip() {
    const sichuan = await addProvince('Sichuan');
    const chengdu = await addCity('Chengdu', sichuan, { major: true, nameZh: '成都' });
    const huanglong = await addCity('Huanglong', sichuan);
    const trip = await addTrip({ slug: 'sichuan' });
    await addDay(trip, chengdu, '2025-03-01', { position: 1 });
    await addDay(trip, huanglong, '2025-03-02', { position: 2 });
    await addPhoto(trip, '2025-03-01', { cityId: chengdu });
    await addPhoto(trip, '2025-03-02', { cityId: huanglong });
  }

  it('are the only pins on the Gallery map', async () => {
    await twoCityTrip();

    const { cities } = await journal.getGallery();

    expect(cities.map((city) => [city.name, city.nameZh, city.href])).toEqual([
      ['Chengdu', '成都', '/trips/sichuan#day-1'],
    ]);
  });

  it('are the only Cities named by a Trip Card', async () => {
    await twoCityTrip();

    const [card] = await journal.listTripCards();

    expect(card.description).toBe('A journey across Chengdu.');
  });

  it('are replaced in the Trip Card and on the Trip page by the Trip description when it is set', async () => {
    await twoCityTrip();
    await env.DB.prepare("UPDATE trips SET description = 'Pandas and mist.' WHERE slug = 'sichuan'").run();

    const [card] = await journal.listTripCards();
    const page = await journal.getTrip('sichuan');

    expect(card.description).toBe('Pandas and mist.');
    expect(page?.description).toBe('Pandas and mist.');
  });

  it('leave the trip map with a pin for every City, and the Trip page with every City listed', async () => {
    await twoCityTrip();

    const page = await journal.getTrip('sichuan');

    expect(page?.route.cities.map((city) => [city.name, city.major])).toEqual([
      ['Chengdu', true],
      ['Huanglong', false],
    ]);
    expect(page?.cities.map((city) => city.name)).toEqual(['Chengdu', 'Huanglong']);
  });
});

describe('Photo caption', () => {
  it('is its title, else its City, else "On the way, <Province>"', async () => {
    const sichuan = await addProvince('Sichuan');
    const qinghai = await addProvince('Qinghai');
    const chengdu = await addCity('Chengdu', sichuan);
    const trip = await addTrip({ slug: 'sichuan' });
    await addDay(trip, chengdu, '2025-03-01', { position: 1 });
    await addPhoto(trip, '2025-03-01', { name: 'a.jpg', title: 'Panda breakfast', cityId: chengdu });
    await addPhoto(trip, '2025-03-01', { name: 'b.jpg', cityId: chengdu });
    await addPhoto(trip, '2025-03-01', { name: 'c.jpg', provinceId: qinghai });
    await addPhoto(trip, '2025-03-01', { name: 'd.jpg', title: 'From the train', provinceId: qinghai });

    const page = await journal.getTrip('sichuan');

    expect(page?.days[0].photos.map((photo) => photo.caption)).toEqual([
      'Panda breakfast',
      'Chengdu',
      'On the way, Qinghai',
      'From the train',
    ]);
  });
});

describe('Photos and Days', () => {
  it('puts an On the way photo under the Day of its date and in the Gallery', async () => {
    const sichuan = await addProvince('Sichuan');
    const qinghai = await addProvince('Qinghai');
    const chengdu = await addCity('Chengdu', sichuan);
    const trip = await addTrip({ slug: 'sichuan' });
    await addDay(trip, chengdu, '2025-03-01', { position: 1 });
    await addPhoto(trip, '2025-03-01', { name: 'train.jpg', provinceId: qinghai });

    const page = await journal.getTrip('sichuan');
    const gallery = await journal.getGallery();

    expect(page?.days[0].photos.map((photo) => photo.caption)).toEqual(['On the way, Qinghai']);
    expect(gallery.photos.map((photo) => [photo.caption, photo.city, photo.province, photo.day])).toEqual([
      ['On the way, Qinghai', null, null, 1],
    ]);
  });

  it('shows in the Gallery under its Trip only when no Day has its date', async () => {
    const sichuan = await addProvince('Sichuan');
    const chengdu = await addCity('Chengdu', sichuan);
    const trip = await addTrip({ slug: 'sichuan' });
    await addDay(trip, chengdu, '2025-03-01', { position: 1 });
    await addPhoto(trip, '2025-02-28', { cityId: chengdu });

    const page = await journal.getTrip('sichuan');
    const { photos } = await journal.getGallery();

    expect(page?.days[0].photos).toEqual([]);
    expect(photos.map((photo) => [photo.day, photo.href])).toEqual([[null, '/trips/sichuan']]);
  });

  it('leaves the Gallery with its Hidden Day, and keeps its date when Days are renumbered', async () => {
    const sichuan = await addProvince('Sichuan');
    const chengdu = await addCity('Chengdu', sichuan);
    const trip = await addTrip({ slug: 'sichuan' });
    await addDay(trip, chengdu, '2025-03-01', { position: 1, visible: false });
    await addDay(trip, chengdu, '2025-03-02', { position: 2 });
    await addPhoto(trip, '2025-03-01', { name: 'hidden.jpg', cityId: chengdu });
    await addPhoto(trip, '2025-03-02', { name: 'shown.jpg', cityId: chengdu });

    const { photos } = await journal.getGallery();
    const page = await journal.getTrip('sichuan');

    expect(photos.map((photo) => [photo.url.split('/').pop(), photo.day])).toEqual([['shown.jpg', 1]]);
    expect(page?.days.map((day) => [day.number, day.date, day.photos.length])).toEqual([[1, '2025-03-02', 1]]);
  });
});

describe('Province Cover', () => {
  async function sichuanWithTwoPhotos() {
    const sichuan = await addProvince('Sichuan', '四川');
    const chengdu = await addCity('Chengdu', sichuan);
    const trip = await addTrip({ slug: 'sichuan' });
    await addDay(trip, chengdu, '2025-03-01', { position: 1 });
    const first = await addPhoto(trip, '2025-03-01', { name: 'first.jpg', cityId: chengdu });
    const second = await addPhoto(trip, '2025-03-01', { name: 'second.jpg', cityId: chengdu });
    return { sichuan, first, second };
  }

  it('falls back to the first Photo of the Province', async () => {
    await sichuanWithTwoPhotos();

    expect(await journal.getHomeMap()).toEqual([
      {
        name: 'Sichuan',
        nameZh: '四川',
        photo: 'https://photos.test/thumbs/sichuan/first.jpg.webp',
        tripCount: 1,
        href: '/trips/sichuan',
      },
    ]);
  });

  it('is the Photo picked for the Province', async () => {
    const { sichuan, second } = await sichuanWithTwoPhotos();
    await setProvinceCover(sichuan, second);

    const [province] = await journal.getHomeMap();

    expect(province.photo).toBe('https://photos.test/thumbs/sichuan/second.jpg.webp');
  });
});

describe('Trip Card', () => {
  it('shows the Trip Cover and up to 4 Highlight Photos in order', async () => {
    const sichuan = await addProvince('Sichuan');
    const chengdu = await addCity('Chengdu', sichuan);
    const trip = await addTrip({ slug: 'sichuan' });
    await addDay(trip, chengdu, '2025-03-01', { position: 1 });
    const cover = await addPhoto(trip, '2025-03-01', { name: 'cover.jpg' });
    const tall = await addPhoto(trip, '2025-03-01', { name: 'tall.jpg', width: 3000, height: 4000 });
    const taller = await addPhoto(trip, '2025-03-01', { name: 'taller.jpg', width: 3000, height: 4000 });
    await setTripCover(trip, cover);
    await setHighlight(trip, 2, taller);
    await setHighlight(trip, 1, tall);

    const [card] = await journal.listTripCards();

    expect(card.cover).toBe('https://photos.test/thumbs/sichuan/cover.jpg.webp');
    expect(card.highlights).toEqual([
      'https://photos.test/thumbs/sichuan/tall.jpg.webp',
      'https://photos.test/thumbs/sichuan/taller.jpg.webp',
    ]);
  });

  it('lists Trips newest first, all of them reports whatever their dates', async () => {
    await addTrip({ slug: 'old', start: '2024-05-01', end: '2024-05-10' });
    await addTrip({ slug: 'next', start: '2999-01-01', end: '2999-01-10' });
    await addTrip({ slug: 'recent', start: '2025-05-01', end: '2025-05-10' });
    await addTrip({ slug: 'undated', start: null, end: null });

    const cards = await journal.listTripCards();

    expect(cards.map((card) => [card.slug, card.type])).toEqual([
      ['next', 'report'],
      ['recent', 'report'],
      ['old', 'report'],
      ['undated', 'report'],
    ]);
  });
});

describe('A Day in several Cities', () => {
  async function westTrip() {
    const shaanxi = await addProvince('Shaanxi');
    const qinghai = await addProvince('Qinghai');
    const xian = await addCity('Xian', shaanxi, { major: true, nameZh: '西安', lng: 109, lat: 34 });
    const xining = await addCity('Xining', qinghai, { major: true, nameZh: '西宁', lng: 102, lat: 37 });
    const trip = await addTrip({ slug: 'west' });
    await addDay(trip, xian, '2025-03-01', { position: 1 });
    const travel = await addDay(trip, xining, '2025-03-02', { position: 2 });
    await addDay(trip, xining, '2025-03-03', { position: 3 });
    await setDayCities(travel, [xian, xining], xining);
    await env.DB.prepare(
      "INSERT INTO day_train_rides (day_id, position, outgoing_city, destination_city, time_of_day, departure_time, arrival_time, duration_minutes) VALUES (?, 1, 'Xian', 'Xining', 'afternoon', '14:05', '19:50', 345)",
    )
      .bind(travel)
      .run();
  }

  it('lists its Cities in travel order and flags the main one', async () => {
    await westTrip();

    const page = await journal.getTrip('west');

    expect(page!.days.map((day) => day.cities.map((city) => city.name))).toEqual([['Xian'], ['Xian', 'Xining'], ['Xining']]);
    expect(page!.days[1].cities[1]).toEqual({ name: 'Xining', nameZh: '西宁', main: true });
    expect(page!.days[1].cities[0].main).toBe(false);
  });

  it('counts for every one of its Cities in the route', async () => {
    await westTrip();

    const { route } = (await journal.getTrip('west'))!;

    expect(route.stops.map((stop) => [stop.name, stop.dayLabel])).toEqual([
      ['Xian', '1–2'],
      ['Xining', '2–3'],
    ]);
  });

  it('lists the first and last stop and the Major Cities, joining a City that a Minor City split', async () => {
    const yunnan = await addProvince('Yunnan');
    const kunming = await addCity('Kunming', yunnan, { major: true });
    const stop = await addCity('Stop', yunnan, { major: false });
    const dali = await addCity('Dali', yunnan, { major: true });
    const trip = await addTrip({ slug: 'south' });
    await addDay(trip, kunming, '2025-03-01', { position: 1 });
    await addDay(trip, stop, '2025-03-02', { position: 2 });
    await addDay(trip, kunming, '2025-03-03', { position: 3 });
    await addDay(trip, dali, '2025-03-04', { position: 4 });

    const { route } = (await journal.getTrip('south'))!;

    expect(route.listed.map((stop) => [stop.name, stop.dayLabel])).toEqual([
      ['Kunming', '1, 3'],
      ['Dali', '4'],
    ]);
  });

  it('lists the Activities of a Day in order, with their Chinese name and pinyin', async () => {
    const sichuan = await addProvince('Sichuan');
    const chengdu = await addCity('Chengdu', sichuan);
    const leshan = await addCity('Leshan', sichuan);
    const trip = await addTrip({ slug: 'sichuan' });
    const day = await addDay(trip, chengdu, '2025-03-01', { position: 1 });
    await addDay(trip, chengdu, '2025-03-02', { position: 2 });
    const buddha = await addActivity('Leshan Grand Buddha', leshan, { nameZh: '乐山大佛', pinyin: 'Lèshān Dàfó' });
    const pandas = await addActivity('Pandas', chengdu, { nameZh: '熊猫基地', pinyin: 'Xióngmāo Jīdì' });
    await listActivity('day_activities', day, 1, pandas);
    await listActivity('day_activities', day, 2, buddha);

    const days = (await journal.getTrip('sichuan'))!.days;

    expect(days[0].activities.map(({ name, nameZh, pinyin }) => ({ name, nameZh, pinyin }))).toEqual([
      { name: 'Pandas', nameZh: '熊猫基地', pinyin: 'Xióngmāo Jīdì' },
      { name: 'Leshan Grand Buddha', nameZh: '乐山大佛', pinyin: 'Lèshān Dàfó' },
    ]);
    expect(days[1].activities).toEqual([]);
  });

  it('lists the Activities of a Plan Day, shared with a Trip Day', async () => {
    const sichuan = await addProvince('Sichuan');
    const chengdu = await addCity('Chengdu', sichuan);
    const trip = await addTrip({ slug: 'sichuan' });
    const tripDay = await addDay(trip, chengdu, '2025-03-01', { position: 1 });
    const plan = await addPlan({ slug: 'sichuan-plan' });
    const planDay = await addPlanDay(plan, chengdu, 1);
    const pandas = await addActivity('Pandas', chengdu, { nameZh: '熊猫基地', pinyin: 'Xióngmāo Jīdì' });
    await listActivity('day_activities', tripDay, 1, pandas);
    await listActivity('plan_day_activities', planDay, 1, pandas);

    const fromPlan = (await journal.getPlan('sichuan-plan'))!.days[0].activities;
    const fromTrip = (await journal.getTrip('sichuan'))!.days[0].activities;

    expect(fromPlan.map((activity) => activity.name)).toEqual(['Pandas']);
    expect(fromTrip).toEqual(fromPlan);
  });

  it('keeps its train rides out of the activities', async () => {
    await westTrip();

    const day = (await journal.getTrip('west'))!.days[1];

    expect(day.activities).toEqual([]);
    expect(day.rides).toEqual(['Xian → Xining (14:05 – 19:50)']);
  });
});
