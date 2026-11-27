import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { createJournal } from './index';
import {
  addCity,
  addDay,
  addPhoto,
  addPlan,
  addPlanDay,
  addPlanPhoto,
  addProvince,
  addTrip,
  resetDatabase,
} from './seed.test-helper';

const journal = createJournal(env);

beforeEach(resetDatabase);

async function yunnanPlan() {
  const yunnan = await addProvince('Yunnan', '云南');
  const kunming = await addCity('Kunming', yunnan, { major: true, nameZh: '昆明' });
  const dali = await addCity('Dali', yunnan, { major: true, nameZh: '大理' });
  const plan = await addPlan({ slug: 'yunnan', title: 'Yunnan' });
  const day1 = await addPlanDay(plan, kunming, 1, { title: 'Arrive' });
  await addPlanDay(plan, dali, 2, { title: 'Erhai lake' });
  return { plan, day1, kunming, dali, yunnan };
}

describe('Trip plans', () => {
  it('shows a plan with numbered Days and no dates', async () => {
    await yunnanPlan();

    const page = await journal.getPlan('yunnan');

    expect(page!.days.map((day) => [day.number, day.title, day.date, day.city])).toEqual([
      [1, 'Arrive', '', 'Kunming'],
      [2, 'Erhai lake', '', 'Dali'],
    ]);
    expect(page!.dates).toBe('');
    expect(page!.startDate).toBe('');
    expect(page!.description).toBe('A 2-day itinerary across Kunming, Dali.');
  });

  it('lists plan cards that link to /plans', async () => {
    await yunnanPlan();

    const cards = await journal.listPlanCards();

    expect(cards.map((card) => [card.slug, card.type, card.link, card.dates])).toEqual([
      ['yunnan', 'plan', '/plans/yunnan', '2 days'],
    ]);
    expect(cards[0].provinces).toEqual(['Yunnan']);
  });

  it('keeps plans out of the Trips, the Gallery and the Visited Provinces', async () => {
    const { plan, day1, kunming } = await yunnanPlan();
    await addPlanPhoto(plan, day1, 'kunming.jpg', kunming);

    expect(await journal.listTripCards()).toEqual([]);
    expect(await journal.getTrip('yunnan')).toBeNull();
    expect(await journal.getGallery()).toEqual({ photos: [], provinces: [], cities: [] });
    expect(await journal.getHomeMap()).toEqual([]);
  });

  it('keeps Trips out of the plans', async () => {
    const sichuan = await addProvince('Sichuan');
    const chengdu = await addCity('Chengdu', sichuan);
    const trip = await addTrip({ slug: 'sichuan', start: '2999-01-01', end: '2999-01-02' });
    await addDay(trip, chengdu, '2999-01-01', { position: 1 });

    expect(await journal.listPlanCards()).toEqual([]);
    expect(await journal.getPlan('sichuan')).toBeNull();
  });

  it('hides a hidden plan', async () => {
    await addPlan({ slug: 'secret', visible: false });

    expect(await journal.getPlan('secret')).toBeNull();
    expect(await journal.listPlanCards()).toEqual([]);
  });

  it('shows the Photos of its Days, from the plan bucket path', async () => {
    const { plan, day1, kunming } = await yunnanPlan();
    await addPlanPhoto(plan, day1, 'kunming.jpg', kunming);

    const page = await journal.getPlan('yunnan');

    expect(page!.days[0].photos.map((photo) => [photo.url, photo.caption])).toEqual([
      ['https://photos.test/trips/yunnan/kunming.jpg', 'Kunming'],
    ]);
  });

  it('keeps a Trip of the same Cities independent', async () => {
    const { kunming } = await yunnanPlan();
    const trip = await addTrip({ slug: 'trip' });
    await addDay(trip, kunming, '2025-03-01', { position: 1 });
    await addPhoto(trip, '2025-03-01');

    expect((await journal.getTrip('trip'))!.days).toHaveLength(1);
    expect((await journal.getPlan('yunnan'))!.days).toHaveLength(2);
  });
});
