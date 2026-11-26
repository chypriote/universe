import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { createJournal } from './index';
import { addCity, addPlan, addPlanDay, addProvince, addTrip, resetDatabase } from './seed.test-helper';

const journal = createJournal(env);

beforeEach(resetDatabase);

async function cities() {
  const yunnan = await addProvince('Yunnan');
  const sichuan = await addProvince('Sichuan');
  return {
    kunming: await addCity('Kunming', yunnan),
    dali: await addCity('Dali', yunnan),
    chengdu: await addCity('Chengdu', sichuan),
    yunnan,
  };
}

const titles = async (slug: string) => (await journal.getAdminPlan(slug))!.days.map((day) => [day.number, day.title]);

describe('Plans admin', () => {
  it('lists every plan, hidden ones too, with its switches and number of Days and Photos', async () => {
    const { kunming } = await cities();
    const open = await addPlan({ slug: 'yunnan', title: 'Yunnan' });
    await addPlanDay(open, kunming, 1);
    await addPlan({ slug: 'tibet', title: 'Tibet', visible: false, searchFlights: false });

    expect(await journal.listAdminPlans()).toEqual([
      { slug: 'tibet', title: 'Tibet', visible: false, searchFlights: false, days: 0, photos: 0 },
      { slug: 'yunnan', title: 'Yunnan', visible: true, searchFlights: true, days: 1, photos: 0 },
    ]);
  });

  it('creates a plan with a slug from its title, visible with Search flights on', async () => {
    expect(await journal.createPlan('  Jiangnan Autumn!  ')).toEqual({ ok: true, slug: 'jiangnan-autumn' });

    expect(await journal.listAdminPlans()).toEqual([
      { slug: 'jiangnan-autumn', title: 'Jiangnan Autumn!', visible: true, searchFlights: true, days: 0, photos: 0 },
    ]);
  });

  it('refuses an empty title and a slug a plan or a Trip already has', async () => {
    await addPlan({ slug: 'yunnan' });
    await addTrip({ slug: 'sichuan' });

    expect(await journal.createPlan('   ')).toEqual({ ok: false, error: 'invalid-title' });
    expect(await journal.createPlan('云南')).toEqual({ ok: false, error: 'invalid-title' });
    expect(await journal.createPlan('Yunnan')).toEqual({ ok: false, error: 'slug-taken' });
    expect(await journal.createPlan('Sichuan')).toEqual({ ok: false, error: 'slug-taken' });
  });

  it('switches a plan on and off the site and its flight search on and off', async () => {
    await addPlan({ slug: 'yunnan' });

    expect(await journal.setPlanVisible('yunnan', false)).toEqual({ ok: true });
    expect(await journal.getPlan('yunnan')).toBeNull();
    expect(await journal.setPlanSearchFlights('yunnan', false)).toEqual({ ok: true });
    expect((await journal.listAdminPlans())[0]).toMatchObject({ visible: false, searchFlights: false });
    expect(await journal.setPlanVisible('nope', true)).toEqual({ ok: false, error: 'unknown-plan' });
    expect(await journal.setPlanSearchFlights('nope', true)).toEqual({ ok: false, error: 'unknown-plan' });
  });

  it('adds Days at the end, numbered', async () => {
    const { kunming, dali } = await cities();
    await journal.createPlan('Yunnan');

    expect(await journal.addPlanDay('yunnan', { cityId: kunming, title: 'Arrive' })).toMatchObject({ ok: true });
    expect(await journal.addPlanDay('yunnan', { cityId: dali, title: 'Lake', notes: 'Erhai' })).toMatchObject({ ok: true });

    const plan = await journal.getAdminPlan('yunnan');
    expect(plan!.days.map((day) => [day.number, day.title, day.notes, day.city.name, day.province])).toEqual([
      [1, 'Arrive', '', 'Kunming', 'Yunnan'],
      [2, 'Lake', 'Erhai', 'Dali', 'Yunnan'],
    ]);
  });

  it('refuses a Day without a title, with an unknown City, or on an unknown plan', async () => {
    const { kunming } = await cities();
    await journal.createPlan('Yunnan');

    expect(await journal.addPlanDay('yunnan', { cityId: kunming, title: ' ' })).toEqual({ ok: false, error: 'invalid-title' });
    expect(await journal.addPlanDay('yunnan', { cityId: 999, title: 'x' })).toEqual({ ok: false, error: 'unknown-city' });
    expect(await journal.addPlanDay('nope', { cityId: kunming, title: 'x' })).toEqual({ ok: false, error: 'unknown-plan' });
  });

  it('edits the text, the main City and the route of a Day like a Trip Day', async () => {
    const { kunming, dali, chengdu } = await cities();
    const plan = await addPlan({ slug: 'yunnan' });
    const day = await addPlanDay(plan, kunming, 1, { title: 'Old' });

    expect(await journal.editPlanDay({ dayId: day, title: ' New ', notes: 'Notes' })).toEqual({ ok: true });
    expect(await journal.editPlanDay({ dayId: day, cityId: dali, routeCityIds: [kunming, dali, chengdu] })).toEqual({ ok: true });

    const [edited] = (await journal.getAdminPlan('yunnan'))!.days;
    expect(edited).toMatchObject({ title: 'New', notes: 'Notes', city: { id: dali, name: 'Dali' } });
    expect(edited.route.map((city) => city.name)).toEqual(['Kunming', 'Dali', 'Chengdu']);
    expect((await journal.getPlan('yunnan'))!.days[0].cities.map((city) => [city.name, city.main])).toEqual([
      ['Kunming', false],
      ['Dali', true],
      ['Chengdu', false],
    ]);
    expect(await journal.editPlanDay({ dayId: day, title: '' })).toEqual({ ok: false, error: 'invalid-title' });
    expect(await journal.editPlanDay({ dayId: day, cityId: kunming })).toEqual({ ok: true });
    expect(await journal.editPlanDay({ dayId: 999, title: 'x' })).toEqual({ ok: false, error: 'unknown-day' });
  });

  it('deletes a Day with what hangs off it and numbers the others again', async () => {
    const { kunming } = await cities();
    const plan = await addPlan({ slug: 'yunnan' });
    await addPlanDay(plan, kunming, 1, { title: 'A' });
    const middle = await addPlanDay(plan, kunming, 2, { title: 'B' });
    await addPlanDay(plan, kunming, 3, { title: 'C' });
    await journal.editPlanDay({ dayId: middle, routeCityIds: [kunming, kunming] });

    expect(await journal.deletePlanDay(middle)).toEqual({ ok: true });

    expect(await titles('yunnan')).toEqual([[1, 'A'], [2, 'C']]);
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM plan_day_cities').first<{ n: number }>())!.n).toBe(0);
    expect(await journal.deletePlanDay(middle)).toEqual({ ok: false, error: 'unknown-day' });
  });

  it('moves a Day up and down, and does nothing at the ends', async () => {
    const { kunming } = await cities();
    const plan = await addPlan({ slug: 'yunnan' });
    const a = await addPlanDay(plan, kunming, 1, { title: 'A' });
    const b = await addPlanDay(plan, kunming, 2, { title: 'B' });
    const c = await addPlanDay(plan, kunming, 3, { title: 'C' });

    await journal.movePlanDay(c, 'up');
    expect(await titles('yunnan')).toEqual([[1, 'A'], [2, 'C'], [3, 'B']]);
    await journal.movePlanDay(a, 'down');
    expect(await titles('yunnan')).toEqual([[1, 'C'], [2, 'A'], [3, 'B']]);
    expect(await journal.movePlanDay(c, 'up')).toEqual({ ok: true });
    expect(await journal.movePlanDay(b, 'down')).toEqual({ ok: true });
    expect(await titles('yunnan')).toEqual([[1, 'C'], [2, 'A'], [3, 'B']]);
    expect(await journal.movePlanDay(999, 'up')).toEqual({ ok: false, error: 'unknown-day' });
  });

  it('gives the Season of each Day from its Province, in Day order', async () => {
    const { kunming, chengdu, yunnan } = await cities();
    const plan = await addPlan({ slug: 'yunnan' });
    await addPlanDay(plan, kunming, 1);
    await addPlanDay(plan, chengdu, 2);
    await journal.setProvinceSeason(yunnan, [4]);

    expect((await journal.getAdminPlan('yunnan'))!.seasons).toEqual([1 << 3, 0]);
    expect(await journal.getAdminPlan('nope')).toBeNull();
  });

  it('keeps a City in use by a plan Day from being deleted', async () => {
    const { kunming } = await cities();
    const plan = await addPlan({ slug: 'yunnan' });
    await addPlanDay(plan, kunming, 1);

    expect(await journal.deleteCity(kunming)).toEqual({ ok: false, error: 'in-use' });
  });
});
