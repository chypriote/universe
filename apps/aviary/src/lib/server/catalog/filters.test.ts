import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { createCatalog } from './index';
import type { Catalog } from './types';

let catalog: Catalog;
let habitatA: number;
let habitatB: number;
let songX: number;
let songY: number;

async function insertValue(table: 'habitat' | 'song', name: string) {
	const row = await env.DB.prepare(`INSERT INTO ${table} (name) VALUES (?) RETURNING id`)
		.bind(name)
		.first<{ id: number }>();
	return row!.id;
}

async function insertBird(
	name: string,
	opts: {
		habitat?: number;
		songs?: number[];
		nest?: boolean;
		seen?: boolean;
		roosted?: boolean;
		flown?: boolean;
		archived?: boolean;
	} = {}
) {
	const row = await env.DB.prepare(
		'INSERT INTO bird (name, habitat_id, nest, seen, roosted, flown, archived) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id'
	)
		.bind(
			name,
			opts.habitat ?? null,
			+!!opts.nest,
			+!!opts.seen,
			+!!opts.roosted,
			+!!opts.flown,
			+!!opts.archived
		)
		.first<{ id: number }>();
	for (const songId of opts.songs ?? []) {
		await env.DB.prepare('INSERT INTO bird_song (bird_id, song_id) VALUES (?, ?)')
			.bind(row!.id, songId)
			.run();
	}
	return row!.id;
}

beforeEach(async () => {
	await env.DB.batch([
		env.DB.prepare('DELETE FROM bird_song'),
		env.DB.prepare('DELETE FROM picture'),
		env.DB.prepare('DELETE FROM sighting'),
		env.DB.prepare('DELETE FROM bird'),
		env.DB.prepare('DELETE FROM habitat'),
		env.DB.prepare('DELETE FROM song')
	]);
	habitatA = await insertValue('habitat', 'Habitat A');
	habitatB = await insertValue('habitat', 'Habitat B');
	songX = await insertValue('song', 'Song X');
	songY = await insertValue('song', 'Song Y');
	catalog = createCatalog(env);
});

const names = async (query: Parameters<Catalog['listBirds']>[0]) =>
	(await catalog.listBirds(query)).map((t) => t.name).sort();

describe('listBirds filters', () => {
	it('filters by Habitat', async () => {
		await insertBird('Bird A', { habitat: habitatA });
		await insertBird('Bird B', { habitat: habitatB });
		await insertBird('Bird C');
		expect(await names({ view: 'aloft', habitat: habitatA })).toEqual(['Bird A']);
		expect(await names({ view: 'aloft', habitat: habitatB })).toEqual(['Bird B']);
	});

	it('filters by Song, a Bird with several Songs appearing once', async () => {
		await insertBird('Bird A', { songs: [songX, songY] });
		await insertBird('Bird B', { songs: [songY] });
		await insertBird('Bird C');
		expect(await names({ view: 'aloft', song: songX })).toEqual(['Bird A']);
		expect(await names({ view: 'aloft', song: songY })).toEqual(['Bird A', 'Bird B']);
	});

	it('filters by Nest: all, only, not', async () => {
		await insertBird('Bird A', { nest: true });
		await insertBird('Bird B');
		expect(await names({ view: 'aloft', nest: 'all' })).toEqual(['Bird A', 'Bird B']);
		expect(await names({ view: 'aloft', nest: 'only' })).toEqual(['Bird A']);
		expect(await names({ view: 'aloft', nest: 'not' })).toEqual(['Bird B']);
	});

	it('filters by Seen: all, only, not', async () => {
		await insertBird('Bird A', { seen: true });
		await insertBird('Bird B');
		expect(await names({ view: 'aloft', seen: 'all' })).toEqual(['Bird A', 'Bird B']);
		expect(await names({ view: 'aloft', seen: 'only' })).toEqual(['Bird A']);
		expect(await names({ view: 'aloft', seen: 'not' })).toEqual(['Bird B']);
	});

	it('filters by Flown: all, only, not', async () => {
		await insertBird('Bird A', { flown: true });
		await insertBird('Bird B');
		expect(await names({ view: 'flock', flown: 'all' })).toEqual(['Bird A', 'Bird B']);
		expect(await names({ view: 'flock', flown: 'only' })).toEqual(['Bird A']);
		expect(await names({ view: 'flock', flown: 'not' })).toEqual(['Bird B']);
	});

	it('filters by Roosted: all, only', async () => {
		await insertBird('Bird A', { roosted: true });
		await insertBird('Bird B');
		expect(await names({ view: 'aloft', roosted: 'all' })).toEqual(['Bird A', 'Bird B']);
		expect(await names({ view: 'aloft', roosted: 'only' })).toEqual(['Bird A']);
	});

	it('searches the name, ignoring case', async () => {
		await insertBird('Alpha Bird');
		await insertBird('Beta');
		expect(await names({ view: 'aloft', search: 'ALPHA' })).toEqual(['Alpha Bird']);
		expect(await names({ view: 'aloft', search: 'bird' })).toEqual(['Alpha Bird']);
		expect(await names({ view: 'aloft', search: '  beTA ' })).toEqual(['Beta']);
	});

	it('searches a non-ASCII capital in a name, ignoring case', async () => {
		await insertBird('\u00c9ric');
		expect(await names({ view: 'aloft', search: '\u00e9ric' })).toEqual(['\u00c9ric']);
		expect(await names({ view: 'aloft', search: '\u00c9RIC' })).toEqual(['\u00c9ric']);
	});

	it('takes % and _ in the search literally', async () => {
		await insertBird('Bird A');
		await insertBird('Bird_B');
		expect(await names({ view: 'aloft', search: '%' })).toEqual([]);
		expect(await names({ view: 'aloft', search: '_' })).toEqual(['Bird_B']);
	});

	it('never matches Archived Birds, whatever the filter', async () => {
		await insertBird('Bird A', {
			archived: true,
			habitat: habitatA,
			songs: [songX],
			nest: true,
			seen: true
		});
		expect(await names({ view: 'aloft', search: 'Bird A' })).toEqual([]);
		expect(await names({ view: 'aloft', habitat: habitatA })).toEqual([]);
		expect(await names({ view: 'seen', song: songX, nest: 'only' })).toEqual([]);
	});

	it('combines filters with each other and with the view', async () => {
		await insertBird('Bird A', { habitat: habitatA, songs: [songX], nest: true, seen: true });
		await insertBird('Bird B', { habitat: habitatA, songs: [songX], seen: true });
		await insertBird('Bird C', { habitat: habitatA, songs: [songY], nest: true, seen: true });
		await insertBird('Bird D', {
			habitat: habitatA,
			songs: [songX],
			nest: true,
			seen: true,
			flown: true
		});
		const q = { habitat: habitatA, song: songX, search: 'bird' };
		// Bird D is Flown but has a Song, so it stays Aloft.
		expect(await names({ view: 'aloft', ...q })).toEqual(['Bird A', 'Bird B', 'Bird D']);
		expect(await names({ view: 'aloft', ...q, nest: 'only' })).toEqual(['Bird A', 'Bird D']);
		expect(await names({ view: 'aloft', ...q, nest: 'not' })).toEqual(['Bird B']);
		expect(await names({ view: 'grounded', ...q })).toEqual([]);
		expect(await names({ view: 'seen', ...q })).toEqual(['Bird A', 'Bird B', 'Bird D']);
		expect(await names({ view: 'seen', ...q, nest: 'not' })).toEqual(['Bird B']);
		expect(await names({ view: 'seen', ...q, roosted: 'only' })).toEqual([]);
		expect(await names({ view: 'aloft', ...q, search: 'zzz' })).toEqual([]);
	});

	it('treats an empty search as no search', async () => {
		await insertBird('Bird A');
		expect(await names({ view: 'aloft', search: '   ' })).toEqual(['Bird A']);
	});
});
