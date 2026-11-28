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

const upload = (...values: number[]) => ({
	bytes: new Uint8Array(values).buffer,
	contentType: 'image/jpeg'
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
const storedCount = async () => (await env.PICTURES.list()).objects.length;

describe('editBird', () => {
	it('changes every field', async () => {
		const habitat = await catalog.addValue('habitat', 'H1');
		const song = await catalog.addValue('song', 'S1');
		if (!habitat.ok || !song.ok) throw new Error('setup');
		const { id, pictureIds } = await added();
		const result = await catalog.editBird(id, {
			name: '  Bird Two ',
			habitatId: habitat.id,
			songIds: [song.id],
			arrival: '2024',
			notes: ' some notes ',
			flags: { seen: true, flown: true, lost: false, roosted: true, nest: true },
			pictures: pictureIds.map((pid) => ({ id: pid }))
		});
		expect(result).toEqual({ ok: true, pictureIds });
		expect(await catalog.getBird(id)).toMatchObject({
			name: 'Bird Two',
			habitat: 'H1',
			habitatId: habitat.id,
			songs: ['S1'],
			songIds: [song.id],
			arrival: '2024',
			notes: 'some notes',
			seen: true,
			flown: true,
			roosted: true,
			nest: true
		});
		// Flown, but it has a Song, so it stays Aloft.
		expect((await catalog.listBirds({ view: 'aloft' }))[0]).toMatchObject({ id });
		expect(await catalog.listBirds({ view: 'grounded' })).toEqual([]);
	});

	it('clears the Habitat, the Songs and the Arrival', async () => {
		const habitat = await catalog.addValue('habitat', 'H1');
		const song = await catalog.addValue('song', 'S1');
		if (!habitat.ok || !song.ok) throw new Error('setup');
		const { id, pictureIds } = await added({
			habitatId: habitat.id,
			songIds: [song.id],
			arrival: '2024-05-06'
		});
		await catalog.editBird(id, input({ pictures: pictureIds.map((pid) => ({ id: pid })) }));
		expect(await catalog.getBird(id)).toMatchObject({
			habitat: null,
			songs: [],
			arrival: null
		});
	});

	it('adds a Picture after the kept ones, stored under a new key', async () => {
		const { id, pictureIds } = await added({ pictures: [upload(1)] });
		const result = await catalog.editBird(
			id,
			input({ pictures: [{ id: pictureIds[0] }, upload(2, 2)] })
		);
		if (!result.ok) throw new Error(result.error);
		expect(result.pictureIds[0]).toBe(pictureIds[0]);
		expect(result.pictureIds).toHaveLength(2);
		expect(await Promise.all(result.pictureIds.map(readBytes))).toEqual([[1], [2, 2]]);
		expect((await catalog.getBird(id))!.pictureIds).toEqual(result.pictureIds);
	});

	it('deletes a Picture and its R2 object', async () => {
		const { id, pictureIds } = await added({ pictures: [upload(1), upload(2)] });
		const result = await catalog.editBird(id, input({ pictures: [{ id: pictureIds[1] }] }));
		expect(result).toEqual({ ok: true, pictureIds: [pictureIds[1]] });
		expect(await catalog.getPicture(pictureIds[0])).toBeNull();
		expect(await storedCount()).toBe(1);
		expect(await readBytes(pictureIds[1])).toEqual([2]);
	});

	it('reorders the Pictures; the first is the tile Picture', async () => {
		const { id, pictureIds } = await added({ pictures: [upload(1), upload(2), upload(3)] });
		const order = [pictureIds[2], pictureIds[0], pictureIds[1]];
		const result = await catalog.editBird(
			id,
			input({ pictures: order.map((pid) => ({ id: pid })) })
		);
		expect(result).toEqual({ ok: true, pictureIds: order });
		expect((await catalog.getBird(id))!.pictureIds).toEqual(order);
		expect((await catalog.listBirds({ view: 'aloft' }))[0].pictureId).toBe(order[0]);
		expect(await storedCount()).toBe(3);
	});

	it('mixes delete, keep, add and reorder in one edit', async () => {
		const { id, pictureIds } = await added({ pictures: [upload(1), upload(2)] });
		const result = await catalog.editBird(
			id,
			input({ pictures: [upload(9), { id: pictureIds[1] }] })
		);
		if (!result.ok) throw new Error(result.error);
		expect(await Promise.all(result.pictureIds.map(readBytes))).toEqual([[9], [2]]);
		expect(await catalog.getPicture(pictureIds[0])).toBeNull();
		expect(await storedCount()).toBe(2);
	});

	it('keeps the last Picture: an edit with none is refused and changes nothing', async () => {
		const { id, pictureIds } = await added();
		expect(await catalog.editBird(id, input({ name: 'Changed', pictures: [] }))).toEqual({
			ok: false,
			error: 'picture-required'
		});
		expect(await catalog.getBird(id)).toMatchObject({ name: 'Bird One', pictureIds });
		expect(await storedCount()).toBe(1);
	});

	it('keeps Seen on while the Bird has a Sighting, whatever the input', async () => {
		const { id, pictureIds } = await added();
		await catalog.addSighting(id, '2024-01-02');
		await catalog.editBird(
			id,
			input({ pictures: [{ id: pictureIds[0] }], flags: { ...noFlags, seen: false } })
		);
		expect((await catalog.getBird(id))!.seen).toBe(true);
	});

	it('lets Seen go off when the Bird has no Sighting', async () => {
		const { id, pictureIds } = await added({ flags: { ...noFlags, seen: true } });
		await catalog.editBird(id, input({ pictures: [{ id: pictureIds[0] }] }));
		expect((await catalog.getBird(id))!.seen).toBe(false);
	});

	it('refuses the same invalid input as Add, changing nothing', async () => {
		const { id, pictureIds } = await added();
		const keep = [{ id: pictureIds[0] }];
		expect(await catalog.editBird(id, input({ name: ' ', pictures: keep }))).toEqual({
			ok: false,
			error: 'name-required'
		});
		expect(await catalog.editBird(id, input({ habitatId: 999, pictures: keep }))).toEqual({
			ok: false,
			error: 'bad-habitat'
		});
		expect(await catalog.editBird(id, input({ songIds: [999], pictures: keep }))).toEqual({
			ok: false,
			error: 'bad-song'
		});
		expect(await catalog.editBird(id, input({ arrival: 'abc', pictures: keep }))).toEqual({
			ok: false,
			error: 'bad-arrival'
		});
		expect(
			await catalog.editBird(
				id,
				input({ pictures: [...keep, { bytes: new ArrayBuffer(1), contentType: 'image/png' }] })
			)
		).toEqual({ ok: false, error: 'picture-bad-type' });
		expect(await catalog.getBird(id)).toMatchObject({ name: 'Bird One', pictureIds });
		expect(await storedCount()).toBe(1);
	});

	it('refuses a Picture id of another Bird', async () => {
		const { id } = await added({ name: 'A' });
		const other = await added({ name: 'B' });
		expect(await catalog.editBird(id, input({ pictures: [{ id: other.pictureIds[0] }] }))).toEqual({
			ok: false,
			error: 'bad-picture'
		});
		expect(await storedCount()).toBe(2);
	});

	it('refuses a Bird that does not exist', async () => {
		expect(await catalog.editBird(999999, input())).toEqual({
			ok: false,
			error: 'not-found'
		});
		expect(await storedCount()).toBe(0);
	});
});
