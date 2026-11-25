import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { createJournal } from './index';
import { addCity, addDay, addPhoto, addProvince, addTrip, resetDatabase, setDayCities, setProvinceCover } from './seed.test-helper';

const journal = createJournal(env);

beforeEach(resetDatabase);

const input = { name: 'Chengdu', nameZh: '成都', provinceId: 0, lng: 104, lat: 30.6, major: true };

async function world() {
  const sichuan = await addProvince('Sichuan', '四川');
  const gansu = await addProvince('Gansu', '甘肃');
  const chengdu = await addCity('Chengdu', sichuan, { nameZh: '成都', major: true });
  const lanzhou = await addCity('Lanzhou', gansu);
  const first = await addTrip({ slug: 'first', title: 'First', start: '2024-03-01' });
  const second = await addTrip({ slug: 'second', title: 'Second', start: '2025-03-01' });
  return { sichuan, gansu, chengdu, lanzhou, first, second };
}

describe('Cities of the admin', () => {
  it('list every City by name, also one without Photos, with what uses it', async () => {
    const { chengdu, first } = await world();
    await addDay(first, chengdu, '2024-03-01', { position: 1 });
    await addPhoto(first, '2024-03-01', { name: 'a.jpg', cityId: chengdu });
    await env.DB.prepare("INSERT INTO trip_hotels (trip_id, city_id, position, name, address, rating) VALUES (?, ?, 1, 'H', 'A', 4)")
      .bind(first, chengdu)
      .run();

    const cities = await journal.listAdminCities();

    expect(cities.map((city) => [city.name, city.photos, city.days, city.stays])).toEqual([
      ['Chengdu', 1, 1, 1],
      ['Lanzhou', 0, 0, 0],
    ]);
    expect(cities[0]).toMatchObject({ nameZh: '成都', province: 'Sichuan', major: true });
  });

  it('list the Photos of a City from every Trip, newest Trip first', async () => {
    const { chengdu, lanzhou, first, second } = await world();
    await addPhoto(first, '2024-03-01', { name: 'a.jpg', cityId: chengdu });
    await addPhoto(second, '2025-03-01', { name: 'b.jpg', cityId: chengdu });
    await addPhoto(second, '2025-03-02', { name: 'c.jpg', cityId: lanzhou });

    const photos = await journal.listCityPhotos(chengdu);

    expect(photos?.map((photo) => [photo.trip.title, photo.name])).toEqual([
      ['Second', 'b.jpg'],
      ['First', 'a.jpg'],
    ]);
    expect(await journal.listCityPhotos(9999)).toBeNull();
  });
});

describe('Edit City', () => {
  it('saves every field', async () => {
    const { chengdu, gansu } = await world();

    const result = await journal.editCity({ ...input, id: chengdu, name: ' Chengdu City ', nameZh: '成都市', provinceId: gansu, lng: 1, lat: 2, major: false });

    expect(result).toMatchObject({
      ok: true,
      clearedCovers: [],
      city: { id: chengdu, name: 'Chengdu City', nameZh: '成都市', province: 'Gansu', provinceId: gansu, lng: 1, lat: 2, major: false },
    });
  });

  it('keeps its own name, and refuses the name of another City', async () => {
    const { sichuan, chengdu } = await world();

    expect((await journal.editCity({ ...input, id: chengdu, provinceId: sichuan })).ok).toBe(true);
    expect(await journal.editCity({ ...input, id: chengdu, provinceId: sichuan, name: 'Lanzhou' })).toEqual({ ok: false, error: 'name-taken' });
  });

  it('refuses an unknown City, a blank name, an unknown Province and a position out of range', async () => {
    const { sichuan, chengdu } = await world();
    const valid = { ...input, id: chengdu, provinceId: sichuan };

    expect(await journal.editCity({ ...valid, id: 9999 })).toEqual({ ok: false, error: 'unknown-city' });
    expect(await journal.editCity({ ...valid, nameZh: ' ' })).toEqual({ ok: false, error: 'invalid-name' });
    expect(await journal.editCity({ ...valid, provinceId: 9999 })).toEqual({ ok: false, error: 'unknown-province' });
    expect(await journal.editCity({ ...valid, lat: 91 })).toEqual({ ok: false, error: 'invalid-position' });
  });

  it('clears the Province Cover of the old Province when it is a Photo of the City', async () => {
    const { sichuan, gansu, chengdu, first } = await world();
    const photo = await addPhoto(first, '2024-03-01', { name: 'a.jpg', cityId: chengdu });
    await setProvinceCover(sichuan, photo);

    const result = await journal.editCity({ ...input, id: chengdu, provinceId: gansu });

    expect(result).toMatchObject({ ok: true, clearedCovers: ['Sichuan'] });
    const { results } = await env.DB.prepare('SELECT * FROM province_covers').all();
    expect(results).toEqual([]);
  });

  it('keeps the Province Cover of another City, and the cover when the Province does not change', async () => {
    const { sichuan, gansu, chengdu, first } = await world();
    const mianyang = await addCity('Mianyang', sichuan);
    const other = await addPhoto(first, '2024-03-01', { name: 'a.jpg', cityId: mianyang });
    await setProvinceCover(sichuan, other);

    expect(await journal.editCity({ ...input, id: chengdu, provinceId: gansu })).toMatchObject({ clearedCovers: [] });
    expect(await journal.editCity({ ...input, id: mianyang, name: 'Mianyang', provinceId: sichuan })).toMatchObject({ clearedCovers: [] });
    const { results } = await env.DB.prepare('SELECT photo_id FROM province_covers').all();
    expect(results).toEqual([{ photo_id: other }]);
  });
});

describe('Delete City', () => {
  it('deletes a City nothing uses', async () => {
    const { lanzhou } = await world();

    expect(await journal.deleteCity(lanzhou)).toEqual({ ok: true });
    expect((await journal.listAdminCities()).map((city) => city.name)).toEqual(['Chengdu']);
  });

  it('refuses a City with a Photo, a Day, a hotel or a restaurant, and an unknown City', async () => {
    const { sichuan, chengdu, first } = await world();
    // Chengdu and Lanzhou, plus the three Cities made below.
    const withPhoto = await addCity('Photo', sichuan);
    await addPhoto(first, '2024-03-01', { cityId: withPhoto });
    await addDay(first, chengdu, '2024-03-02', { position: 1 });
    const withRestaurant = await addCity('Restaurant', sichuan);
    await env.DB.prepare("INSERT INTO trip_restaurants (trip_id, city_id, position, name, address, rating) VALUES (?, ?, 1, 'R', 'A', 4)")
      .bind(first, withRestaurant)
      .run();

    const passedThrough = await addCity('Passed', sichuan);
    await setDayCities(await addDay(first, chengdu, '2024-03-03', { position: 2 }), [passedThrough]);

    for (const id of [withPhoto, chengdu, withRestaurant, passedThrough]) {
      expect(await journal.deleteCity(id)).toEqual({ ok: false, error: 'in-use' });
    }
    expect(await journal.deleteCity(9999)).toEqual({ ok: false, error: 'unknown-city' });
    expect(await journal.listAdminCities()).toHaveLength(5);
  });
});
