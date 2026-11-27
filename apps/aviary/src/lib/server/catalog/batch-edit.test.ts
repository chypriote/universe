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
	catalog = createCatalog(env);
	const login = await catalog.login('test-password');
	if (!login.ok) throw new Error('login failed in setup');
	token = login.token;
});

const noFlags = { seen: false, flown: false, lost: false, roosted: false, nest: false };
async function added(name: string, over: Partial<BirdInput> = {}) {
	const result = await catalog.addBird(token, {
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
const bird = async (id: number) => (await catalog.getBird(token, id))!;

describe('editBirds', () => {
	it('sets the Habitat and flags of every listed Bird and leaves the others', async () => {
		const habitat = await catalog.addValue(token, 'habitat', 'H1');
		if (!habitat.ok) throw new Error('setup');
		const a = await added('Bird A');
		const b = await added('Bird B', { flags: { ...noFlags, nest: true } });
		const other = await added('Bird C');

		const result = await catalog.editBirds(token, [a, b], {
			habitatId: habitat.id,
			flags: { flown: true, roosted: true, nest: false }
		});

		expect(result).toEqual({ ok: true, updated: 2 });
		for (const id of [a, b]) {
			const row = await bird(id);
			expect(row.habitatId).toBe(habitat.id);
			expect([row.flown, row.roosted, row.nest]).toEqual([true, true, false]);
		}
		const untouched = await bird(other);
		expect([untouched.habitatId, untouched.flown, untouched.roosted]).toEqual([null, false, false]);
	});

	it('keeps what the change leaves out', async () => {
		const habitat = await catalog.addValue(token, 'habitat', 'H1');
		if (!habitat.ok) throw new Error('setup');
		const id = await added('Bird A', {
			habitatId: habitat.id,
			flags: { ...noFlags, lost: true }
		});

		await catalog.editBirds(token, [id], { flags: { nest: true } });

		const row = await bird(id);
		expect([row.habitatId, row.lost, row.nest]).toEqual([habitat.id, true, true]);
	});

	it('clears the Habitat with null', async () => {
		const habitat = await catalog.addValue(token, 'habitat', 'H1');
		if (!habitat.ok) throw new Error('setup');
		const id = await added('Bird A', { habitatId: habitat.id });
		await catalog.editBirds(token, [id], { habitatId: null });
		expect((await bird(id)).habitatId).toBeNull();
	});

	it('keeps Seen on a Bird with a Sighting and clears it on the others', async () => {
		const withSighting = await added('Bird A');
		const without = await added('Bird B', { flags: { ...noFlags, seen: true } });
		await catalog.addSighting(token, withSighting, '2024-05-01');

		await catalog.editBirds(token, [withSighting, without], {
			flags: { seen: false, flown: true }
		});

		expect((await bird(withSighting)).seen).toBe(true);
		expect((await bird(withSighting)).flown).toBe(true);
		expect((await bird(without)).seen).toBe(false);
	});

	it('sets Seen on', async () => {
		const id = await added('Bird A');
		await catalog.editBirds(token, [id], { flags: { seen: true } });
		expect((await bird(id)).seen).toBe(true);
	});

	it('handles more Birds than one statement can bind', async () => {
		const ids: number[] = [];
		for (let i = 0; i < 120; i++) ids.push(await added(`Bird ${i}`));
		expect(await catalog.editBirds(token, ids, { flags: { roosted: true } })).toEqual({
			ok: true,
			updated: 120
		});
		expect((await catalog.listBirds(token, { view: 'aloft', roosted: 'only' })).length).toBe(120);
	}, 60_000);

	it('changes nothing when a Bird or the Habitat does not exist', async () => {
		const id = await added('Bird A');
		expect(await catalog.editBirds(token, [id, 999], { flags: { flown: true } })).toEqual({
			ok: false,
			error: 'not-found'
		});
		expect(await catalog.editBirds(token, [id], { habitatId: 999 })).toEqual({
			ok: false,
			error: 'bad-habitat'
		});
		expect((await bird(id)).flown).toBe(false);
	});

	it('does nothing for no Birds or no change', async () => {
		const id = await added('Bird A');
		expect(await catalog.editBirds(token, [], { flags: { flown: true } })).toEqual({
			ok: true,
			updated: 0
		});
		expect(await catalog.editBirds(token, [id], {})).toEqual({ ok: true, updated: 0 });
	});

	it('needs the Owner token', async () => {
		await expect(catalog.editBirds('nope', [1], {})).rejects.toBeInstanceOf(UnauthorizedError);
	});
});

describe('listBatchBirds', () => {
	it('lists every Bird not Archived by name, with its Roosted flag', async () => {
		await added('Bird B');
		await added('Bird A', { flags: { ...noFlags, roosted: true } });
		const gone = await added('Bird C');
		await catalog.archiveBird(token, gone);

		const rows = await catalog.listBatchBirds(token);

		expect(rows.map((r) => [r.name, r.roosted])).toEqual([
			['Bird A', true],
			['Bird B', false]
		]);
	});
});
