import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { createJournal } from './index';
import { addCity, addDay, addPhoto, addProvince, addTrip, resetDatabase } from './seed.test-helper';

const journal = createJournal(env);
const names = (photos: { url: string }[]) => photos.map((photo) => photo.url.split('/').pop());

beforeEach(resetDatabase);

/** A plan with no Days and no dates (like Tibet), and two Cities. */
async function planTrip() {
  const tibet = await addProvince('Tibet', '西藏');
  const sichuan = await addProvince('Sichuan', '四川');
  const lhasa = await addCity('Lhasa', tibet, { major: true });
  const chengdu = await addCity('Chengdu', sichuan, { major: true });
  const trip = await addTrip({ slug: 'tibet', start: null, end: null });
  return { trip, lhasa, chengdu };
}

describe('Adding a Day', () => {
  it('gives a plan its first Day, its dates and a place in the public Trip page', async () => {
    const { lhasa } = await planTrip();

    const result = await journal.addDay('tibet', { date: '2027-05-10', cityId: lhasa, title: 'Arrival', notes: 'Rest' });

    expect(result).toEqual({ ok: true, dayId: expect.any(Number) });
    const page = await journal.getTrip('tibet');
    expect(page!.days.map((day) => [day.number, day.date, day.title, day.notes, day.city])).toEqual([
      [1, '2027-05-10', 'Arrival', 'Rest', 'Lhasa'],
    ]);
    expect(page!.startDate).toBe('2027-05-10');
    expect(page!.dates).toBe('10 May 2027 — 10 May 2027');
  });

  it('sets the Trip dates to the first and last Day and keeps Days in date order', async () => {
    const { lhasa, chengdu } = await planTrip();

    await journal.addDay('tibet', { date: '2027-05-12', cityId: lhasa, title: 'Third' });
    await journal.addDay('tibet', { date: '2027-05-10', cityId: chengdu, title: 'First' });
    await journal.addDay('tibet', { date: '2027-05-11', cityId: lhasa, title: 'Second' });

    const admin = (await journal.getAdminTrip('tibet'))!;
    expect(admin.days.map((day) => [day.number, day.date, day.title])).toEqual([
      [1, '2027-05-10', 'First'],
      [2, '2027-05-11', 'Second'],
      [3, '2027-05-12', 'Third'],
    ]);
    expect((await journal.getTrip('tibet'))!.startDate).toBe('2027-05-10');
    expect((await journal.getTrip('tibet'))!.dates).toBe('10 May 2027 — 12 May 2027');
  });
});
