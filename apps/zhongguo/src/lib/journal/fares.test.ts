import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { createJournal } from './index';
import { addCity, addPlan, addPlanDay, addProvince, resetDatabase } from './seed.test-helper';

const journal = createJournal(env);

beforeEach(resetDatabase);

const search = (airport: string, price: number | null, outbound: string) =>
  env.DB.prepare(
    `INSERT INTO flight_searches (airport, stops, price, outbound_date, return_date, response) VALUES (?, 'nostop', ?, ?, '2027-05-08', '{}')`,
  )
    .bind(airport, price, outbound)
    .run();

describe('Fare data', () => {
  it('gives the visible plans, the priced searches and the Airport names', async () => {
    const yunnan = await addProvince('Yunnan', '云南');
    const kunming = await addCity('Kunming', yunnan, { nameZh: '昆明' });
    const plan = await addPlan({ slug: 'yunnan', title: 'Yunnan' });
    await addPlanDay(plan, kunming, 1);
    await addPlan({ slug: 'hidden', visible: false });
    await env.DB.prepare('INSERT INTO airports (code, city_id, direct_weekdays) VALUES (?, ?, ?)').bind('KMG', kunming, 0).run();
    await search('KMG', 612, '2027-05-01');
    await search('KMG', null, '2027-05-02');

    const data = await journal.getFareData();

    expect(data.plans.map((p) => [p.slug, p.zh, p.gateways])).toEqual([['yunnan', '云南', [{ code: 'KMG', directWeekdays: 0 }]]]);
    expect(data.searches.map((s) => [s.airport, s.price, s.outbound_date])).toEqual([['KMG', 612, '2027-05-01']]);
    expect(data.airports).toEqual([{ code: 'KMG', name: 'Kunming' }]);
  });
});
