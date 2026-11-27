import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { createJournal } from './index';
import { landscape, portrait } from './jpeg.test-helper';
import { addCity, addPlan, addProvince, addTrip, resetDatabase } from './seed.test-helper';

const journal = createJournal(env);
const thumb = () => new Uint8Array([1, 2, 3]).buffer;

beforeEach(resetDatabase);

type Uploaded = { ok: boolean; error?: string; photo?: { id: number; url: string; title: string | null } };

/** The Photo files rules are the same for a Trip and a plan: each kind is driven through its own Journal methods. */
type Kind = {
  label: string;
  setup(): Promise<{ cityId: number }>;
  upload(name: string, file: ArrayBuffer, overwrite?: boolean): Promise<Uploaded>;
  setCity(photoId: number, cityId: number | null): Promise<{ ok: boolean; error?: string }>;
  setTitle(photoId: number, title: string): Promise<{ ok: boolean; error?: string }>;
  remove(photoId: number): Promise<{ ok: boolean }>;
  photos(): Promise<{ id: number; city: unknown; title: string | null }[]>;
  /** Makes the Photo the landscape cover. */
  cover(photoId: number): Promise<unknown>;
};

const trip: Kind = {
  label: 'a Trip',
  async setup() {
    const province = await addProvince('Sichuan');
    await addTrip({ slug: 'sichuan' });
    return { cityId: await addCity('Chengdu', province) };
  },
  upload: (name, file, overwrite) => journal.uploadPhoto({ trip: 'sichuan', name, file, thumb: thumb(), date: '2025-03-02', overwrite }),
  setCity: (id, cityId) => journal.editPhotos({ ids: [id], place: cityId === null ? { onTheWay: true } : { cityId } }),
  setTitle: (id, title) => journal.editPhotos({ ids: [id], title }),
  remove: async (id) => ({ ok: (await journal.deletePhotos({ ids: [id] })).deleted.includes(id) }),
  photos: async () => (await journal.getAdminTrip('sichuan'))!.photos,
  cover: (id) => journal.setTripCover('sichuan', id),
};

const plan: Kind = {
  label: 'a plan',
  async setup() {
    const province = await addProvince('Sichuan');
    await addPlan({ slug: 'sichuan' });
    return { cityId: await addCity('Chengdu', province) };
  },
  upload: (name, file, overwrite) => journal.uploadPlanPhoto({ plan: 'sichuan', name, file, thumb: thumb(), overwrite }),
  setCity: (id, cityId) => journal.setPlanPhotoCity(id, cityId),
  setTitle: (id, title) => journal.setPlanPhotoTitle(id, title),
  remove: (id) => journal.deletePlanPhoto(id),
  photos: async () => (await journal.getAdminPlan('sichuan'))!.photos,
  cover: (id) => journal.setPlanCover('sichuan', id),
};

const keys = async () => (await env.PHOTOS.list()).objects.map((object) => object.key).sort();

describe.each([trip, plan])('Photo files of $label', (kind) => {
  it('stores the file and its thumbnail, and lists the Photo', async () => {
    await kind.setup();

    const result = await kind.upload('lake.jpg', landscape());

    expect(result.ok).toBe(true);
    expect(await keys()).toEqual(['thumbs/sichuan/lake.jpg.webp', 'trips/sichuan/lake.jpg']);
    expect(await kind.photos()).toHaveLength(1);
  });

  it('refuses a taken name unless it overwrites, and an overwrite keeps the Photo and bumps the version', async () => {
    await kind.setup();
    const first = await kind.upload('lake.jpg', landscape());
    const photoId = first.photo!.id;
    await kind.setTitle(photoId, 'Lake');

    expect(await kind.upload('lake.jpg', landscape())).toEqual({ ok: false, error: 'exists' });
    const again = await kind.upload('lake.jpg', landscape(), true);

    expect(again.photo!.id).toBe(photoId);
    expect(again.photo!.url).toContain('?v=2');
    expect(again.photo!.title).toBe('Lake');
  });

  it('refuses a bad name, a type it does not know and a file that is not an image, writing nothing', async () => {
    await kind.setup();

    expect(await kind.upload('a/lake.jpg', landscape())).toEqual({ ok: false, error: 'invalid-name' });
    expect(await kind.upload('lake.gif', landscape())).toEqual({ ok: false, error: 'unsupported-type' });
    expect(await kind.upload('lake.jpg', new Uint8Array([1, 2, 3]).buffer)).toEqual({ ok: false, error: 'unreadable' });
    expect(await keys()).toEqual([]);
  });

  it('refuses a new file that breaks the orientation of the cover, writing nothing', async () => {
    await kind.setup();
    const wide = await kind.upload('lake.jpg', landscape());
    await kind.cover(wide.photo!.id);

    const result = await kind.upload('lake.jpg', portrait(), true);

    expect(result.ok).toBe(false);
    expect(result.error).toBe('breaks-cover');
    expect((await kind.photos())[0].id).toBe(wide.photo!.id);
  });

  it('sets and clears the City and the title', async () => {
    const { cityId } = await kind.setup();
    const { photo } = await kind.upload('lake.jpg', landscape());

    expect(await kind.setCity(photo!.id, cityId)).toMatchObject({ ok: true });
    expect(await kind.setCity(photo!.id, 9999)).toMatchObject({ ok: false, error: 'unknown-city' });
    expect(await kind.setCity(9999, null)).toMatchObject({ ok: false, error: 'unknown-photo' });
    expect((await kind.photos())[0].city).toEqual({ id: cityId, name: 'Chengdu' });
    expect(await kind.setCity(photo!.id, null)).toMatchObject({ ok: true });
    expect((await kind.photos())[0].city).toBeNull();

    expect(await kind.setTitle(photo!.id, '  At dawn  ')).toMatchObject({ ok: true });
    expect((await kind.photos())[0].title).toBe('At dawn');
    expect(await kind.setTitle(photo!.id, '')).toMatchObject({ ok: true });
    expect((await kind.photos())[0].title).toBeNull();
    expect(await kind.setTitle(9999, 'x')).toMatchObject({ ok: false, error: 'unknown-photo' });
  });

  it('deletes the row and both files', async () => {
    await kind.setup();
    const { photo } = await kind.upload('lake.jpg', landscape());

    expect((await kind.remove(photo!.id)).ok).toBe(true);

    expect(await kind.photos()).toEqual([]);
    expect(await keys()).toEqual([]);
  });
});
