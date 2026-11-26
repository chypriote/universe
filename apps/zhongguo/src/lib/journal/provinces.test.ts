import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { createJournal } from './index';
import { addCity, addProvince, resetDatabase } from './seed.test-helper';

const journal = createJournal(env);

beforeEach(resetDatabase);

async function world() {
  const sichuan = await addProvince('Sichuan', '四川');
  const gansu = await addProvince('Gansu', '甘肃');
  const chengdu = await addCity('Chengdu', sichuan, { nameZh: '成都' });
  const leshan = await addCity('Leshan', sichuan);
  return { sichuan, gansu, chengdu, leshan };
}

describe('Provinces of the admin', () => {
  it('list every Province by name with its Season and its Cities with their Airports', async () => {
    const { sichuan, chengdu } = await world();
    await journal.setProvinceSeason(sichuan, [10, 4, 5]);
    await journal.setAirport({ code: 'tfu', cityId: chengdu, directWeekdays: [1] });

    expect(await journal.listAdminProvinces()).toEqual([
      { id: expect.any(Number), name: 'Gansu', nameZh: '甘肃', season: [], cities: [] },
      {
        id: sichuan,
        name: 'Sichuan',
        nameZh: '四川',
        season: [4, 5, 10],
        cities: [
          { id: chengdu, name: 'Chengdu', nameZh: '成都', lng: 100, lat: 30, airports: [{ code: 'TFU', directWeekdays: [1] }] },
          { id: expect.any(Number), name: 'Leshan', nameZh: 'Leshan', lng: 100, lat: 30, airports: [] },
        ],
      },
    ]);
  });
});

describe('Province Season', () => {
  it('replaces the months, and can be emptied', async () => {
    const { sichuan } = await world();
    await journal.setProvinceSeason(sichuan, [3, 4]);

    expect(await journal.setProvinceSeason(sichuan, [])).toEqual({ ok: true });
    expect((await journal.listAdminProvinces()).find((province) => province.id === sichuan)?.season).toEqual([]);
  });

  it('refuses an unknown Province and a month out of range', async () => {
    const { sichuan } = await world();

    expect(await journal.setProvinceSeason(9999, [1])).toEqual({ ok: false, error: 'unknown-province' });
    expect(await journal.setProvinceSeason(sichuan, [13])).toEqual({ ok: false, error: 'invalid-months' });
    expect(await journal.setProvinceSeason(sichuan, [0])).toEqual({ ok: false, error: 'invalid-months' });
    expect(await journal.setProvinceSeason(sichuan, [1.5])).toEqual({ ok: false, error: 'invalid-months' });
  });
});

describe('Airports', () => {
  it('adds an Airport, then saves its direct weekdays', async () => {
    const { chengdu } = await world();

    expect(await journal.setAirport({ code: ' tfu ', cityId: chengdu, directWeekdays: [] })).toEqual({
      ok: true,
      airport: { code: 'TFU', directWeekdays: [] },
    });
    expect(await journal.setAirport({ code: 'TFU', cityId: chengdu, directWeekdays: [4, 1] })).toEqual({
      ok: true,
      airport: { code: 'TFU', directWeekdays: [1, 4] },
    });
  });

  it('refuses a bad code, an unknown City, a code of another City and a bad weekday', async () => {
    const { chengdu, leshan } = await world();
    await journal.setAirport({ code: 'TFU', cityId: chengdu, directWeekdays: [] });

    expect(await journal.setAirport({ code: 'TF', cityId: chengdu, directWeekdays: [] })).toEqual({ ok: false, error: 'invalid-code' });
    expect(await journal.setAirport({ code: 'CTU', cityId: 9999, directWeekdays: [] })).toEqual({ ok: false, error: 'unknown-city' });
    expect(await journal.setAirport({ code: 'TFU', cityId: leshan, directWeekdays: [] })).toEqual({ ok: false, error: 'code-taken' });
    expect(await journal.setAirport({ code: 'CTU', cityId: chengdu, directWeekdays: [8] })).toEqual({ ok: false, error: 'invalid-weekdays' });
  });

  it('removes an Airport, and refuses an unknown one', async () => {
    const { chengdu } = await world();
    await journal.setAirport({ code: 'TFU', cityId: chengdu, directWeekdays: [] });

    expect(await journal.deleteAirport('tfu')).toEqual({ ok: true });
    expect(await journal.deleteAirport('TFU')).toEqual({ ok: false, error: 'unknown-airport' });
  });

  it('go with their City when it is deleted', async () => {
    const { chengdu } = await world();
    await journal.setAirport({ code: 'TFU', cityId: chengdu, directWeekdays: [] });

    expect(await journal.deleteCity(chengdu)).toEqual({ ok: true });
    expect(await journal.deleteAirport('TFU')).toEqual({ ok: false, error: 'unknown-airport' });
  });
});
