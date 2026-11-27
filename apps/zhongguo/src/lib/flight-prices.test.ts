import { describe, expect, it } from 'vitest';
import { flightPrices, hasSeasonStart, type FlightSearch } from './flight-prices';

const ALL_YEAR = 0b111111111111;
const APRIL = 1 << 3;
const TODAY = '2027-01-10';
const cities = new Map([['PEK', 'Beijing']]);
const plan = (overrides = {}) => ({
  slug: 'north',
  title: 'North',
  zh: '北京',
  seasons: Array(7).fill(ALL_YEAR),
  gateways: [{ code: 'PEK', directWeekdays: 0 }],
  ...overrides,
});
const search = (
  outbound: string,
  price: number | null,
  overrides: Partial<FlightSearch> = {},
): FlightSearch => ({
  airport: 'PEK',
  stops: 'stop',
  price,
  outbound_date: outbound,
  return_date: new Date(Date.parse(`${outbound}T12:00:00Z`) + 7 * 864e5).toISOString().slice(0, 10),
  searched_on: '2027-01-05',
  created_at: '2027-01-05 10:00:00',
  ...overrides,
});

describe('Plan page', () => {
  it('show the 3 cheapest Fare windows of a plan, cheapest first', () => {
    const result = flightPrices(
      [plan()],
      [
        search('2027-04-02', 700),
        search('2027-04-09', 500, { stops: 'nostop' }),
        search('2027-04-16', 600),
        search('2027-04-23', 650),
      ],
      cities,
      TODAY,
    );

    expect(result.plans[0].windows).toEqual([
      {
        airport: 'PEK',
        city: 'Beijing',
        outbound: '2027-04-09',
        return: '2027-04-16',
        price: 500,
        direct: true,
        searchedOn: '2027-01-05',
      },
      expect.objectContaining({ outbound: '2027-04-16', price: 600, direct: false }),
      expect.objectContaining({ outbound: '2027-04-23', price: 650 }),
    ]);
    expect(result.plans[0]).toMatchObject({ slug: 'north', title: 'North', zh: '北京', days: 7 });
  });

  it('show a plan with Search flights off without prices, even when prices are stored', () => {
    const result = flightPrices(
      [plan({ search: false })],
      [search('2027-04-09', 500)],
      cities,
      TODAY,
    );

    expect(result.plans[0].windows).toEqual([]);
    expect(result.plans[0].note).toBe('flight search off');
    expect(result.plans[0].fits.length).toBeGreaterThan(0);
  });

  it('use the newest search of a window, and skip searches with no price or of no window', () => {
    const result = flightPrices(
      [plan()],
      [
        search('2027-04-02', 400, { created_at: '2027-01-01 10:00:00' }),
        search('2027-04-02', 800, { created_at: '2027-01-06 10:00:00', stops: 'nostop' }),
        search('2027-04-09', null),
        search('2027-04-10', 100),
      ],
      cities,
      TODAY,
    );

    expect(result.plans[0].windows.map((window) => [window.outbound, window.price])).toEqual([
      ['2027-04-02', 800],
    ]);
  });

  it('order the plans by their cheapest window, plans with no price last by title', () => {
    const result = flightPrices(
      [
        plan({ slug: 'c', title: 'C' }),
        plan({ slug: 'a', title: 'A' }),
        plan({ slug: 'b', title: 'B', gateways: [{ code: 'XIY', directWeekdays: 0 }] }),
        plan({ slug: 'z', title: 'Z', gateways: [{ code: 'LXA', directWeekdays: 0 }] }),
      ],
      [search('2027-04-02', 700), search('2027-04-02', 500, { airport: 'XIY' })],
      cities,
      TODAY,
    );

    expect(result.plans.map((item) => [item.title, item.windows[0]?.city])).toEqual([
      ['B', 'XIY'],
      ['A', 'Beijing'],
      ['C', 'Beijing'],
      ['Z', undefined],
    ]);
  });

  it('give the runs of start dates that fit, inside the searched range', () => {
    // 5 April Days: one Day may fall outside April.
    const result = flightPrices(
      [plan({ seasons: Array(5).fill(APRIL) })],
      [search('2027-04-02', 500, { return_date: '2027-04-07' })],
      cities,
      TODAY,
    );

    expect(result).toMatchObject({ first: '2027-03-27', last: '2027-11-10' });
    expect(result.plans[0].fits).toEqual([{ from: '2027-03-31', to: '2027-04-27' }]);
  });

  it('show the Season runs of a plan with no price and say why, and leave out a plan with no Days', () => {
    const result = flightPrices(
      [
        plan({ title: 'Empty', seasons: [] }),
        plan({ title: 'Nowhere', gateways: [] }),
        plan({ title: 'Never', seasons: Array(7).fill(0) }),
        plan({ title: 'Waiting' }),
      ],
      [],
      cities,
      TODAY,
    );

    expect(result.plans.map((item) => [item.title, item.note, item.fits.length > 0])).toEqual([
      ['Never', 'no start date in season', false],
      ['Nowhere', 'no Airport in its Cities', true],
      ['Waiting', 'not searched yet', true],
    ]);
  });
});

describe('A Trip has a start date in season', () => {
  it('when one start date in the searched range fits it', () => {
    expect(hasSeasonStart(Array(5).fill(APRIL), TODAY)).toBe(true);
  });

  it('not when none fits, nor without Days', () => {
    expect(hasSeasonStart([APRIL, APRIL, 0, 0, 0], TODAY)).toBe(false);
    expect(hasSeasonStart([], TODAY)).toBe(false);
  });
});
