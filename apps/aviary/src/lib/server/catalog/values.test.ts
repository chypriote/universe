import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { createCatalog } from './index';
import type { Catalog } from './types';

let catalog: Catalog;

beforeEach(async () => {
	await env.DB.prepare('DELETE FROM bird_song').run();
	await env.DB.prepare('DELETE FROM bird').run();
	await env.DB.prepare('DELETE FROM habitat').run();
	await env.DB.prepare('DELETE FROM song').run();
	catalog = createCatalog(env);
});

/** Birds are inserted directly: the add operations live in other slices. */
async function insertBird(name: string, habitatId: number | null, songIds: number[] = []) {
	const row = await env.DB.prepare('INSERT INTO bird (name, habitat_id) VALUES (?, ?) RETURNING id')
		.bind(name, habitatId)
		.first<{ id: number }>();
	const id = row!.id;
	for (const songId of songIds) {
		await env.DB.prepare('INSERT INTO bird_song (bird_id, song_id) VALUES (?, ?)')
			.bind(id, songId)
			.run();
	}
	return id;
}

async function habitatOf(birdId: number) {
	const row = await env.DB.prepare('SELECT habitat_id AS h FROM bird WHERE id = ?')
		.bind(birdId)
		.first<{ h: number | null }>();
	return row!.h;
}

async function songsOf(birdId: number) {
	const { results } = await env.DB.prepare(
		'SELECT song_id AS s FROM bird_song WHERE bird_id = ? ORDER BY song_id'
	)
		.bind(birdId)
		.all<{ s: number }>();
	return results.map((r) => r.s);
}

async function idOf(kind: 'habitat' | 'song', name: string) {
	const values = await catalog.listValues(kind);
	return values.find((v) => v.name === name)!.id;
}

describe.each(['habitat', 'song'] as const)('%s values', (kind) => {
	/** A Bird that uses the value: as its Habitat, or among its Songs. */
	function useValue(valueId: number, name = 'Bird') {
		return kind === 'habitat' ? insertBird(name, valueId) : insertBird(name, null, [valueId]);
	}
	async function valueOf(birdId: number) {
		return kind === 'habitat' ? await habitatOf(birdId) : await songsOf(birdId);
	}
	const expected = (id: number) => (kind === 'habitat' ? id : [id]);

	it('adds values and lists them by name with their usage', async () => {
		const b = await catalog.addValue(kind, 'Beta');
		const a = await catalog.addValue(kind, '  Alpha ');
		if (!a.ok || !b.ok) throw new Error('add failed');
		await useValue(a.id);
		expect(await catalog.listValues(kind)).toEqual([
			{ id: a.id, name: 'Alpha', uses: 1 },
			{ id: b.id, name: 'Beta', uses: 0 }
		]);
	});

	it('refuses an empty or duplicate name', async () => {
		await catalog.addValue(kind, 'Alpha');
		expect(await catalog.addValue(kind, '   ')).toEqual({ ok: false, error: 'empty' });
		expect(await catalog.addValue(kind, 'Alpha')).toEqual({
			ok: false,
			error: 'duplicate'
		});
	});

	it('renames a value, and refuses a clash, an empty name or an unknown id', async () => {
		await catalog.addValue(kind, 'Alpha');
		await catalog.addValue(kind, 'Beta');
		const alpha = await idOf(kind, 'Alpha');
		expect(await catalog.renameValue(kind, alpha, 'Gamma')).toEqual({ ok: true });
		expect((await catalog.listValues(kind)).map((v) => v.name)).toEqual(['Beta', 'Gamma']);
		expect(await catalog.renameValue(kind, alpha, 'Beta')).toEqual({
			ok: false,
			error: 'duplicate'
		});
		expect(await catalog.renameValue(kind, alpha, ' ')).toEqual({
			ok: false,
			error: 'empty'
		});
		expect(await catalog.renameValue(kind, 9999, 'Zed')).toEqual({
			ok: false,
			error: 'not-found'
		});
	});

	it('removes a value nobody uses at once', async () => {
		await catalog.addValue(kind, 'Alpha');
		const alpha = await idOf(kind, 'Alpha');
		expect(await catalog.removeValue(kind, alpha)).toEqual({ ok: true });
		expect(await catalog.listValues(kind)).toEqual([]);
	});

	it('refuses to remove a value in use without a target', async () => {
		await catalog.addValue(kind, 'Alpha');
		const alpha = await idOf(kind, 'Alpha');
		const bird = await useValue(alpha);
		expect(await catalog.removeValue(kind, alpha)).toEqual({ ok: false, error: 'in-use' });
		expect(await catalog.listValues(kind)).toHaveLength(1);
		expect(await valueOf(bird)).toEqual(expected(alpha));
	});

	it('moves every Bird to the target, then removes the value', async () => {
		await catalog.addValue(kind, 'Alpha');
		await catalog.addValue(kind, 'Beta');
		const alpha = await idOf(kind, 'Alpha');
		const beta = await idOf(kind, 'Beta');
		const one = await useValue(alpha, 'One');
		const two = await useValue(alpha, 'Two');
		expect(await catalog.removeValue(kind, alpha, beta)).toEqual({ ok: true });
		expect(await catalog.listValues(kind)).toEqual([{ id: beta, name: 'Beta', uses: 2 }]);
		expect(await valueOf(one)).toEqual(expected(beta));
		expect(await valueOf(two)).toEqual(expected(beta));
	});

	it('refuses a target that is the value itself or unknown, and changes nothing', async () => {
		await catalog.addValue(kind, 'Alpha');
		const alpha = await idOf(kind, 'Alpha');
		await useValue(alpha);
		expect(await catalog.removeValue(kind, alpha, alpha)).toEqual({
			ok: false,
			error: 'bad-target'
		});
		expect(await catalog.removeValue(kind, alpha, 9999)).toEqual({
			ok: false,
			error: 'bad-target'
		});
		expect(await catalog.listValues(kind)).toEqual([{ id: alpha, name: 'Alpha', uses: 1 }]);
		expect(await catalog.removeValue(kind, 9999)).toEqual({
			ok: false,
			error: 'not-found'
		});
	});
});

describe('Songs move', () => {
	it('adds the target once to a Bird that already has it, and keeps its other Songs', async () => {
		for (const name of ['Alpha', 'Beta', 'Gamma']) await catalog.addValue('song', name);
		const alpha = await idOf('song', 'Alpha');
		const beta = await idOf('song', 'Beta');
		const gamma = await idOf('song', 'Gamma');
		const both = await insertBird('Both', null, [alpha, beta]);
		const mixed = await insertBird('Mixed', null, [alpha, gamma]);
		expect(await catalog.removeValue('song', alpha, beta)).toEqual({ ok: true });
		expect(await songsOf(both)).toEqual([beta]);
		expect(await songsOf(mixed)).toEqual([beta, gamma]);
	});
});
