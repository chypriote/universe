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
	const result = await catalog.addBird(input(over));
	if (!result.ok) throw new Error(`add failed: ${result.error}`);
	return result;
}
const aloftNames = async (search?: string) =>
	(await catalog.listBirds({ view: 'aloft', search })).map((b) => b.name);
const count = async (table: string) =>
	(await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<{ n: number }>())!.n;

describe('archiveBird', () => {
	it('takes the Bird out of every view, filter and search', async () => {
		const habitat = await catalog.addValue('habitat', 'H1');
		if (!habitat.ok) throw new Error('setup');
		const { id } = await added({ name: 'Bird One', habitatId: habitat.id });
		await added({ name: 'Bird Two', flags: { ...noFlags, flown: true, seen: true } });
		const nested = await added({ name: 'Bird Three', flags: { ...noFlags, seen: true } });

		expect(await catalog.archiveBird(id)).toEqual({ ok: true });
		await catalog.archiveBird(nested.id);

		expect(await aloftNames()).toEqual([]);
		expect(await aloftNames('one')).toEqual([]);
		expect((await catalog.listBirds({ view: 'aloft', habitat: habitat.id })).length).toBe(0);
		expect((await catalog.listBirds({ view: 'seen' })).map((b) => b.name)).toEqual(['Bird Two']);
	});

	it('keeps the Bird in similar names, marked', async () => {
		const { id } = await added({ name: 'Bird One' });
		await catalog.archiveBird(id);
		const similar = await catalog.findSimilarNames('bird one');
		expect(similar.map((b) => [b.id, b.archived])).toEqual([[id, true]]);
	});

	it('lists the Archived Birds by name', async () => {
		const b = await added({ name: 'Bird B' });
		const a = await added({ name: 'Bird A' });
		await added({ name: 'Bird C' });
		await catalog.archiveBird(b.id);
		await catalog.archiveBird(a.id);
		expect((await catalog.listArchivedBirds()).map((t) => t.name)).toEqual(['Bird A', 'Bird B']);
	});

	it('refuses a Bird that does not exist', async () => {
		expect(await catalog.archiveBird(999)).toEqual({ ok: false, error: 'not-found' });
	});
});

describe('restoreBird', () => {
	it('brings the Bird back to its view', async () => {
		const { id } = await added();
		await catalog.archiveBird(id);
		expect(await catalog.restoreBird(id)).toEqual({ ok: true });
		expect(await aloftNames()).toEqual(['Bird One']);
		expect(await catalog.listArchivedBirds()).toEqual([]);
	});

	it('refuses a Bird that does not exist', async () => {
		expect(await catalog.restoreBird(999)).toEqual({ ok: false, error: 'not-found' });
	});
});

describe('deleteBirdForever', () => {
	it('removes the Bird, its Song links, Sightings, Pictures and R2 objects', async () => {
		const song = await catalog.addValue('song', 'S1');
		if (!song.ok) throw new Error('setup');
		const keep = await added({ name: 'Bird Two' });
		const { id } = await added({
			songIds: [song.id],
			pictures: [
				{ bytes: new Uint8Array([1]).buffer, contentType: 'image/jpeg' },
				{ bytes: new Uint8Array([2]).buffer, contentType: 'image/jpeg' }
			]
		});
		await catalog.addSighting(id, '2024-05-01');
		await catalog.addSighting(keep.id, '2024-05-02');
		await catalog.archiveBird(id);

		expect(await catalog.deleteBirdForever(id)).toEqual({ ok: true });

		expect(await catalog.getBird(id)).toBeNull();
		expect(await count('bird')).toBe(1);
		expect(await count('picture')).toBe(1);
		expect(await count('sighting')).toBe(1);
		expect(await count('bird_song')).toBe(0);
		expect((await env.PICTURES.list()).objects).toHaveLength(1);
		expect(await catalog.getPicture(keep.pictureIds[0])).not.toBeNull();
		expect(await catalog.findSimilarNames('bird one')).toEqual([]);
	});

	it('loses nothing when a Restore lands before the delete runs', async () => {
		const { id } = await added();
		await catalog.addSighting(id, '2024-01-02');
		await catalog.archiveBird(id);
		// A Restore from another request lands between the check and the batch.
		const racing = new Proxy(env.DB, {
			get(target, prop) {
				if (prop === 'batch') {
					return async (statements: D1PreparedStatement[]) => {
						await target.prepare('UPDATE bird SET archived = 0 WHERE id = ?').bind(id).run();
						return target.batch(statements);
					};
				}
				const value = Reflect.get(target, prop, target);
				return typeof value === 'function' ? value.bind(target) : value;
			}
		});
		const racer = createCatalog({ ...env, DB: racing });

		expect(await racer.deleteBirdForever(id)).toEqual({ ok: false, error: 'not-archived' });

		expect(await count('bird')).toBe(1);
		expect(await count('picture')).toBe(1);
		expect(await count('sighting')).toBe(1);
		expect((await env.PICTURES.list()).objects).toHaveLength(1);
	});

	it('is refused for a Bird that is not Archived', async () => {
		const { id, pictureIds } = await added();
		expect(await catalog.deleteBirdForever(id)).toEqual({
			ok: false,
			error: 'not-archived'
		});
		expect(await catalog.getBird(id)).not.toBeNull();
		expect(await catalog.getPicture(pictureIds[0])).not.toBeNull();
	});

	it('is refused again once the Bird is restored', async () => {
		const { id } = await added();
		await catalog.archiveBird(id);
		await catalog.restoreBird(id);
		expect(await catalog.deleteBirdForever(id)).toEqual({
			ok: false,
			error: 'not-archived'
		});
	});

	it('refuses a Bird that does not exist', async () => {
		expect(await catalog.deleteBirdForever(999)).toEqual({ ok: false, error: 'not-found' });
	});
});
