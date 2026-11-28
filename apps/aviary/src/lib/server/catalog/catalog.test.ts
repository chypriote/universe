import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { createCatalog } from './index';
import type { Catalog } from './types';

let catalog: Catalog;
let token: string;

/** Fake labels: each value equals its code name. */
const FAKE_LABELS = ['Aloft', 'Grounded', 'Nest', 'Seen', 'Flown', 'Lost', 'Roosted'];

async function seedLabels(codeNames: string[]) {
	await env.DB.prepare('DELETE FROM labels').run();
	if (codeNames.length === 0) return;
	await env.DB.batch(
		codeNames.map((name) =>
			env.DB.prepare('INSERT INTO labels (code_name, word) VALUES (?, ?)').bind(name, name)
		)
	);
}

beforeEach(async () => {
	await seedLabels(FAKE_LABELS);
	catalog = createCatalog(env);
	const login = await catalog.login('test-password');
	if (!login.ok) throw new Error('login failed in setup');
	token = login.token;
});

function base64url(bytes: Uint8Array | string) {
	const raw = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes;
	return btoa(String.fromCharCode(...raw))
		.replaceAll('+', '-')
		.replaceAll('/', '_')
		.replaceAll('=', '');
}

async function signJwt(payload: object, secret: string) {
	const head = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
	const body = base64url(JSON.stringify(payload));
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${head}.${body}`));
	return `${head}.${body}.${base64url(new Uint8Array(sig))}`;
}

describe('Owner login', () => {
	it('refuses a wrong password', async () => {
		expect(await catalog.login('nope')).toEqual({ ok: false, error: 'wrong-password' });
	});

	it('issues a token for the right password that verifies', async () => {
		const result = await catalog.login('test-password');
		expect(result.ok).toBe(true);
		if (result.ok) expect(await catalog.verifyToken(result.token)).toBe(true);
	});

	it('refuses every login when the secrets are not configured', async () => {
		const unset = createCatalog({ ...env, OWNER_PASSWORD: '', JWT_SECRET: '' });
		expect(await unset.login('')).toEqual({ ok: false, error: 'wrong-password' });
		expect(await unset.login('anything')).toEqual({ ok: false, error: 'wrong-password' });
	});

	it('rejects garbage, tampered, wrongly signed and expired tokens', async () => {
		const exp = Math.floor(Date.now() / 1000);
		expect(await catalog.verifyToken('')).toBe(false);
		expect(await catalog.verifyToken('a.b.c')).toBe(false);
		expect(await catalog.verifyToken(token.slice(0, -2) + 'xx')).toBe(false);
		expect(await catalog.verifyToken(await signJwt({ exp: exp + 3600 }, 'other-secret'))).toBe(
			false
		);
		expect(await catalog.verifyToken(await signJwt({ exp: exp - 10 }, 'test-jwt-secret'))).toBe(
			false
		);
		expect(await catalog.verifyToken(await signJwt({ exp: exp + 3600 }, 'test-jwt-secret'))).toBe(
			true
		);
	});
});

describe('labels', () => {
	it('maps each code name to its display word', async () => {
		expect(await catalog.labels()).toEqual({
			Aloft: 'Aloft',
			Grounded: 'Grounded',
			Nest: 'Nest',
			Seen: 'Seen',
			Flown: 'Flown',
			Lost: 'Lost',
			Roosted: 'Roosted'
		});
	});

	it('is empty when no label is seeded', async () => {
		await seedLabels([]);
		expect(await catalog.labels()).toEqual({});
	});
});

/** Fixture helper: the add and edit operations come with another slice, so rows go in directly. */
async function seedBird(
	name: string,
	opts: {
		arrival?: string | null;
		seen?: boolean;
		flown?: boolean;
		lost?: boolean;
		roosted?: boolean;
		nest?: boolean;
		archived?: boolean;
		pictures?: string[];
	} = {}
) {
	const arrival = opts.arrival ?? null;
	const precision =
		arrival === null
			? null
			: arrival.length === 4
				? 'year'
				: arrival.length === 7
					? 'month'
					: 'day';
	const row = await env.DB.prepare(
		`INSERT INTO bird (name, arrival, arrival_precision, seen, flown, lost, roosted, nest, archived)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
	)
		.bind(
			name,
			arrival,
			precision,
			+!!opts.seen,
			+!!opts.flown,
			+!!opts.lost,
			+!!opts.roosted,
			+!!opts.nest,
			+!!opts.archived
		)
		.first<{ id: number }>();
	const birdId = row!.id;
	let position = 0;
	for (const key of opts.pictures ?? []) {
		await env.PICTURES.put(key, new TextEncoder().encode(`bytes-of-${key}`));
		await env.DB.prepare('INSERT INTO picture (bird_id, key, position) VALUES (?, ?, ?)')
			.bind(birdId, key, position++)
			.run();
	}
	return birdId;
}

beforeEach(async () => {
	await env.DB.batch([
		env.DB.prepare('DELETE FROM bird_song'),
		env.DB.prepare('DELETE FROM sighting'),
		env.DB.prepare('DELETE FROM picture'),
		env.DB.prepare('DELETE FROM bird')
	]);
});

const names = (tiles: { name: string }[]) => tiles.map((t) => t.name);

describe('listBirds', () => {
	it('puts Birds neither Flown nor Lost in Aloft, and Flown or Lost with no Song in Grounded', async () => {
		await seedBird('Bird A');
		await seedBird('Bird B', { flown: true });
		await seedBird('Bird C', { lost: true });
		await seedBird('Bird D', { flown: true, lost: true });
		expect(names(await catalog.listBirds({ view: 'aloft' }))).toEqual(['Bird A']);
		expect(names(await catalog.listBirds({ view: 'grounded' })).sort()).toEqual([
			'Bird B',
			'Bird C',
			'Bird D'
		]);
	});

	it('lists Seen Birds in Seen and keeps them in Aloft or Grounded too', async () => {
		await seedBird('Bird A', { seen: true });
		await seedBird('Bird B', { seen: true, lost: true });
		await seedBird('Bird C');
		expect(names(await catalog.listBirds({ view: 'seen' })).sort()).toEqual(['Bird A', 'Bird B']);
		expect(names(await catalog.listBirds({ view: 'aloft' })).sort()).toEqual(['Bird A', 'Bird C']);
		expect(names(await catalog.listBirds({ view: 'grounded' }))).toEqual(['Bird B']);
	});

	it('lists every Bird that is not Archived in Flock', async () => {
		await seedBird('Bird A');
		await seedBird('Bird B', { flown: true });
		await seedBird('Bird C', { lost: true, seen: true });
		await seedBird('Bird D', { archived: true });
		expect(names(await catalog.listBirds({ view: 'flock' })).sort()).toEqual([
			'Bird A',
			'Bird B',
			'Bird C'
		]);
	});

	it('leaves Archived Birds out of every view', async () => {
		await seedBird('Bird A', { archived: true, seen: true });
		await seedBird('Bird B', { archived: true, flown: true });
		for (const view of ['flock', 'aloft', 'grounded', 'seen'] as const) {
			expect(await catalog.listBirds({ view })).toEqual([]);
		}
	});

	it('sorts by Arrival newest first, a month or year with the days, no Arrival last', async () => {
		await seedBird('No arrival');
		await seedBird('Old day', { arrival: '2019-06-01' });
		await seedBird('Year only', { arrival: '2021' });
		await seedBird('New day', { arrival: '2022-03-10' });
		await seedBird('Mid day', { arrival: '2020-12-31' });
		await seedBird('Month only', { arrival: '2020-12' });
		expect(names(await catalog.listBirds({ view: 'aloft' }))).toEqual([
			'New day',
			'Year only',
			'Mid day',
			'Month only',
			'Old day',
			'No arrival'
		]);
	});

	it('returns what a tile shows: first Picture, the four flags, the Arrival', async () => {
		const id = await seedBird('Bird A', {
			arrival: '2020',
			seen: true,
			roosted: true,
			pictures: ['key-one', 'key-two']
		});
		await seedBird('Bird B');
		const tiles = await catalog.listBirds({ view: 'aloft' });
		const a = tiles.find((t) => t.id === id)!;
		expect(a).toMatchObject({
			name: 'Bird A',
			arrival: '2020',
			seen: true,
			flown: false,
			lost: false,
			nest: false
		});
		expect(a).not.toHaveProperty('roosted');
		expect(a.pictureId).toEqual(expect.any(Number));
		expect(tiles.find((t) => t.name === 'Bird B')!.pictureId).toBeNull();
	});
});

describe('getPicture', () => {
	it('streams the R2 object', async () => {
		await seedBird('Bird A', { pictures: ['key-one'] });
		const [tile] = await catalog.listBirds({ view: 'aloft' });
		const picture = await catalog.getPicture(tile.pictureId!);
		expect(picture).not.toBeNull();
		expect(await new Response(picture!.body).text()).toBe('bytes-of-key-one');
	});

	it('answers null for an unknown Picture', async () => {
		expect(await catalog.getPicture(999999)).toBeNull();
	});
});

describe('thumbnails', () => {
	const bytes = new TextEncoder().encode('small').buffer as ArrayBuffer;

	it('has none until the browser stores one, then streams it', async () => {
		await seedBird('Bird A', { pictures: ['key-one'] });
		const [tile] = await catalog.listBirds({ view: 'aloft' });
		expect(await catalog.getPicture(tile.pictureId!, 'thumb')).toBeNull();

		expect(await catalog.putThumbnail(tile.pictureId!, bytes)).toBe(true);
		const thumb = await catalog.getPicture(tile.pictureId!, 'thumb');
		expect(await new Response(thumb!.body).text()).toBe('small');
		const full = await catalog.getPicture(tile.pictureId!);
		expect(await new Response(full!.body).text()).toBe('bytes-of-key-one');
	});

	it('answers false for an unknown Picture', async () => {
		expect(await catalog.putThumbnail(999999, bytes)).toBe(false);
	});

	it('goes with its Picture when the Bird is deleted for good', async () => {
		const id = await seedBird('Bird A', { pictures: ['key-one'], archived: true });
		const [row] = (await env.DB.prepare('SELECT id FROM picture').all<{ id: number }>()).results;
		await catalog.putThumbnail(row.id, bytes);
		expect(await env.PICTURES.head('thumb/key-one')).not.toBeNull();

		expect(await catalog.deleteBirdForever(id)).toEqual({ ok: true });
		expect(await env.PICTURES.head('key-one')).toBeNull();
		expect(await env.PICTURES.head('thumb/key-one')).toBeNull();
	});
});
