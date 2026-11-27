import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { createJournal } from './index';
import {
  addActivity,
  addCity,
  addPlan,
  addPlanDay,
  addPlanPhoto,
  addProvince,
  addTrip,
  resetDatabase,
} from './seed.test-helper';

const journal = createJournal(env);

beforeEach(resetDatabase);

async function plan() {
  const yunnan = await addProvince('Yunnan');
  const kunming = await addCity('Kunming', yunnan);
  const dali = await addCity('Dali', yunnan);
  const planId = await addPlan({ slug: 'yunnan-winter', title: 'Yunnan winter' });
  const one = await addPlanDay(planId, kunming, 1, { title: 'Arrive', notes: 'Rest' });
  const two = await addPlanDay(planId, dali, 2, { title: 'Old town' });
  const three = await addPlanDay(planId, dali, 3, { title: 'Lake' });
  const pagodas = await addActivity('Three Pagodas', dali);
  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO plan_day_cities (day_id, position, city_id, main) VALUES (?, 1, ?, 0), (?, 2, ?, 1)',
    ).bind(two, kunming, two, dali),
    env.DB.prepare(
      'INSERT INTO plan_day_activities (day_id, position, activity_id) VALUES (?, 1, ?)',
    ).bind(two, pagodas),
    env.DB.prepare(
      "INSERT INTO plan_day_train_rides (day_id, position, outgoing_city, destination_city, time_of_day, departure_time, arrival_time, duration_minutes) VALUES (?, 1, 'Kunming', 'Dali', 'morning', '08:00', '10:00', 120)",
    ).bind(two),
  ]);
  await addPlanPhoto(planId, one, 'plan.jpg');
  return { one, two, three, kunming, dali };
}

describe('Creating a Trip', () => {
  it('copies the ticked Plan Days as dated Days in plan order, with Cities, Activities and train rides', async () => {
    const { one, three, two } = await plan();

    const result = await journal.createTrip({
      title: 'Yunnan, my way',
      startDate: '2027-01-30',
      planDayIds: [three, one, two],
    });

    expect(result).toEqual({ ok: true, slug: 'yunnan-my-way' });
    const detail = (await journal.getAdminTrip('yunnan-my-way'))!;
    expect(detail.visible).toBe(false);
    expect(detail.days.map((day) => [day.date, day.title, day.notes, day.city.name])).toEqual([
      ['2027-01-30', 'Arrive', 'Rest', 'Kunming'],
      ['2027-01-31', 'Old town', '', 'Dali'],
      ['2027-02-01', 'Lake', '', 'Dali'],
    ]);
    expect(detail.days[1].route.map((city) => city.name)).toEqual(['Kunming', 'Dali']);
    const rows = async (sql: string) => (await env.DB.prepare(sql).all()).results;
    expect(
      await rows(
        'SELECT activities.name FROM day_activities JOIN activities ON activities.id = activity_id',
      ),
    ).toEqual([{ name: 'Three Pagodas' }]);
    expect(await rows('SELECT COUNT(*) AS total FROM activities')).toEqual([{ total: 1 }]);
    expect(await rows('SELECT outgoing_city, duration_minutes FROM day_train_rides')).toEqual([
      { outgoing_city: 'Kunming', duration_minutes: 120 },
    ]);
    expect(await rows('SELECT main FROM day_cities ORDER BY position')).toEqual([
      { main: 0 },
      { main: 1 },
    ]);
  });

  it('sets the Trip dates, copies no Photos and leaves the plan as it was', async () => {
    const { one, two } = await plan();

    await journal.createTrip({ title: 'Short', startDate: '2027-03-01', planDayIds: [one, two] });

    const trip = await env.DB.prepare('SELECT start_date, end_date FROM trips').first();
    expect(trip).toEqual({ start_date: '2027-03-01', end_date: '2027-03-02' });
    expect((await journal.getAdminTrip('short'))!.photos).toEqual([]);
    const original = (await journal.getAdminPlan('yunnan-winter'))!;
    expect(original.days).toHaveLength(3);
    expect(original.photos).toHaveLength(1);
    expect(original.days[0].photoIds).toHaveLength(1);
  });

  it('makes an empty Trip when no Day is ticked', async () => {
    await plan();

    expect(
      await journal.createTrip({ title: 'Blank', startDate: '2027-03-01', planDayIds: [] }),
    ).toEqual({ ok: true, slug: 'blank' });

    expect((await journal.getAdminTrip('blank'))!.days).toEqual([]);
  });

  it('refuses a blank title, a bad date, a taken slug (Trip or plan) and an unknown Plan Day, changing nothing', async () => {
    await plan();
    await addTrip({ slug: 'taken' });

    expect(
      await journal.createTrip({ title: '  ', startDate: '2027-03-01', planDayIds: [] }),
    ).toEqual({ ok: false, error: 'invalid-title' });
    expect(
      await journal.createTrip({ title: 'X', startDate: '2027-02-30', planDayIds: [] }),
    ).toEqual({ ok: false, error: 'invalid-date' });
    expect(
      await journal.createTrip({ title: 'Taken', startDate: '2027-03-01', planDayIds: [] }),
    ).toEqual({ ok: false, error: 'slug-taken' });
    expect(
      await journal.createTrip({ title: 'Yunnan winter', startDate: '2027-03-01', planDayIds: [] }),
    ).toEqual({ ok: false, error: 'slug-taken' });
    expect(
      await journal.createTrip({ title: 'New', startDate: '2027-03-01', planDayIds: [9999] }),
    ).toEqual({ ok: false, error: 'unknown-plan-day' });

    expect((await journal.listAdminTrips()).map((trip) => trip.slug)).toEqual(['taken']);
  });

  it('takes a slug that a plan cannot take afterwards', async () => {
    await journal.createTrip({ title: 'Silk Road', startDate: '2027-03-01', planDayIds: [] });

    expect(await journal.createPlan('Silk Road')).toEqual({ ok: false, error: 'slug-taken' });
  });
});
