import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { buildCoverPhotos } from './cover-photos';
import {
  addCity,
  addDay,
  addPlan,
  addPlanDay,
  addProvince,
  addTrip,
  resetDatabase,
} from './seed.test-helper';
import { PLAN_TABLES, TRIP_TABLES, type TripTables } from './tables';

beforeEach(resetDatabase);

/** Two Trips or two plans, each with a Day, and the rules over them. */
async function setup(tables: TripTables) {
  const province = await addProvince('Xinjiang');
  const city = await addCity('Urumqi', province);
  const isPlan = tables.type === 'plan';
  const add = async (slug: string) => {
    const id = isPlan ? await addPlan({ slug }) : await addTrip({ slug });
    const dayId = isPlan ? await addPlanDay(id, city, 1) : await addDay(id, city, '2025-03-01');
    return { id, dayId };
  };
  const addSecondDay = (ownerId: number) =>
    isPlan ? addPlanDay(ownerId, city, 2) : addDay(ownerId, city, '2025-03-02');
  let next = 0;
  const photo = async (ownerId: number, width: number, height: number) => {
    const name = `photo-${next++}.jpg`;
    const sql = isPlan
      ? `INSERT INTO ${tables.photos} (${tables.fk}, name, width, height) VALUES (?, ?, ?, ?) RETURNING id`
      : `INSERT INTO ${tables.photos} (${tables.fk}, name, width, height, date) VALUES (?, ?, ?, ?, '2025-03-01') RETURNING id`;
    const row = await env.DB.prepare(sql)
      .bind(ownerId, name, width, height)
      .first<{ id: number }>();
    return row!.id;
  };
  const unknown = isPlan ? ('unknown-plan' as const) : ('unknown-trip' as const);
  return {
    rules: buildCoverPhotos(env, tables, unknown),
    unknown,
    main: await add('main'),
    other: await add('other'),
    addSecondDay,
    wide: (ownerId: number) => photo(ownerId, 4000, 3000),
    tall: (ownerId: number) => photo(ownerId, 3000, 4000),
  };
}

const coverOf = (tables: TripTables, id: number) =>
  env.DB.prepare(
    `SELECT cover_photo_id AS cover, cover_focus_x AS x, cover_focus_y AS y FROM ${tables.trips} WHERE id = ?`,
  )
    .bind(id)
    .first<{ cover: number | null; x: number; y: number }>();

describe.each([
  ['a Trip', TRIP_TABLES],
  ['a Trip plan', PLAN_TABLES],
])('cover, Highlight Photos and Day Photos of %s', (_name, tables) => {
  it('takes a landscape cover, resets its focus to the centre and refuses anything else', async () => {
    const s = await setup(tables);
    const wide = await s.wide(s.main.id);
    const tall = await s.tall(s.main.id);
    const foreign = await s.wide(s.other.id);

    expect(await s.rules.setCover('nowhere', wide)).toEqual({ ok: false, error: s.unknown });
    expect(await s.rules.setCover('main', 9999)).toEqual({ ok: false, error: 'unknown-photo' });
    expect(await s.rules.setCover('main', foreign)).toEqual({ ok: false, error: 'unknown-photo' });
    expect(await s.rules.setCover('main', tall)).toEqual({ ok: false, error: 'not-landscape' });
    expect(await s.rules.setCover('main', wide)).toEqual({ ok: true });
    await s.rules.setCoverFocus('main', 10, 90);
    expect(await s.rules.setCover('main', wide)).toEqual({ ok: true });

    expect(await coverOf(tables, s.main.id)).toEqual({ cover: wide, x: 50, y: 50 });
  });

  it('takes a focus from 0 to 100 once there is a cover', async () => {
    const s = await setup(tables);

    expect(await s.rules.setCoverFocus('nowhere', 1, 1)).toEqual({ ok: false, error: s.unknown });
    expect(await s.rules.setCoverFocus('main', 120, 30)).toEqual({
      ok: false,
      error: 'invalid-focus',
    });
    expect(await s.rules.setCoverFocus('main', Number.NaN, 30)).toEqual({
      ok: false,
      error: 'invalid-focus',
    });
    expect(await s.rules.setCoverFocus('main', 20, 30)).toEqual({ ok: false, error: 'no-cover' });
    await s.rules.setCover('main', await s.wide(s.main.id));
    expect(await s.rules.setCoverFocus('main', 20.4, 30)).toEqual({ ok: true });
    expect(await s.rules.setCoverFocus('main', 0, 100)).toEqual({ ok: true });
    expect(await s.rules.setCoverFocus('main', -1, 100)).toEqual({
      ok: false,
      error: 'invalid-focus',
    });

    expect(await coverOf(tables, s.main.id)).toMatchObject({ x: 0, y: 100 });
  });

  it('takes exactly 4 distinct portrait Highlight Photos of its own, in order', async () => {
    const s = await setup(tables);
    const ids = [
      await s.tall(s.main.id),
      await s.tall(s.main.id),
      await s.tall(s.main.id),
      await s.tall(s.main.id),
    ];
    const wide = await s.wide(s.main.id);
    const foreign = await s.tall(s.other.id);

    expect(await s.rules.setHighlightPhotos('nowhere', ids)).toEqual({
      ok: false,
      error: s.unknown,
    });
    expect(await s.rules.setHighlightPhotos('main', ids.slice(0, 3))).toEqual({
      ok: false,
      error: 'wrong-count',
    });
    expect(await s.rules.setHighlightPhotos('main', [ids[0], ids[0], ids[1], ids[2]])).toEqual({
      ok: false,
      error: 'duplicate-photo',
    });
    expect(await s.rules.setHighlightPhotos('main', [...ids.slice(0, 3), foreign])).toEqual({
      ok: false,
      error: 'unknown-photo',
    });
    expect(await s.rules.setHighlightPhotos('main', [...ids.slice(0, 3), wide])).toEqual({
      ok: false,
      error: 'not-portrait',
    });
    expect(await s.rules.setHighlightPhotos('main', [ids[3], ids[2], ids[1], ids[0]])).toEqual({
      ok: true,
    });
    expect(await s.rules.setHighlightPhotos('main', ids)).toEqual({ ok: true });

    const { results } = await env.DB.prepare(
      `SELECT photo_id FROM ${tables.highlights} WHERE ${tables.fk} = ? ORDER BY position`,
    )
      .bind(s.main.id)
      .all<{ photo_id: number }>();
    expect(results.map((row) => row.photo_id)).toEqual(ids);
  });

  it('puts Photos of its own on a Day in order, and a Photo that joins another Day leaves the first', async () => {
    const s = await setup(tables);
    const second = await s.addSecondDay(s.main.id);
    const a = await s.wide(s.main.id);
    const b = await s.wide(s.main.id);
    const foreign = await s.wide(s.other.id);

    expect(await s.rules.setDayPhotos(9999, [])).toEqual({ ok: false, error: 'unknown-day' });
    expect(await s.rules.setDayPhotos(s.main.dayId, [a, a])).toEqual({
      ok: false,
      error: 'duplicate-photo',
    });
    expect(await s.rules.setDayPhotos(s.main.dayId, [foreign])).toEqual({
      ok: false,
      error: 'unknown-photo',
    });
    expect(await s.rules.setDayPhotos(s.main.dayId, [b, a])).toEqual({ ok: true });
    expect(await s.rules.setDayPhotos(second, [b])).toEqual({ ok: true });

    const onDay = async (dayId: number) =>
      (
        await env.DB.prepare(
          `SELECT photo_id FROM ${tables.dayPhotos} WHERE day_id = ? ORDER BY position`,
        )
          .bind(dayId)
          .all<{ photo_id: number }>()
      ).results.map((row) => row.photo_id);
    expect(await onDay(s.main.dayId)).toEqual([a]);
    expect(await onDay(second)).toEqual([b]);
  });
});
