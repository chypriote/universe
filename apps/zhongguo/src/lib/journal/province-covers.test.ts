import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { createJournal } from './index';
import {
  addCity,
  addDay,
  addPhoto,
  addProvince,
  addTrip,
  resetDatabase,
  setProvinceCover,
} from './seed.test-helper';

const journal = createJournal(env);
const thumb = (slug: string, name: string) => `https://photos.test/thumbs/${slug}/${name}.webp`;
const full = (slug: string, name: string) => `https://photos.test/trips/${slug}/${name}`;
const names = (photos: { name: string }[]) => photos.map((photo) => photo.name);

beforeEach(resetDatabase);

/** Sichuan visited on two Trips, Gansu on one, Qinghai never. */
async function world() {
  const sichuan = await addProvince('Sichuan', '四川');
  const gansu = await addProvince('Gansu', '甘肃');
  const qinghai = await addProvince('Qinghai', '青海');
  const chengdu = await addCity('Chengdu', sichuan);
  const lanzhou = await addCity('Lanzhou', gansu);
  const first = await addTrip({
    slug: 'first',
    title: 'First',
    start: '2024-03-01',
    end: '2024-03-31',
  });
  const second = await addTrip({
    slug: 'second',
    title: 'Second',
    start: '2025-03-01',
    end: '2025-03-31',
  });
  await addDay(first, chengdu, '2024-03-01', { position: 1 });
  await addDay(first, lanzhou, '2024-03-02', { position: 2 });
  await addDay(second, chengdu, '2025-03-01', { position: 1 });
  return { sichuan, gansu, qinghai, chengdu, lanzhou, first, second };
}

describe('Visited Provinces of the admin', () => {
  it('list each with its first Photo while no cover is picked', async () => {
    const { chengdu, lanzhou, first } = await world();
    await addPhoto(first, '2024-03-01', { name: 'a.jpg', cityId: chengdu });
    await addPhoto(first, '2024-03-02', { name: 'b.jpg', cityId: lanzhou });

    expect(await journal.listVisitedProvinces()).toEqual([
      {
        name: 'Gansu',
        nameZh: '甘肃',
        photo: thumb('first', 'b.jpg'),
        coverId: null,
        fallback: true,
      },
      {
        name: 'Sichuan',
        nameZh: '四川',
        photo: thumb('first', 'a.jpg'),
        coverId: null,
        fallback: true,
      },
    ]);
  });

  it('show the picked cover and no fallback', async () => {
    const { sichuan, chengdu, first, second } = await world();
    await addPhoto(first, '2024-03-01', { name: 'a.jpg', cityId: chengdu });
    const picked = await addPhoto(second, '2025-03-01', { name: 'z.jpg', cityId: chengdu });
    await setProvinceCover(sichuan, picked);

    const sichuanRow = (await journal.listVisitedProvinces()).find(
      (province) => province.name === 'Sichuan',
    );

    expect(sichuanRow).toEqual({
      name: 'Sichuan',
      nameZh: '四川',
      photo: thumb('second', 'z.jpg'),
      coverId: picked,
      focus: { x: 50, y: 50 },
      fallback: false,
    });
  });

  it('show no photo for a Province without Photos', async () => {
    await world();

    const rows = await journal.listVisitedProvinces();

    expect(rows.map((province) => [province.name, province.photo, province.fallback])).toEqual([
      ['Gansu', null, true],
      ['Sichuan', null, true],
    ]);
  });
});

describe('Cover candidates of a Province', () => {
  it('are the Photos of its Cities from every visible Trip, newest Trip first', async () => {
    const { chengdu, lanzhou, first, second } = await world();
    const a = await addPhoto(first, '2024-03-01', { name: 'a.jpg', cityId: chengdu });
    await addPhoto(first, '2024-03-02', { name: 'b.jpg', cityId: lanzhou });
    const c = await addPhoto(second, '2025-03-01', { name: 'c.jpg', cityId: chengdu });

    const candidates = await journal.listCoverCandidates('Sichuan');

    expect(candidates).toEqual([
      { id: c, name: 'c.jpg', thumb: thumb('second', 'c.jpg'), tripTitle: 'Second' },
      { id: a, name: 'a.jpg', thumb: thumb('first', 'a.jpg'), tripTitle: 'First' },
    ]);
  });

  it('leave out On the way photos, even one that names the Province', async () => {
    const { sichuan, chengdu, first } = await world();
    await addPhoto(first, '2024-03-01', { name: 'city.jpg', cityId: chengdu });
    await addPhoto(first, '2024-03-01', { name: 'train.jpg', provinceId: sichuan });

    expect(names((await journal.listCoverCandidates('Sichuan'))!)).toEqual(['city.jpg']);
  });

  it('leave out the Photos of a Hidden Trip and of a Hidden Day', async () => {
    const { chengdu, first } = await world();
    const hiddenTrip = await addTrip({ slug: 'hidden', visible: false });
    await addDay(hiddenTrip, chengdu, '2025-05-01', { position: 1 });
    await addPhoto(hiddenTrip, '2025-05-01', { name: 'secret.jpg', cityId: chengdu });
    await addDay(first, chengdu, '2024-03-10', { position: 3, visible: false });
    await addPhoto(first, '2024-03-10', { name: 'off.jpg', cityId: chengdu });
    await addPhoto(first, '2024-03-01', { name: 'shown.jpg', cityId: chengdu });

    expect(names((await journal.listCoverCandidates('Sichuan'))!)).toEqual(['shown.jpg']);
  });

  it('are null for a Province that does not exist or is not visited', async () => {
    await world();

    expect(await journal.listCoverCandidates('Qinghai')).toBeNull();
    expect(await journal.listCoverCandidates('Atlantis')).toBeNull();
  });
});

describe('Province Cover', () => {
  it('set shows on the home map at once and in the admin list', async () => {
    const { chengdu, first } = await world();
    await addPhoto(first, '2024-03-01', { name: 'a.jpg', cityId: chengdu });
    const picked = await addPhoto(first, '2024-03-01', { name: 'b.jpg', cityId: chengdu });

    expect(await journal.setProvinceCover('Sichuan', picked)).toEqual({ ok: true });

    const home = await journal.getHomeMap();
    expect(home.find((province) => province.name === 'Sichuan')?.photo).toBe(
      full('first', 'b.jpg'),
    );
    const row = (await journal.listVisitedProvinces()).find(
      (province) => province.name === 'Sichuan',
    );
    expect(row).toMatchObject({ coverId: picked, fallback: false });
  });

  it('set again replaces the first pick', async () => {
    const { chengdu, first } = await world();
    const a = await addPhoto(first, '2024-03-01', { name: 'a.jpg', cityId: chengdu });
    const b = await addPhoto(first, '2024-03-01', { name: 'b.jpg', cityId: chengdu });
    await journal.setProvinceCover('Sichuan', b);

    await journal.setProvinceCover('Sichuan', a);

    const home = await journal.getHomeMap();
    expect(home.find((province) => province.name === 'Sichuan')?.photo).toBe(
      full('first', 'a.jpg'),
    );
  });

  it('clear brings back the first Photo', async () => {
    const { chengdu, first } = await world();
    await addPhoto(first, '2024-03-01', { name: 'a.jpg', cityId: chengdu });
    const picked = await addPhoto(first, '2024-03-01', { name: 'b.jpg', cityId: chengdu });
    await journal.setProvinceCover('Sichuan', picked);

    expect(await journal.clearProvinceCover('Sichuan')).toEqual({ ok: true });

    const home = await journal.getHomeMap();
    expect(home.find((province) => province.name === 'Sichuan')?.photo).toBe(
      full('first', 'a.jpg'),
    );
    const row = (await journal.listVisitedProvinces()).find(
      (province) => province.name === 'Sichuan',
    );
    expect(row).toMatchObject({ coverId: null, fallback: true });
  });

  it('clear with no cover picked is fine', async () => {
    await world();

    expect(await journal.clearProvinceCover('Sichuan')).toEqual({ ok: true });
  });

  it('refuses a Photo that is not a candidate and keeps the cover', async () => {
    const { sichuan, chengdu, lanzhou, first } = await world();
    const kept = await addPhoto(first, '2024-03-01', { name: 'kept.jpg', cityId: chengdu });
    await setProvinceCover(sichuan, kept);
    const gansuPhoto = await addPhoto(first, '2024-03-02', { name: 'gansu.jpg', cityId: lanzhou });
    const onTheWay = await addPhoto(first, '2024-03-01', {
      name: 'train.jpg',
      provinceId: sichuan,
    });
    const hiddenTrip = await addTrip({ slug: 'hidden', visible: false });
    await addDay(hiddenTrip, chengdu, '2025-05-01', { position: 1 });
    const secret = await addPhoto(hiddenTrip, '2025-05-01', {
      name: 'secret.jpg',
      cityId: chengdu,
    });

    for (const photoId of [gansuPhoto, onTheWay, secret, 999999]) {
      expect(await journal.setProvinceCover('Sichuan', photoId)).toEqual({
        ok: false,
        error: 'unknown-photo',
      });
    }

    const row = (await journal.listVisitedProvinces()).find(
      (province) => province.name === 'Sichuan',
    );
    expect(row?.coverId).toBe(kept);
  });

  it('refuses a Province that is not visited', async () => {
    const { chengdu, first } = await world();
    const photo = await addPhoto(first, '2024-03-01', { cityId: chengdu });

    expect(await journal.setProvinceCover('Qinghai', photo)).toEqual({
      ok: false,
      error: 'unknown-province',
    });
    expect(await journal.clearProvinceCover('Qinghai')).toEqual({
      ok: false,
      error: 'unknown-province',
    });
  });

  it('leaves the list with its Province and comes back with it, cover kept', async () => {
    const { chengdu, lanzhou, first } = await world();
    await addPhoto(first, '2024-03-01', { name: 'a.jpg', cityId: chengdu });
    const picked = await addPhoto(first, '2024-03-02', { name: 'b.jpg', cityId: lanzhou });
    await addPhoto(first, '2024-03-02', { name: 'c.jpg', cityId: lanzhou });
    await journal.setProvinceCover('Gansu', picked);

    await env.DB.prepare('UPDATE days SET visible = 0 WHERE trip_id = ? AND city_id = ?')
      .bind(first, lanzhou)
      .run();
    expect((await journal.listVisitedProvinces()).map((province) => province.name)).toEqual([
      'Sichuan',
    ]);
    expect(await journal.setProvinceCover('Gansu', picked)).toEqual({
      ok: false,
      error: 'unknown-province',
    });

    await env.DB.prepare('UPDATE days SET visible = 1 WHERE trip_id = ? AND city_id = ?')
      .bind(first, lanzhou)
      .run();
    const gansu = (await journal.listVisitedProvinces()).find(
      (province) => province.name === 'Gansu',
    );
    expect(gansu).toMatchObject({ coverId: picked, fallback: false });
  });

  it('is shown as the fallback when its Photo is on a Hidden Day', async () => {
    const { sichuan, chengdu, first } = await world();
    await addPhoto(first, '2024-03-01', { name: 'a.jpg', cityId: chengdu });
    await addDay(first, chengdu, '2024-03-10', { position: 3, visible: false });
    const off = await addPhoto(first, '2024-03-10', { name: 'off.jpg', cityId: chengdu });
    await setProvinceCover(sichuan, off);

    const row = (await journal.listVisitedProvinces()).find(
      (province) => province.name === 'Sichuan',
    );

    expect(row).toMatchObject({ photo: thumb('first', 'a.jpg'), coverId: null, fallback: true });
  });
});

describe('Province Cover focal point', () => {
  async function coverOfSichuan() {
    const { chengdu, first } = await world();
    await addPhoto(first, '2024-03-01', { name: 'a.jpg', cityId: chengdu });
    const picked = await addPhoto(first, '2024-03-01', { name: 'b.jpg', cityId: chengdu });
    await journal.setProvinceCover('Sichuan', picked);
    return picked;
  }
  const sichuanHome = async () =>
    (await journal.getHomeMap()).find((province) => province.name === 'Sichuan');
  const sichuanAdmin = async () =>
    (await journal.listVisitedProvinces()).find((province) => province.name === 'Sichuan');

  it('is the centre of a new cover', async () => {
    await coverOfSichuan();

    expect((await sichuanHome())?.focus).toEqual({ x: 50, y: 50 });
    expect((await sichuanAdmin())?.focus).toEqual({ x: 50, y: 50 });
  });

  it('set shows on the home map and in the admin list', async () => {
    await coverOfSichuan();

    expect(await journal.setProvinceCoverFocus('Sichuan', 20, 75)).toEqual({ ok: true });

    expect((await sichuanHome())?.focus).toEqual({ x: 20, y: 75 });
    expect((await sichuanAdmin())?.focus).toEqual({ x: 20, y: 75 });
  });

  it('accepts the edges, 0 and 100', async () => {
    await coverOfSichuan();

    expect(await journal.setProvinceCoverFocus('Sichuan', 0, 100)).toEqual({ ok: true });
    expect((await sichuanHome())?.focus).toEqual({ x: 0, y: 100 });
  });

  it('refuses values outside 0 to 100 and keeps the point', async () => {
    await coverOfSichuan();
    await journal.setProvinceCoverFocus('Sichuan', 20, 75);

    for (const [x, y] of [
      [-1, 50],
      [50, 101],
      [100.5, 50],
      [Number.NaN, 50],
      [50, Number.POSITIVE_INFINITY],
    ]) {
      expect(await journal.setProvinceCoverFocus('Sichuan', x, y)).toEqual({
        ok: false,
        error: 'invalid-focus',
      });
    }
    expect((await sichuanHome())?.focus).toEqual({ x: 20, y: 75 });
  });

  it('is refused for a Province without a chosen cover', async () => {
    const { chengdu, first } = await world();
    await addPhoto(first, '2024-03-01', { name: 'a.jpg', cityId: chengdu });

    expect(await journal.setProvinceCoverFocus('Sichuan', 10, 10)).toEqual({
      ok: false,
      error: 'no-cover',
    });
    expect((await sichuanHome())?.focus).toBeUndefined();
    expect((await sichuanAdmin())?.focus).toBeUndefined();
  });

  it('is refused for a Province that is not visited', async () => {
    await world();

    expect(await journal.setProvinceCoverFocus('Qinghai', 10, 10)).toEqual({
      ok: false,
      error: 'unknown-province',
    });
  });

  it('goes back to the centre when a new cover is set', async () => {
    const { chengdu, first } = await world();
    const a = await addPhoto(first, '2024-03-01', { name: 'a.jpg', cityId: chengdu });
    const b = await addPhoto(first, '2024-03-01', { name: 'b.jpg', cityId: chengdu });
    await journal.setProvinceCover('Sichuan', a);
    await journal.setProvinceCoverFocus('Sichuan', 10, 90);

    await journal.setProvinceCover('Sichuan', b);

    expect((await sichuanHome())?.focus).toEqual({ x: 50, y: 50 });
  });

  it('goes with the cover when it is cleared', async () => {
    const picked = await coverOfSichuan();
    await journal.setProvinceCoverFocus('Sichuan', 10, 90);

    await journal.clearProvinceCover('Sichuan');
    expect((await sichuanHome())?.focus).toBeUndefined();

    await journal.setProvinceCover('Sichuan', picked);
    expect((await sichuanHome())?.focus).toEqual({ x: 50, y: 50 });
  });
});
