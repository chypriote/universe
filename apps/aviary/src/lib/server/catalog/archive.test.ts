import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { createCatalog, UnauthorizedError } from './index';
import type { BirdInput, Catalog } from './types';

let catalog: Catalog;
let token: string;

beforeEach(async () => {
	await env.DB.batch([
		env.DB.prepare('DELETE FROM bird_song'),
		env.DB.prepare('DELETE FROM sighting'),
		env.DB.prepare('DELETE FROM picture'),
		env.DB.prepare('DELETE FROM bird'),
		env.DB.prepare('DELETE FROM habitat'),
		env.DB.prepare('DELETE FROM song')
	]);
	const stored = await env.PICTURES.list();
	await Promise.all(stored.objects.map((o) => env.PICTURES.delete(o.key)));
	catalog = createCatalog(env);
	const login = await catalog.login('test-password');
	if (!login.ok) throw new Error('login failed in setup');
	token = login.token;
});

const noFlags = { seen: false, flown: false, lost: false, roosted: false, nest: false };
function input(over: Partial<BirdInput> = {}): BirdInput {
	return {
		name: 'Bird One',
		habitatId: null,
		songIds: [],
		arrival: null,
		notes: '',
		flags: noFlags,
		pictures: [{ bytes: new Uint8Array([1, 2]).buffer, contentType: 'image/jpeg' }],
		...over
	};
}
async function added(over: Partial<BirdInput> = {}) {
	const result = await catalog.addBird(token, input(over));
	if (!result.ok) throw new Error(`add failed: ${result.error}`);
	return result;
}
const aloftNames = async (search?: string) =>
	(await catalog.listBirds(token, { view: 'aloft', search })).map((b) => b.name);
const count = async (table: string) =>
	(await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<{ n: number }>())!.n;

describe('archiveBird', () => {
	it('takes the Bird out of every view, filter and search', async () => {
		const habitat = await catalog.addValue(token, 'habitat', 'H1');
		if (!habitat.ok) throw new Error('setup');
		const { id } = await added({ name: 'Bird One', habitatId: habitat.id });
		await added({ name: 'Bird Two', flags: { ...noFlags, flown: true, nest: true } });
		const nested = await added({ name: 'Bird Three', flags: { ...noFlags, nest: true } });

		expect(await catalog.archiveBird(token, id)).toEqual({ ok: true });
		await catalog.archiveBird(token, nested.id);

		expect(await aloftNames()).toEqual([]);
		expect(await aloftNames('one')).toEqual([]);
		expect((await catalog.listBirds(token, { view: 'aloft', habitat: habitat.id })).length).toBe(0);
		expect((await catalog.listBirds(token, { view: 'nest' })).map((b) => b.name)).toEqual([
			'Bird Two'
		]);
	});

	it('keeps the Bird in similar names, marked', async () => {
		const { id } = await added({ name: 'Bird One' });
		await catalog.archiveBird(token, id);
		const similar = await catalog.findSimilarNames(token, 'bird one');
		expect(similar.map((b) => [b.id, b.archived])).toEqual([[id, true]]);
	});

	it('lists the Archived Birds by name', async () => {
		const b = await added({ name: 'Bird B' });
		const a = await added({ name: 'Bird A' });
		await added({ name: 'Bird C' });
		await catalog.archiveBird(token, b.id);
		await catalog.archiveBird(token, a.id);
		expect((await catalog.listArchivedBirds(token)).map((t) => t.name)).toEqual([
			'Bird A',
			'Bird B'
		]);
	});

	it('refuses a Bird that does not exist', async () => {
		expect(await catalog.archiveBird(token, 999)).toEqual({ ok: false, error: 'not-found' });
	});
});

describe('restoreBird', () => {
	it('brings the Bird back to its view', async () => {
		const { id } = await added();
		await catalog.archiveBird(token, id);
		expect(await catalog.restoreBird(token, id)).toEqual({ ok: true });
		expect(await aloftNames()).toEqual(['Bird One']);
		expect(await catalog.listArchivedBirds(token)).toEqual([]);
	});

	it('refuses a Bird that does not exist', async () => {
		expect(await catalog.restoreBird(token, 999)).toEqual({ ok: false, error: 'not-found' });
	});
});

describe('deleteBirdForever', () => {
	it('removes the Bird, its Song links, Sightings, Pictures and R2 objects', async () => {
		const song = await catalog.addValue(token, 'song', 'S1');
		if (!song.ok) throw new Error('setup');
		const keep = await added({ name: 'Bird Two' });
		const { id } = await added({
			songIds: [song.id],
			pictures: [
				{ bytes: new Uint8Array([1]).buffer, contentType: 'image/jpeg' },
				{ bytes: new Uint8Array([2]).buffer, contentType: 'image/jpeg' }
			]
		});
		await catalog.addSighting(token, id, '2024-05-01');
		await catalog.addSighting(token, keep.id, '2024-05-02');
		await catalog.archiveBird(token, id);

		expect(await catalog.deleteBirdForever(token, id)).toEqual({ ok: true });

		expect(await catalog.getBird(token, id)).toBeNull();
		expect(await count('bird')).toBe(1);
		expect(await count('picture')).toBe(1);
		expect(await count('sighting')).toBe(1);
		expect(await count('bird_song')).toBe(0);
		expect((await env.PICTURES.list()).objects).toHaveLength(1);
		expect(await catalog.getPicture(token, keep.pictureIds[0])).not.toBeNull();
		expect(await catalog.findSimilarNames(token, 'bird one')).toEqual([]);
	});

	it('is refused for a Bird that is not Archived', async () => {
		const { id, pictureIds } = await added();
		expect(await catalog.deleteBirdForever(token, id)).toEqual({
			ok: false,
			error: 'not-archived'
		});
		expect(await catalog.getBird(token, id)).not.toBeNull();
		expect(await catalog.getPicture(token, pictureIds[0])).not.toBeNull();
	});

	it('is refused again once the Bird is restored', async () => {
		const { id } = await added();
		await catalog.archiveBird(token, id);
		await catalog.restoreBird(token, id);
		expect(await catalog.deleteBirdForever(token, id)).toEqual({
			ok: false,
			error: 'not-archived'
		});
	});

	it('refuses a Bird that does not exist', async () => {
		expect(await catalog.deleteBirdForever(token, 999)).toEqual({ ok: false, error: 'not-found' });
	});
});

describe('Archive operations without a valid token', () => {
	it('reject a bad token and change nothing', async () => {
		const { id } = await added();
		await catalog.archiveBird(token, id);
		for (const run of [
			() => catalog.archiveBird('bad', id),
			() => catalog.restoreBird('bad', id),
			() => catalog.deleteBirdForever('bad', id),
			() => catalog.listArchivedBirds('bad')
		]) {
			await expect(run()).rejects.toBeInstanceOf(UnauthorizedError);
		}
		expect(await count('bird')).toBe(1);
		expect(await catalog.listArchivedBirds(token)).toHaveLength(1);
	});
});
