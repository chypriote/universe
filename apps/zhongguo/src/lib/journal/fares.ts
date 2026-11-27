import { loadPlans } from '../../../scripts/plans.js';
import type { FareData } from './types';
import type { JournalEnv } from './journal';

/** What the Plan page needs to price its plans: the plans, the stored searches that have a price, the Airport names. */
export function buildFares(env: JournalEnv) {
  const rows = async <T>(sql: string) => (await env.DB.prepare(sql).all<T>()).results;

  async function getFareData(): Promise<FareData> {
    const [plans, searches, airports] = await Promise.all([
      loadPlans(rows),
      rows<FareData['searches'][number]>(
        'SELECT airport, stops, price, outbound_date, return_date, searched_on, created_at FROM flight_searches WHERE price IS NOT NULL',
      ),
      rows<FareData['airports'][number]>(
        'SELECT airports.code, cities.name FROM airports JOIN cities ON cities.id = airports.city_id',
      ),
    ]);
    return { plans, searches, airports };
  }

  return { getFareData };
}
