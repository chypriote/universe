import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { createCatalog, UnauthorizedError } from './index';
import type { Catalog } from './types';

let catalog: Catalog;
let token: string;

beforeEach(async () => {
	catalog = createCatalog(env);
	const login = await catalog.login('test-password');
	if (!login.ok) throw new Error('login failed in setup');
	token = login.token;
	await env.DB.batch([
		env.DB.prepare('DELETE FROM bird_song'),
		env.DB.prepare('DELETE FROM sighting'),
		env.DB.prepare('DELETE FROM picture'),
		env.DB.prepare('DELETE FROM bird'),
		env.DB.prepare('DELETE FROM habitat'),
		env.DB.prepare('DELETE FROM song')
	]);
});

/** Fixture: rows go in directly, so these tests stand on the popup operations alone. */
async function seedBird(
	opts: {
		name?: string;
		arrival?: string | null;
		notes?: string;
		habitat?: string;
		songs?: string[];
		seen?: boolean;
		roosted?: boolean;
		nest?: boolean;
		pictures?: string[];
	} = {}
) {
	const arrival = opts.arrival ?? null;
	const precision = arrival === null ? null : arrival.length === 4 ? 'year' : 'day';
	let habitatId: number | null = null;
	if (opts.habitat) {
		habitatId = (await env.DB.prepare('INSERT INTO habitat (name) VALUES (?) RETURNING id')
			.bind(opts.habitat)
			.first<{ id: number }>())!.id;
	}
	const bird = (await env.DB.prepare(
		`INSERT INTO bird (name, arrival, arrival_precision, habitat_id, notes, seen, roosted, nest)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
	)
		.bind(
			opts.name ?? 'Bird A',
			arrival,
			precision,
			habitatId,
			opts.notes ?? '',
			+!!opts.seen,
			+!!opts.roosted,
			+!!opts.nest
		)
		.first<{ id: number }>())!.id;
	for (const song of opts.songs ?? []) {
		const songId = (await env.DB.prepare('INSERT INTO song (name) VALUES (?) RETURNING id')
			.bind(song)
			.first<{ id: number }>())!.id;
		await env.DB.prepare('INSERT INTO bird_song (bird_id, song_id) VALUES (?, ?)')
			.bind(bird, songId)
			.run();
	}
	let position = 0;
	for (const key of opts.pictures ?? []) {
		await env.DB.prepare('INSERT INTO picture (bird_id, key, position) VALUES (?, ?, ?)')
			.bind(bird, key, position++)
			.run();
	}
	return bird;
}

const seenOf = async (id: number) => (await catalog.getBird(token, id))!.seen;

describe('getBird', () => {
	it('rejects a bad token with UnauthorizedError', async () => {
		const id = await seedBird();
		await expect(catalog.getBird('nope', id)).rejects.toBeInstanceOf(UnauthorizedError);
	});

	it('answers null for an unknown Bird', async () => {
		expect(await catalog.getBird(token, 999999)).toBeNull();
	});

	it('returns the whole popup view', async () => {
		const id = await seedBird({
			name: 'Bird A',
			arrival: '2021-05-06',
			notes: 'Some notes',
			habitat: 'Habitat One',
			songs: ['Song One', 'Song Two'],
			seen: true,
			roosted: true,
			nest: true,
			pictures: ['key-one', 'key-two']
		});
		const bird = (await catalog.getBird(token, id))!;
		expect(bird).toMatchObject({
			id,
			name: 'Bird A',
			arrival: '2021-05-06',
			habitat: 'Habitat One',
			songs: ['Song One', 'Song Two'],
			notes: 'Some notes',
			seen: true,
			flown: false,
			lost: false,
			roosted: true,
			nest: true,
			sightings: []
		});
		expect(bird.pictureIds).toHaveLength(2);
	});

	it('lists Pictures in order', async () => {
		const id = await seedBird({ pictures: ['k1', 'k2', 'k3'] });
		await env.DB.prepare("UPDATE picture SET position = 9 WHERE key = 'k1'").run();
		const bird = (await catalog.getBird(token, id))!;
		const rows = await env.DB.prepare('SELECT id, key FROM picture').all<{
			id: number;
			key: string;
		}>();
		const idOf = (key: string) => rows.results.find((r) => r.key === key)!.id;
		expect(bird.pictureIds).toEqual([idOf('k2'), idOf('k3'), idOf('k1')]);
	});

	it('has no Habitat, Arrival or Songs when the Bird has none', async () => {
		const id = await seedBird();
		expect(await catalog.getBird(token, id)).toMatchObject({
			arrival: null,
			habitat: null,
			songs: [],
			pictureIds: []
		});
	});
});

describe('addSighting', () => {
	it('rejects a bad token with UnauthorizedError', async () => {
		const id = await seedBird();
		await expect(catalog.addSighting('nope', id, '2024-01-02')).rejects.toBeInstanceOf(
			UnauthorizedError
		);
	});

	it('adds a Sighting with a day', async () => {
		const id = await seedBird();
		const result = await catalog.addSighting(token, id, '2024-01-02');
		expect(result.ok).toBe(true);
		const { sightings } = (await catalog.getBird(token, id))!;
		expect(sightings).toEqual([{ id: expect.any(Number), day: '2024-01-02' }]);
	});

	it('adds a Sighting without a day', async () => {
		const id = await seedBird();
		await catalog.addSighting(token, id);
		expect((await catalog.getBird(token, id))!.sightings).toEqual([
			{ id: expect.any(Number), day: null }
		]);
	});

	it('refuses an unknown Bird and a bad day', async () => {
		const id = await seedBird();
		expect(await catalog.addSighting(token, 999999, '2024-01-02')).toEqual({
			ok: false,
			error: 'not-found'
		});
		expect(await catalog.addSighting(token, id, 'yesterday')).toEqual({
			ok: false,
			error: 'bad-day'
		});
		expect(await catalog.addSighting(token, id, '2024-02-31')).toEqual({
			ok: false,
			error: 'bad-day'
		});
		expect((await catalog.getBird(token, id))!.sightings).toEqual([]);
	});

	it('sets Seen on the first Sighting', async () => {
		const id = await seedBird();
		expect(await seenOf(id)).toBe(false);
		await catalog.addSighting(token, id);
		expect(await seenOf(id)).toBe(true);
	});

	it('lists the newest day first and the unknown days last', async () => {
		const id = await seedBird();
		await catalog.addSighting(token, id);
		await catalog.addSighting(token, id, '2023-01-01');
		await catalog.addSighting(token, id, '2024-06-01');
		expect((await catalog.getBird(token, id))!.sightings.map((s) => s.day)).toEqual([
			'2024-06-01',
			'2023-01-01',
			null
		]);
	});
});

describe('setSightingDay', () => {
	async function oneSighting(day?: string) {
		const id = await seedBird();
		const added = await catalog.addSighting(token, id, day);
		if (!added.ok) throw new Error('setup');
		return { birdId: id, id: added.id };
	}

	it('rejects a bad token with UnauthorizedError', async () => {
		const s = await oneSighting();
		await expect(catalog.setSightingDay('nope', s.id, '2024-01-02')).rejects.toBeInstanceOf(
			UnauthorizedError
		);
	});

	it('changes the day', async () => {
		const s = await oneSighting('2024-01-02');
		expect(await catalog.setSightingDay(token, s.id, '2022-03-04')).toEqual({ ok: true });
		expect((await catalog.getBird(token, s.birdId))!.sightings[0].day).toBe('2022-03-04');
	});

	it('fills in an unknown day and clears a day', async () => {
		const s = await oneSighting();
		await catalog.setSightingDay(token, s.id, '2022-03-04');
		expect((await catalog.getBird(token, s.birdId))!.sightings[0].day).toBe('2022-03-04');
		await catalog.setSightingDay(token, s.id, null);
		expect((await catalog.getBird(token, s.birdId))!.sightings[0].day).toBeNull();
	});

	it('refuses an unknown Sighting and a bad day', async () => {
		const s = await oneSighting('2024-01-02');
		expect(await catalog.setSightingDay(token, 999999, null)).toEqual({
			ok: false,
			error: 'not-found'
		});
		expect(await catalog.setSightingDay(token, s.id, '2024-13-01')).toEqual({
			ok: false,
			error: 'bad-day'
		});
		expect((await catalog.getBird(token, s.birdId))!.sightings[0].day).toBe('2024-01-02');
	});
});

describe('deleteSighting', () => {
	it('rejects a bad token with UnauthorizedError', async () => {
		await expect(catalog.deleteSighting('nope', 1)).rejects.toBeInstanceOf(UnauthorizedError);
	});

	it('deletes the Sighting and keeps Seen on, even after the last one', async () => {
		const id = await seedBird();
		const a = await catalog.addSighting(token, id, '2024-01-02');
		const b = await catalog.addSighting(token, id, '2024-02-02');
		if (!a.ok || !b.ok) throw new Error('setup');
		expect(await catalog.deleteSighting(token, a.id)).toEqual({ ok: true });
		expect((await catalog.getBird(token, id))!.sightings.map((s) => s.id)).toEqual([b.id]);
		await catalog.deleteSighting(token, b.id);
		const bird = (await catalog.getBird(token, id))!;
		expect(bird.sightings).toEqual([]);
		expect(bird.seen).toBe(true);
	});

	it('refuses an unknown Sighting', async () => {
		expect(await catalog.deleteSighting(token, 999999)).toEqual({ ok: false, error: 'not-found' });
	});
});
