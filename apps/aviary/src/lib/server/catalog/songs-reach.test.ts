import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { createCatalog } from './index';
import type { BirdInput, Catalog } from './types';

let catalog: Catalog;

beforeEach(async () => {
	await env.DB.batch([
		env.DB.prepare('DELETE FROM bird_song'),
		env.DB.prepare('DELETE FROM sighting'),
		env.DB.prepare('DELETE FROM picture'),
		env.DB.prepare('DELETE FROM bird'),
		env.DB.prepare('DELETE FROM habitat'),
		env.DB.prepare('DELETE FROM song')
	]);
	catalog = createCatalog(env);
});

const noFlags = { seen: false, flown: false, lost: false, roosted: false, nest: false };
async function added(name: string, over: Partial<BirdInput> = {}) {
	const result = await catalog.addBird({
		name,
		habitatId: null,
		songIds: [],
		arrival: null,
		notes: '',
		flags: noFlags,
		pictures: [{ bytes: new Uint8Array([1]).buffer, contentType: 'image/jpeg' }],
		...over
	});
	if (!result.ok) throw new Error(`add failed: ${result.error}`);
	return result.id;
}
async function song(name: string) {
	const result = await catalog.addValue('song', name);
	if (!result.ok) throw new Error('setup');
	return result.id;
}
const names = async (query: Parameters<Catalog['listBirds']>[0]) =>
	(await catalog.listBirds(query)).map((t) => t.name).sort();

describe('Aloft and Grounded follow the Songs', () => {
	it('keeps a Flown or Lost Bird with a Song in Aloft', async () => {
		const s = await song('S1');
		await added('Plain');
		await added('Flown no song', { flags: { ...noFlags, flown: true } });
		await added('Lost no song', { flags: { ...noFlags, lost: true } });
		await added('Flown song', { songIds: [s], flags: { ...noFlags, flown: true } });
		await added('Lost song', { songIds: [s], flags: { ...noFlags, lost: true } });
		await added('Song only', { songIds: [s] });

		expect(await names({ view: 'grounded' })).toEqual(['Flown no song', 'Lost no song']);
		expect(await names({ view: 'aloft' })).toEqual([
			'Flown song',
			'Lost song',
			'Plain',
			'Song only'
		]);
		expect((await names({ view: 'flock' })).length).toBe(6);
	});
});

describe('Flown and Lost filters', () => {
	it('narrow a view to Birds with that flag', async () => {
		const s = await song('S1');
		await added('Plain');
		await added('Flown song', { songIds: [s], flags: { ...noFlags, flown: true } });
		await added('Lost song', { songIds: [s], flags: { ...noFlags, lost: true } });
		await added('Lost no song', { flags: { ...noFlags, lost: true } });

		expect(await names({ view: 'aloft', flown: 'only' })).toEqual(['Flown song']);
		expect(await names({ view: 'aloft', lost: 'only' })).toEqual(['Lost song']);
		expect(await names({ view: 'grounded', lost: 'only' })).toEqual(['Lost no song']);
		expect(await names({ view: 'flock', lost: 'only' })).toEqual(['Lost no song', 'Lost song']);
		expect((await names({ view: 'flock', flown: 'all', lost: 'all' })).length).toBe(4);
	});
});

describe('editBirds Songs', () => {
	it('adds a Song to every listed Bird and keeps the ones it already has', async () => {
		const s1 = await song('S1');
		const s2 = await song('S2');
		const a = await added('Bird A');
		const b = await added('Bird B', { songIds: [s1] });
		const other = await added('Bird C');

		expect(await catalog.editBirds([a, b], { addSongId: s1 })).toEqual({ ok: true, updated: 2 });
		await catalog.editBirds([a], { addSongId: s2 });

		expect((await catalog.getBird(a))!.songIds.sort()).toEqual([s1, s2]);
		expect((await catalog.getBird(b))!.songIds).toEqual([s1]);
		expect((await catalog.getBird(other))!.songIds).toEqual([]);
	});

	it('removes a Song from every listed Bird and leaves the others', async () => {
		const s1 = await song('S1');
		const s2 = await song('S2');
		const a = await added('Bird A', { songIds: [s1, s2] });
		const b = await added('Bird B', { songIds: [s1] });
		const other = await added('Bird C', { songIds: [s1] });

		await catalog.editBirds([a, b], { removeSongId: s1 });

		expect((await catalog.getBird(a))!.songIds).toEqual([s2]);
		expect((await catalog.getBird(b))!.songIds).toEqual([]);
		expect((await catalog.getBird(other))!.songIds).toEqual([s1]);
	});

	it('grounds a Lost Bird when its last Song is removed', async () => {
		const s = await song('S1');
		const id = await added('Bird A', { songIds: [s], flags: { ...noFlags, lost: true } });
		await catalog.editBirds([id], { removeSongId: s });
		expect(await names({ view: 'grounded' })).toEqual(['Bird A']);
	});

	it('handles more Birds than one statement can bind', async () => {
		const s = await song('S1');
		const ids: number[] = [];
		for (let i = 0; i < 120; i++) ids.push(await added(`Bird ${i}`));
		await catalog.editBirds(ids, { addSongId: s });
		expect((await catalog.listBirds({ view: 'flock', song: s })).length).toBe(120);
		await catalog.editBirds(ids, { removeSongId: s });
		expect((await catalog.listBirds({ view: 'flock', song: s })).length).toBe(0);
	}, 60_000);

	it('changes nothing when a Song does not exist', async () => {
		const id = await added('Bird A');
		expect(await catalog.editBirds([id], { addSongId: 999 })).toEqual({
			ok: false,
			error: 'bad-song'
		});
		expect(await catalog.editBirds([id], { removeSongId: 999 })).toEqual({
			ok: false,
			error: 'bad-song'
		});
	});
});
