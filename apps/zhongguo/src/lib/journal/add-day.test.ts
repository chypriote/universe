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

    const result = await journal.addDay('tibet', {
      date: '2027-05-10',
      cityId: lhasa,
      title: 'Arrival',
      notes: 'Rest',
    });

    expect(result).toEqual({ ok: true, dayId: expect.any(Number) });
    const page = await journal.getTrip('tibet');
    expect(page!.days.map((day) => [day.number, day.date, day.title, day.notes, day.city])).toEqual(
      [[1, '2027-05-10', 'Arrival', 'Rest', 'Lhasa']],
    );
    expect(page!.startDate).toBe('2027-05-10');
    expect(page!.dates).toBe('10 May — 10 May 2027');
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
    expect((await journal.getTrip('tibet'))!.dates).toBe('10 May — 12 May 2027');
  });
});

describe('Adding a Day, refused', () => {
  it('refuses a taken date, an unknown City, a blank title, an invalid date and an unknown Trip, changing nothing', async () => {
    const { lhasa } = await planTrip();
    await journal.addDay('tibet', { date: '2027-05-10', cityId: lhasa, title: 'Arrival' });

    expect(
      await journal.addDay('tibet', { date: '2027-05-10', cityId: lhasa, title: 'Again' }),
    ).toEqual({ ok: false, error: 'date-taken' });
    expect(await journal.addDay('tibet', { date: '2027-05-11', cityId: 9999, title: 'x' })).toEqual(
      { ok: false, error: 'unknown-city' },
    );
    expect(
      await journal.addDay('tibet', { date: '2027-05-11', cityId: lhasa, title: '  ' }),
    ).toEqual({ ok: false, error: 'invalid-title' });
    expect(
      await journal.addDay('tibet', { date: '2027-02-30', cityId: lhasa, title: 'x' }),
    ).toEqual({ ok: false, error: 'invalid-date' });
    expect(
      await journal.addDay('tibet', { date: '11/05/2027', cityId: lhasa, title: 'x' }),
    ).toEqual({ ok: false, error: 'invalid-date' });
    expect(await journal.addDay('nope', { date: '2027-05-11', cityId: lhasa, title: 'x' })).toEqual(
      { ok: false, error: 'unknown-trip' },
    );

    const admin = (await journal.getAdminTrip('tibet'))!;
    expect(admin.days.map((day) => day.title)).toEqual(['Arrival']);
  });

  it('refuses a date taken by a Hidden Day', async () => {
    const { trip, lhasa } = await planTrip();
    await addDay(trip, lhasa, '2027-05-10', { position: 1, visible: false });

    expect(
      await journal.addDay('tibet', { date: '2027-05-10', cityId: lhasa, title: 'x' }),
    ).toEqual({ ok: false, error: 'date-taken' });
  });
});

describe('Adding a Day to a Trip with Days', () => {
  it('lands in the middle in date order, renumbering the others and keeping their Photos', async () => {
    const { trip, lhasa, chengdu } = await planTrip();
    const first = await addDay(trip, lhasa, '2027-05-10', { position: 1, title: 'First' });
    await addDay(trip, lhasa, '2027-05-12', { position: 2, title: 'Last' });
    const kept = await addPhoto(trip, '2027-05-12', { name: 'last.jpg' });

    const result = await journal.addDay('tibet', {
      date: '2027-05-11',
      cityId: chengdu,
      title: 'Middle',
    });

    expect(result.ok).toBe(true);
    const admin = (await journal.getAdminTrip('tibet'))!;
    expect(admin.days.map((day) => [day.number, day.date, day.title])).toEqual([
      [1, '2027-05-10', 'First'],
      [2, '2027-05-11', 'Middle'],
      [3, '2027-05-12', 'Last'],
    ]);
    expect(admin.days[0].id).toBe(first);
    expect(admin.days[2].photoIds).toEqual([kept]);
  });

  it('moves the Trip dates out to a Day before the first and after the last', async () => {
    const { trip, lhasa } = await planTrip();
    await addDay(trip, lhasa, '2027-05-10', { position: 1 });

    await journal.addDay('tibet', { date: '2027-05-01', cityId: lhasa, title: 'Before' });
    await journal.addDay('tibet', { date: '2027-05-20', cityId: lhasa, title: 'After' });

    expect((await journal.getTrip('tibet'))!.dates).toBe('1 May — 20 May 2027');
    expect((await journal.getAdminTrip('tibet'))!.days.map((day) => day.title)).toEqual([
      'Before',
      'Day on 2027-05-10',
      'After',
    ]);
  });

  it('takes the Photos of the Trip with that date and no Day, and leaves the others alone', async () => {
    const { trip, lhasa } = await planTrip();
    await addDay(trip, lhasa, '2027-05-10', { position: 1 });
    const b = await addPhoto(trip, '2027-05-11', { name: 'b.jpg' });
    const a = await addPhoto(trip, '2027-05-11', { name: 'a.jpg' });
    await addPhoto(trip, '2027-05-13', { name: 'other-date.jpg' });
    const onDay = await addPhoto(trip, '2027-05-10', { name: 'on-day.jpg' });
    const other = await addTrip({ slug: 'other' });
    await addPhoto(other, '2027-05-11', { name: 'foreign.jpg' });

    const result = await journal.addDay('tibet', {
      date: '2027-05-11',
      cityId: lhasa,
      title: 'New',
    });

    const page = await journal.getTrip('tibet');
    expect(names(page!.days[1].photos)).toEqual(['a.jpg', 'b.jpg']);
    const admin = (await journal.getAdminTrip('tibet'))!;
    expect(admin.days[1].photoIds).toEqual([a, b]);
    expect(admin.days[0].photoIds).toEqual([onDay]);
    expect(result).toMatchObject({ ok: true });
    expect(admin.photos.find((photo) => photo.name === 'other-date.jpg')!.day).toBeNull();
  });

  it('keeps a Hidden Trip hidden', async () => {
    await addTrip({ slug: 'secret', start: null, end: null, visible: false });
    const province = await addProvince('Yunnan');
    const city = await addCity('Dali', province);

    await journal.addDay('secret', { date: '2027-06-01', cityId: city, title: 'Hidden' });

    expect(await journal.getTrip('secret')).toBeNull();
    expect((await journal.listTripCards()).map((card) => card.slug)).not.toContain('secret');
    expect((await journal.getAdminTrip('secret'))!.visible).toBe(false);
  });
});
