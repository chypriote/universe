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
	const stored = await env.PICTURES.list();
	await Promise.all(stored.objects.map((o) => env.PICTURES.delete(o.key)));
	catalog = createCatalog(env);
});

const bytes = (...values: number[]) => new Uint8Array(values).buffer;
const upload = (...values: number[]) => ({ bytes: bytes(...values), contentType: 'image/jpeg' });

const noFlags = { seen: false, flown: false, lost: false, roosted: false, nest: false };
function input(over: Partial<BirdInput> = {}): BirdInput {
	return {
		name: 'Bird One',
		habitatId: null,
		songIds: [],
		arrival: null,
		notes: '',
		flags: noFlags,
		pictures: [upload(1)],
		...over
	};
}

async function added(over: Partial<BirdInput> = {}) {
	const result = await catalog.addBird(input(over));
	if (!result.ok) throw new Error(`add failed: ${result.error}`);
	return result;
}

async function readBytes(id: number) {
	const picture = await catalog.getPicture(id);
	if (!picture) return null;
	return [...new Uint8Array(await new Response(picture.body).arrayBuffer())];
}

describe('addBird', () => {
	it('stores the flags and shows the Bird in the right tabs', async () => {
		const { id } = await added({
			flags: { ...noFlags, seen: true, lost: true, nest: true, roosted: true }
		});
		const grounded = await catalog.listBirds({ view: 'grounded' });
		const seen = await catalog.listBirds({ view: 'seen' });
		expect(await catalog.listBirds({ view: 'aloft' })).toEqual([]);
		expect(grounded).toMatchObject([{ id, name: 'Bird One', seen: true, lost: true, nest: true }]);
		expect(seen.map((b) => b.id)).toEqual([id]);
	});

	it('stores the Habitat and the Songs', async () => {
		const habitat = await catalog.addValue('habitat', 'H1');
		const s1 = await catalog.addValue('song', 'S1');
		const s2 = await catalog.addValue('song', 'S2');
		if (!habitat.ok || !s1.ok || !s2.ok) throw new Error('setup');
		await added({ habitatId: habitat.id, songIds: [s1.id, s2.id] });
		expect((await catalog.listValues('habitat'))[0].uses).toBe(1);
		expect((await catalog.listValues('song')).map((v) => v.uses)).toEqual([1, 1]);
	});

	it('refuses a Habitat or Song that is not in the lists', async () => {
		expect(await catalog.addBird(input({ habitatId: 999 }))).toEqual({
			ok: false,
			error: 'bad-habitat'
		});
		expect(await catalog.addBird(input({ songIds: [999] }))).toEqual({
			ok: false,
			error: 'bad-song'
		});
		expect(await catalog.listBirds({ view: 'aloft' })).toEqual([]);
	});

	it('keeps an Arrival as a day, a month or a year only', async () => {
		await added({ name: 'Day', arrival: '2024-05-12' });
		await added({ name: 'Month', arrival: '2023-08' });
		await added({ name: 'Year', arrival: '2023' });
		await added({ name: 'None' });
		const tiles = await catalog.listBirds({ view: 'aloft' });
		expect(tiles.map((t) => [t.name, t.arrival])).toEqual([
			['Day', '2024-05-12'],
			['Month', '2023-08'],
			['Year', '2023'],
			['None', null]
		]);
	});

	it('refuses an invalid Arrival', async () => {
		for (const arrival of [
			'2024-13-01',
			'2024-02-30',
			'2024-00',
			'2024-13',
			'24',
			'abc',
			'2024-5-1'
		]) {
			expect(await catalog.addBird(input({ arrival }))).toEqual({
				ok: false,
				error: 'bad-arrival'
			});
		}
	});

	it('stores the Pictures in R2 in order, the first being the tile Picture', async () => {
		const result = await added({ pictures: [upload(1, 2), upload(3), upload(4, 5, 6)] });
		expect(result.pictureIds).toHaveLength(3);
		const stored = await Promise.all(result.pictureIds.map(readBytes));
		expect(stored).toEqual([[1, 2], [3], [4, 5, 6]]);
		const [tile] = await catalog.listBirds({ view: 'aloft' });
		expect(tile.pictureId).toBe(result.pictureIds[0]);
		const keys = await env.PICTURES.list();
		expect(keys.objects).toHaveLength(3);
		for (const object of keys.objects) expect(object.key).toMatch(/^[0-9a-f-]{36}$/);
	});

	it('refuses a missing name, without storing anything', async () => {
		expect(await catalog.addBird(input({ name: '   ' }))).toEqual({
			ok: false,
			error: 'name-required'
		});
		expect(await catalog.listBirds({ view: 'aloft' })).toEqual([]);
	});

	it('refuses a Bird with no Picture', async () => {
		expect(await catalog.addBird(input({ pictures: [] }))).toEqual({
			ok: false,
			error: 'picture-required'
		});
		expect(await catalog.listBirds({ view: 'aloft' })).toEqual([]);
	});

	it('refuses an oversize or empty upload and leaves nothing in R2', async () => {
		const big = { bytes: new ArrayBuffer(6 * 1024 * 1024), contentType: 'image/jpeg' };
		expect(await catalog.addBird(input({ pictures: [upload(1), big] }))).toEqual({
			ok: false,
			error: 'picture-too-large'
		});
		expect(
			await catalog.addBird(
				input({ pictures: [{ bytes: new ArrayBuffer(0), contentType: 'image/jpeg' }] })
			)
		).toEqual({ ok: false, error: 'picture-required' });
		expect((await env.PICTURES.list()).objects).toHaveLength(0);
	});

	it('refuses an upload that is not a JPEG', async () => {
		expect(
			await catalog.addBird(input({ pictures: [{ bytes: bytes(1), contentType: 'text/html' }] }))
		).toEqual({ ok: false, error: 'picture-bad-type' });
	});
});

describe('findSimilarNames', () => {
	it('finds a non-ASCII capital, ignoring case', async () => {
		const { id } = await added({ name: '\u00c9ric Bird' });
		expect(await catalog.findSimilarNames('\u00e9ric')).toMatchObject([{ id }]);
	});

	it('is empty under 3 characters', async () => {
		await added({ name: 'Robin' });
		expect(await catalog.findSimilarNames('Ro')).toEqual([]);
		expect(await catalog.findSimilarNames('  Ro ')).toEqual([]);
	});

	it('matches from 3 characters, ignoring case', async () => {
		const { id } = await added({ name: 'Robin' });
		await added({ name: 'Wren' });
		const found = await catalog.findSimilarNames('ROB');
		expect(found.map((b) => b.id)).toEqual([id]);
		expect(found[0]).toMatchObject({ name: 'Robin', archived: false });
	});

	it('includes Archived Birds and marks them', async () => {
		const { id } = await added({ name: 'Robin' });
		await env.DB.prepare('UPDATE bird SET archived = 1 WHERE id = ?').bind(id).run();
		expect(await catalog.findSimilarNames('robin')).toMatchObject([{ id, archived: true }]);
	});

	it('treats wildcard characters as plain text', async () => {
		await added({ name: 'Robin' });
		expect(await catalog.findSimilarNames('%%%')).toEqual([]);
	});
});
