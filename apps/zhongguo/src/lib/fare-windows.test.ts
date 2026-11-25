import { describe, expect, it } from 'vitest';
import { fareWindows, fitsPlan, searchOrder } from '../../scripts/fare-windows.js';

const months = (...list: number[]) => list.reduce((bits, month) => bits | (1 << (month - 1)), 0);
const days = (count: number, season: number) => Array.from({ length: count }, () => season);
const MONDAY = 1;
const THURSDAY = 1 << 3;
const EVERY_DAY = 0b1111111;

describe('A start date fits a plan', () => {
  it('when at most 20% of its Days fall outside their Season', () => {
    const april = months(4);
    // 10 Days: 2 in May is 20%, 3 is too many.
    expect(fitsPlan(days(10, april), '2027-04-23')).toBe(true);
    expect(fitsPlan(days(10, april), '2027-04-24')).toBe(false);
  });

  it('follows each Day to its own Province', () => {
    const plan = [...days(7, months(5)), ...days(7, months(6))];

    expect(fitsPlan(plan, '2027-05-25')).toBe(true);
    expect(fitsPlan(plan, '2027-05-04')).toBe(false);
  });

  it('never when the Province has no Season', () => {
    expect(fitsPlan(days(5, 0), '2027-05-01')).toBe(false);
  });
});

describe('Fare windows', () => {
  const spring = months(3, 4, 5, 6);

  it('start on Friday for an Airport with daily or no direct flights, for as many days as the plan', () => {
    const windows = fareWindows(
      [{ slug: 'south', seasons: days(15, spring), gateways: [{ code: 'PVG', directWeekdays: EVERY_DAY }, { code: 'KMG', directWeekdays: 0 }] }],
      '2027-01-10',
    );

    expect(windows[0]).toEqual({ slug: 'south', airport: 'PVG', outbound: '2027-04-02', return: '2027-04-17' });
    expect(windows.every((window) => new Date(`${window.outbound}T12:00:00Z`).getUTCDay() === 5)).toBe(true);
    expect(new Set(windows.map((window) => window.airport))).toEqual(new Set(['PVG', 'KMG']));
  });

  it('start on the direct weekdays, for whole weeks, when an Airport has some', () => {
    const windows = fareWindows([{ slug: 'xian', seasons: days(10, spring), gateways: [{ code: 'XIY', directWeekdays: THURSDAY | MONDAY }] }], '2027-01-10');

    expect(windows.slice(0, 2)).toEqual([
      { slug: 'xian', airport: 'XIY', outbound: '2027-03-29', return: '2027-04-12' },
      { slug: 'xian', airport: 'XIY', outbound: '2027-04-01', return: '2027-04-15' },
    ]);
  });

  it('begin two weeks from today once that is after 27 March 2027, and end 10 months from today', () => {
    const windows = fareWindows([{ slug: 'any', seasons: days(7, months(...Array.from({ length: 12 }, (_, index) => index + 1))), gateways: [{ code: 'PEK', directWeekdays: EVERY_DAY }] }], '2027-06-01');

    expect(windows[0].outbound).toBe('2027-06-18');
    expect(windows.at(-1)!.outbound).toBe('2028-03-31');
  });

  it('keep only the starts that fit the plan', () => {
    const windows = fareWindows([{ slug: 'april', seasons: days(7, months(4)), gateways: [{ code: 'PEK', directWeekdays: 0 }] }], '2027-01-10');

    expect(windows.map((window) => window.outbound)).toEqual(['2027-04-02', '2027-04-09', '2027-04-16', '2027-04-23']);
  });

  it('are none for a plan with no Days or no Gateway', () => {
    expect(fareWindows([{ slug: 'empty', seasons: [], gateways: [{ code: 'PEK', directWeekdays: 0 }] }], '2027-01-10')).toEqual([]);
    expect(fareWindows([{ slug: 'nowhere', seasons: days(7, spring), gateways: [] }], '2027-01-10')).toEqual([]);
  });
});

describe('Search order', () => {
  const window = (outbound: string, slug = 'a') => ({ slug, airport: 'PEK', outbound, return: '2027-05-01' });

  it('searches each window once: never searched first, then the oldest search', () => {
    const lastSearched = new Map([
      ['PEK|2027-04-02|2027-05-01', '2026-11-20 10:00:00'],
      ['PEK|2027-04-09|2027-05-01', '2026-11-01 10:00:00'],
    ]);

    const order = searchOrder([window('2027-04-02'), window('2027-04-09'), window('2027-04-16'), window('2027-04-16', 'b')], lastSearched);

    expect(order.map((item) => item.outbound)).toEqual(['2027-04-16', '2027-04-09', '2027-04-02']);
  });
});
