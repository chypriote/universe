import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { createJournal } from './index';
import { landscape, landscapeExif, portrait, rotatedExif } from './jpeg.test-helper';
import {
  addCity,
  addDay,
  addPhoto,
  addProvince,
  addTrip,
  resetDatabase,
  setHighlight,
  setProvinceCover,
  setTripCover,
} from './seed.test-helper';

const journal = createJournal(env);
const thumb = () => new Uint8Array([1, 2, 3]).buffer;

beforeEach(resetDatabase);

async function sichuanTrip() {
  const province = await addProvince('Sichuan', '四川');
  const trip = await addTrip({ slug: 'sichuan' });
  return { province, trip };
}

async function upload(name: string, file: ArrayBuffer, options: { date?: string; title?: string; overwrite?: boolean } = {}) {
  return journal.uploadPhoto({ trip: 'sichuan', name, file, thumb: thumb(), ...options });
}

async function bucketKeys() {
  return (await env.PHOTOS.list()).objects.map((object) => object.key).sort();
}

describe('Upload Photo: date', () => {
  it('comes from EXIF first, even when the file name and the form give another', async () => {
    await sichuanTrip();

    const result = await upload('IMG_20250101_101010.jpg', landscapeExif(), { date: '2025-01-05' });

    expect(result).toMatchObject({ ok: true, replaced: false, photo: { date: '2025-04-02', name: 'IMG_20250101_101010.jpg' } });
  });
});

describe('Upload Photo: date without EXIF', () => {
  it.each([
    ['2025-03-29-09-02.jpg', '2025-03-29'],
    ['2025-12-03 -10-05.jpg', '2025-12-03'],
    ['IMG_20250515_181109.jpg', '2025-05-15'],
    ['IMG20250516163614.jpg', '2025-05-16'],
    ['mmexport1743238932000.jpg', '2025-03-29'],
  ])('comes from the file name %s', async (name, date) => {
    await sichuanTrip();

    const result = await upload(name, landscape(), { date: '2020-01-01' });

    expect(result).toMatchObject({ ok: true, photo: { date } });
  });

  it('comes from the form when the file name has none', async () => {
    await sichuanTrip();

    const result = await upload('market.jpg', landscape(), { date: '2025-04-09' });

    expect(result).toMatchObject({ ok: true, photo: { date: '2025-04-09' } });
  });

  it('refuses the upload when nothing gives a date, and stores nothing', async () => {
    await sichuanTrip();

    const result = await upload('market.jpg', landscape());

    expect(result).toEqual({ ok: false, error: 'no-date' });
    expect(await bucketKeys()).toEqual([]);
    expect(await journal.listAdminPhotos('sichuan')).toEqual([]);
  });
});

describe('Upload Photo: storing', () => {
  it('keeps the file and the thumbnail under the Trip, with spaces and accents in the name', async () => {
    await sichuanTrip();

    const result = await upload('Café IMG (1).jpg', landscape(), { date: '2025-04-09' });

    expect(await bucketKeys()).toEqual(['thumbs/sichuan/Café IMG (1).jpg.webp', 'trips/sichuan/Café IMG (1).jpg']);
    expect(result).toMatchObject({
      ok: true,
      photo: {
        url: 'https://photos.test/trips/sichuan/Caf%C3%A9%20IMG%20(1).jpg',
        thumb: 'https://photos.test/thumbs/sichuan/Caf%C3%A9%20IMG%20(1).jpg.webp',
      },
    });
  });

  it('takes the size and orientation from the file, as displayed', async () => {
    await sichuanTrip();

    await upload('a.jpg', landscape(), { date: '2025-04-09' });
    await upload('b.jpg', portrait(), { date: '2025-04-09' });
    await upload('c.jpg', rotatedExif());

    const photos = await journal.listAdminPhotos('sichuan');
    expect(photos?.map((photo) => [photo.name, photo.orientation])).toEqual([
      ['c.jpg', 'portrait'],
      ['a.jpg', 'landscape'],
      ['b.jpg', 'portrait'],
    ]);
  });

  it('refuses a file that is not an image, an unknown Trip and an unknown City', async () => {
    await sichuanTrip();
    const date = '2025-04-09';

    expect(await upload('a.jpg', new Uint8Array([1, 2, 3]).buffer, { date })).toEqual({ ok: false, error: 'unreadable' });
    expect(await upload('a.gif', landscape(), { date })).toEqual({ ok: false, error: 'unsupported-type' });
    expect(await upload('a/b.jpg', landscape(), { date })).toEqual({ ok: false, error: 'invalid-name' });
    expect(await journal.uploadPhoto({ trip: 'nope', name: 'a.jpg', file: landscape(), thumb: thumb(), date })).toEqual({
      ok: false,
      error: 'unknown-trip',
    });
    expect(await journal.uploadPhoto({ trip: 'sichuan', name: 'a.jpg', file: landscape(), thumb: thumb(), date, cityId: 999 })).toEqual({
      ok: false,
      error: 'unknown-city',
    });
    expect(await bucketKeys()).toEqual([]);
  });

  it('shows in the Gallery and under its Day at once, with the title and City given', async () => {
    const { province, trip } = await sichuanTrip();
    const chengdu = await addCity('Chengdu', province);
    await addDay(trip, chengdu, '2025-04-02', { position: 1 });

    await journal.uploadPhoto({
      trip: 'sichuan',
      name: 'panda.jpg',
      file: landscapeExif(),
      thumb: thumb(),
      title: 'Panda breakfast',
      cityId: chengdu,
    });

    const page = await journal.getTrip('sichuan');
    const gallery = await journal.getGallery();
    expect(page?.days[0].photos.map((photo) => photo.caption)).toEqual(['Panda breakfast']);
    expect(gallery.photos.map((photo) => [photo.caption, photo.city, photo.province, photo.day])).toEqual([
      ['Panda breakfast', 'Chengdu', 'Sichuan', 1],
    ]);
  });
});

async function bytesOf(key: string) {
  return new Uint8Array(await (await env.PHOTOS.get(key))!.arrayBuffer());
}

describe('Upload Photo: same file name in the Trip', () => {
  async function uploaded() {
    const { province, trip } = await sichuanTrip();
    const chengdu = await addCity('Chengdu', province);
    await addDay(trip, chengdu, '2025-04-09', { position: 1 });
    await journal.uploadPhoto({
      trip: 'sichuan',
      name: 'panda.jpg',
      file: landscape(),
      thumb: thumb(),
      date: '2025-04-09',
      title: 'Panda breakfast',
      cityId: chengdu,
    });
    return { trip };
  }

  it('answers "exists" without the overwrite flag, and changes nothing', async () => {
    await uploaded();
    const before = await bytesOf('trips/sichuan/panda.jpg');

    const result = await upload('panda.jpg', portrait(), { date: '2025-05-01' });

    expect(result).toEqual({ ok: false, error: 'exists' });
    expect(await bytesOf('trips/sichuan/panda.jpg')).toEqual(before);
    const [photo] = (await journal.listAdminPhotos('sichuan'))!;
    expect([photo.orientation, photo.date]).toEqual(['landscape', '2025-04-09']);
  });

  it('replaces both objects and the size, and keeps what was set by hand', async () => {
    await uploaded();
    const newThumb = new Uint8Array([9, 9]).buffer;

    const result = await journal.uploadPhoto({
      trip: 'sichuan',
      name: 'panda.jpg',
      file: portrait(),
      thumb: newThumb,
      date: '2025-05-01',
      title: 'Ignored',
      overwrite: true,
    });

    expect(result).toMatchObject({
      ok: true,
      replaced: true,
      photo: {
        orientation: 'portrait',
        date: '2025-04-09',
        day: 1,
        title: 'Panda breakfast',
        city: { name: 'Chengdu' },
        url: 'https://photos.test/trips/sichuan/panda.jpg?v=2',
        thumb: 'https://photos.test/thumbs/sichuan/panda.jpg.webp?v=2',
      },
    });
    expect(await bytesOf('thumbs/sichuan/panda.jpg.webp')).toEqual(new Uint8Array([9, 9]));
    expect(await bytesOf('trips/sichuan/panda.jpg')).toEqual(new Uint8Array(portrait()));
    expect(await bucketKeys()).toHaveLength(2);
    const page = await journal.getTrip('sichuan');
    expect(page?.days[0].photos.map((photo) => [photo.url, photo.caption])).toEqual([
      ['https://photos.test/trips/sichuan/panda.jpg?v=2', 'Panda breakfast'],
    ]);
  });

  it('keeps the covers the Photo has when its orientation still fits', async () => {
    const { trip } = await uploaded();
    const [photo] = (await journal.listAdminPhotos('sichuan'))!;
    await setTripCover(trip, photo.id);

    const result = await upload('panda.jpg', landscapeExif(), { overwrite: true });

    expect(result).toMatchObject({ ok: true });
    const [card] = await journal.listTripCards();
    expect(card.cover).toBe('https://photos.test/thumbs/sichuan/panda.jpg.webp?v=2');
  });

  it('is refused when the new orientation breaks the Trip Cover or a Highlight Photo, and changes nothing', async () => {
    const { trip } = await uploaded();
    const [photo] = (await journal.listAdminPhotos('sichuan'))!;
    await setTripCover(trip, photo.id);
    const before = await bytesOf('trips/sichuan/panda.jpg');

    const asCover = await upload('panda.jpg', portrait(), { overwrite: true });

    expect(asCover).toMatchObject({
      ok: false,
      error: 'breaks-cover',
      covers: [{ kind: 'trip-cover', label: 'Trip Cover of sichuan' }],
    });
    expect(await bytesOf('trips/sichuan/panda.jpg')).toEqual(before);
    expect((await journal.listAdminPhotos('sichuan'))![0].orientation).toBe('landscape');

    const tall = await addPhoto(trip, '2025-04-09', { name: 'tall.jpg', width: 3000, height: 4000 });
    await setHighlight(trip, 1, tall);
    const asHighlight = await upload('tall.jpg', landscape(), { overwrite: true });

    expect(asHighlight).toMatchObject({ ok: false, error: 'breaks-cover', covers: [{ kind: 'highlight' }] });
  });
});

describe('Edit Photos', () => {
  async function twoPhotos() {
    const sichuan = await addProvince('Sichuan', '四川');
    const qinghai = await addProvince('Qinghai', '青海');
    const chengdu = await addCity('Chengdu', sichuan);
    const xining = await addCity('Xining', qinghai);
    const trip = await addTrip({ slug: 'sichuan' });
    const a = await addPhoto(trip, '2025-04-01', { name: 'a.jpg', title: 'Keep me', cityId: chengdu });
    const b = await addPhoto(trip, '2025-04-02', { name: 'b.jpg', provinceId: qinghai });
    const read = async () => (await journal.listAdminPhotos('sichuan'))!;
    return { sichuan, qinghai, chengdu, xining, a, b, read };
  }

  it('sets one City on the selection, and the Province follows', async () => {
    const { xining, a, b, read } = await twoPhotos();

    const result = await journal.editPhotos({ ids: [a, b], place: { cityId: xining } });

    expect(result).toEqual({ ok: true, updated: 2 });
    expect((await read()).map((photo) => [photo.city?.name, photo.province, photo.onTheWay])).toEqual([
      ['Xining', 'Qinghai', false],
      ['Xining', 'Qinghai', false],
    ]);
  });

  it('marks the selection On the way, with or without a Province, and drops the City', async () => {
    const { sichuan, a, b, read } = await twoPhotos();

    await journal.editPhotos({ ids: [a], place: { onTheWay: true } });
    await journal.editPhotos({ ids: [b], place: { onTheWay: true, provinceId: sichuan } });

    expect((await read()).map((photo) => [photo.city, photo.province, photo.onTheWay])).toEqual([
      [null, null, true],
      [null, 'Sichuan', true],
    ]);
  });

  it('makes a City Photo of an On the way photo, and an On the way photo of a City Photo', async () => {
    const { chengdu, a, b, read } = await twoPhotos();

    await journal.editPhotos({ ids: [b], place: { cityId: chengdu } });
    await journal.editPhotos({ ids: [a], place: { onTheWay: true } });

    expect((await read()).map((photo) => [photo.name, photo.city?.name ?? null, photo.onTheWay])).toEqual([
      ['a.jpg', null, true],
      ['b.jpg', 'Chengdu', false],
    ]);
  });

  it('changes only the fields given', async () => {
    const { a, b, read } = await twoPhotos();

    await journal.editPhotos({ ids: [a, b], date: '2025-04-05' });

    expect((await read()).map((photo) => [photo.date, photo.title, photo.city?.name ?? null, photo.onTheWay])).toEqual([
      ['2025-04-05', 'Keep me', 'Chengdu', false],
      ['2025-04-05', null, null, true],
    ]);
  });

  it('sets a title, and clears it with an empty one', async () => {
    const { a, b, read } = await twoPhotos();

    await journal.editPhotos({ ids: [b], title: '  From the train  ' });
    await journal.editPhotos({ ids: [a], title: '' });

    expect((await read()).map((photo) => photo.title)).toEqual([null, 'From the train']);
  });

  it('moves a Photo to the Day of its new date', async () => {
    const { chengdu, b } = await twoPhotos();
    const tripId = (await env.DB.prepare('SELECT id FROM trips').first<{ id: number }>())!.id;
    await addDay(tripId, chengdu, '2025-04-01', { position: 1 });
    await addDay(tripId, chengdu, '2025-04-03', { position: 2 });

    await journal.editPhotos({ ids: [b], date: '2025-04-03' });

    const page = await journal.getTrip('sichuan');
    expect(page?.days.map((day) => day.photos.length)).toEqual([1, 1]);
  });

  it('is refused for an unknown Photo, City or Province, or an impossible date, and changes nothing', async () => {
    const { a, b, read } = await twoPhotos();
    const before = await read();

    expect(await journal.editPhotos({ ids: [a, 999], title: 'x' })).toEqual({ ok: false, error: 'unknown-photo' });
    expect(await journal.editPhotos({ ids: [a], place: { cityId: 999 } })).toEqual({ ok: false, error: 'unknown-city' });
    expect(await journal.editPhotos({ ids: [b], place: { onTheWay: true, provinceId: 999 } })).toEqual({
      ok: false,
      error: 'unknown-province',
    });
    expect(await journal.editPhotos({ ids: [a], date: '2025-02-30' })).toEqual({ ok: false, error: 'invalid-date' });
    expect(await read()).toEqual(before);
  });
});

describe('Delete Photos', () => {
  async function put(slug: string, name: string) {
    await env.PHOTOS.put(`trips/${slug}/${name}`, 'file');
    await env.PHOTOS.put(`thumbs/${slug}/${name}.webp`, 'thumb');
  }

  async function sichuan() {
    const province = await addProvince('Sichuan', '四川');
    const chengdu = await addCity('Chengdu', province);
    const trip = await addTrip({ slug: 'sichuan', title: 'Sichuan' });
    const photo = async (name: string, options: { width?: number; height?: number; tripId?: number } = {}) => {
      const id = await addPhoto(options.tripId ?? trip, '2025-04-01', { name, cityId: chengdu, ...options });
      await put('sichuan', name);
      return id;
    };
    const names = async () => (await journal.listAdminPhotos('sichuan'))!.map((item) => item.name);
    return { province, chengdu, trip, photo, names };
  }

  it('removes the row and both files from the bucket', async () => {
    const { photo, names } = await sichuan();
    const gone = await photo('gone.jpg');
    await photo('kept.jpg');

    const result = await journal.deletePhotos({ ids: [gone] });

    expect(result).toEqual({ deleted: [gone], kept: [] });
    expect(await names()).toEqual(['kept.jpg']);
    expect(await bucketKeys()).toEqual(['thumbs/sichuan/kept.jpg.webp', 'trips/sichuan/kept.jpg']);
  });

  it('refuses a Trip Cover and lists the landscape Photos of the Trip as replacements', async () => {
    const { photo, trip, names } = await sichuan();
    const cover = await photo('cover.jpg');
    await photo('other.jpg');
    await photo('tall.jpg', { width: 3000, height: 4000 });
    const otherTrip = await addTrip({ slug: 'tibet' });
    await addPhoto(otherTrip, '2025-06-01', { name: 'elsewhere.jpg' });
    await setTripCover(trip, cover);

    const result = await journal.deletePhotos({ ids: [cover] });

    expect(result.deleted).toEqual([]);
    expect(result.kept).toMatchObject([
      {
        id: cover,
        name: 'cover.jpg',
        covers: [
          {
            key: 'trip-cover:sichuan',
            kind: 'trip-cover',
            href: '/admin/trips/sichuan',
            replacements: [{ name: 'other.jpg', thumb: 'https://photos.test/thumbs/sichuan/other.jpg.webp' }],
          },
        ],
      },
    ]);
    expect(await names()).toContain('cover.jpg');
    expect(await bucketKeys()).toContain('trips/sichuan/cover.jpg');
  });

  it('refuses a Highlight Photo and lists the portrait Photos of the Trip that are not highlights', async () => {
    const { photo, trip } = await sichuan();
    const first = await photo('first.jpg', { width: 3000, height: 4000 });
    const second = await photo('second.jpg', { width: 3000, height: 4000 });
    await photo('free.jpg', { width: 3000, height: 4000 });
    await photo('wide.jpg');
    await setHighlight(trip, 1, first);
    await setHighlight(trip, 2, second);

    const result = await journal.deletePhotos({ ids: [first] });

    expect(result.kept).toMatchObject([
      { id: first, covers: [{ key: 'highlight:sichuan:1', kind: 'highlight', replacements: [{ name: 'free.jpg' }] }] },
    ]);
  });

  it('refuses a Province Cover and lists the Photos of that Province from any Trip', async () => {
    const { province, chengdu, photo } = await sichuan();
    const cover = await photo('cover.jpg');
    await photo('here.jpg');
    const qinghai = await addProvince('Qinghai');
    const xining = await addCity('Xining', qinghai);
    await photo('xining.jpg').then((id) => journal.editPhotos({ ids: [id], place: { cityId: xining } }));
    const tibet = await addTrip({ slug: 'tibet' });
    await addPhoto(tibet, '2025-06-01', { name: 'later.jpg', cityId: chengdu });
    await addPhoto(tibet, '2025-06-01', { name: 'nowhere.jpg' });
    await setProvinceCover(province, cover);

    const result = await journal.deletePhotos({ ids: [cover] });

    expect(result.kept).toMatchObject([
      {
        id: cover,
        covers: [
          {
            key: 'province-cover:Sichuan',
            kind: 'province-cover',
            href: '/admin/home',
            replacements: [{ name: 'here.jpg' }, { name: 'later.jpg' }],
          },
        ],
      },
    ]);
  });

  it('moves the cover to the replacement picked, then deletes', async () => {
    const { photo, trip, names } = await sichuan();
    const cover = await photo('cover.jpg');
    const next = await photo('next.jpg');
    await setTripCover(trip, cover);

    const result = await journal.deletePhotos({ ids: [cover], replacements: { 'trip-cover:sichuan': next } });

    expect(result).toEqual({ deleted: [cover], kept: [] });
    expect(await names()).toEqual(['next.jpg']);
    const [card] = await journal.listTripCards();
    expect(card.cover).toBe('https://photos.test/thumbs/sichuan/next.jpg.webp');
    expect(await bucketKeys()).toEqual(['thumbs/sichuan/next.jpg.webp', 'trips/sichuan/next.jpg']);
  });

  it('keeps the Photo when a replacement is not one of the valid ones', async () => {
    const { photo, trip, names } = await sichuan();
    const cover = await photo('cover.jpg');
    const tall = await photo('tall.jpg', { width: 3000, height: 4000 });
    await setTripCover(trip, cover);

    const result = await journal.deletePhotos({ ids: [cover], replacements: { 'trip-cover:sichuan': tall } });

    expect(result.deleted).toEqual([]);
    expect(result.kept).toHaveLength(1);
    expect(await names()).toContain('cover.jpg');
  });

  it('deletes the Photos in a bulk delete that are not covers, and names the covers it keeps', async () => {
    const { photo, trip, names } = await sichuan();
    const cover = await photo('cover.jpg');
    const other = await photo('other.jpg');
    const spare = await photo('spare.jpg');
    await setTripCover(trip, cover);

    const result = await journal.deletePhotos({ ids: [cover, other, spare] });

    expect(result.deleted).toEqual([other, spare]);
    expect(result.kept.map((kept) => kept.name)).toEqual(['cover.jpg']);
    expect(result.kept[0].covers[0].replacements).toEqual([]);
    expect(await names()).toEqual(['cover.jpg']);
  });

  it('does not offer a Photo of the same delete as a replacement', async () => {
    const { photo, trip } = await sichuan();
    const cover = await photo('cover.jpg');
    const other = await photo('other.jpg');
    await setTripCover(trip, cover);

    const result = await journal.deletePhotos({ ids: [cover, other] });

    expect(result.kept[0].covers[0].replacements).toEqual([]);
  });
});

describe('Add City', () => {
  it('is usable at once: listed with its Province, and set on a Photo', async () => {
    const { province } = await sichuanTrip();
    await upload('a.jpg', landscape(), { date: '2025-04-09' });

    const added = await journal.addCity({
      name: 'Leshan',
      nameZh: '乐山',
      provinceId: province,
      lng: 103.77,
      lat: 29.55,
      major: true,
    });

    expect(added).toMatchObject({ ok: true, city: { name: 'Leshan', nameZh: '乐山', province: 'Sichuan', major: true } });
    expect(await journal.listCities()).toEqual([
      expect.objectContaining({ name: 'Leshan', province: 'Sichuan', major: true }),
    ]);
    const cityId = (added as { city: { id: number } }).city.id;
    const [photo] = (await journal.listAdminPhotos('sichuan'))!;
    expect(await journal.editPhotos({ ids: [photo.id], place: { cityId } })).toEqual({ ok: true, updated: 1 });
    expect((await journal.getGallery()).photos.map((item) => [item.city, item.province])).toEqual([['Leshan', 'Sichuan']]);
    expect((await journal.getGallery()).cities.map((city) => [city.name, city.lng, city.lat])).toEqual([['Leshan', 103.77, 29.55]]);
  });

  it('is refused for a taken or blank name, an unknown Province or an impossible position', async () => {
    const { province } = await sichuanTrip();
    const city = { name: 'Leshan', nameZh: '乐山', provinceId: province, lng: 103.77, lat: 29.55, major: false };
    await journal.addCity(city);

    expect(await journal.addCity(city)).toEqual({ ok: false, error: 'name-taken' });
    expect(await journal.addCity({ ...city, name: '  ' })).toEqual({ ok: false, error: 'invalid-name' });
    expect(await journal.addCity({ ...city, name: 'Emei', provinceId: 999 })).toEqual({ ok: false, error: 'unknown-province' });
    expect(await journal.addCity({ ...city, name: 'Emei', lat: 120 })).toEqual({ ok: false, error: 'invalid-position' });
    expect(await journal.listCities()).toHaveLength(1);
  });

  it('lists the Provinces, for an On the way photo and a new City', async () => {
    await addProvince('Sichuan');
    await addProvince('Qinghai');

    expect((await journal.listProvinces()).map((province) => province.name)).toEqual(['Qinghai', 'Sichuan']);
  });
});

describe('Photos: input the admin API passes through', () => {
  it('refuses an upload whose form date is not a real date, and stores nothing', async () => {
    await sichuanTrip();

    for (const date of ['soon', '2025-13-40', '2025-02-30']) {
      expect(await upload('market.jpg', landscape(), { date })).toEqual({ ok: false, error: 'invalid-date' });
    }
    expect(await bucketKeys()).toEqual([]);
    expect(await journal.listAdminPhotos('sichuan')).toEqual([]);
  });

  it('edits and deletes a selection of more than 100 Photos', async () => {
    const { trip } = await sichuanTrip();
    const ids: number[] = [];
    for (let i = 0; i < 120; i++) {
      const name = `p${i}.jpg`;
      ids.push(await addPhoto(trip, '2025-04-01', { name }));
      await env.PHOTOS.put(`trips/sichuan/${name}`, 'file');
    }

    expect(await journal.editPhotos({ ids, title: 'All' })).toEqual({ ok: true, updated: 120 });
    expect((await journal.listAdminPhotos('sichuan'))!.every((photo) => photo.title === 'All')).toBe(true);

    const result = await journal.deletePhotos({ ids });
    expect(result.deleted).toHaveLength(120);
    expect(await journal.listAdminPhotos('sichuan')).toEqual([]);
  });
});
