import { drizzle } from 'drizzle-orm/d1';
import { issueToken, passwordMatches, tokenIsValid, UnauthorizedError } from '@universe/owner/auth';
import { and, count, eq, sql } from 'drizzle-orm';
import { birds, birdSongs, habitats, labels, songs } from '../db/schema';
import type { Catalog, ValueKind } from './types';

export interface CatalogEnv {
	DB: D1Database;
	PICTURES: R2Bucket;
	OWNER_PASSWORD: string;
	JWT_SECRET: string;
}

export function buildCatalog(env: CatalogEnv): Catalog {
	const db = drizzle(env.DB);

	const isOwner = async (token: string) =>
		!!env.JWT_SECRET && !!token && (await tokenIsValid(token, env.JWT_SECRET));

	/** Every operation but `login` and `verifyToken` starts here. */
	async function owner(token: string) {
		if (!(await isOwner(token))) throw new UnauthorizedError();
	}

	const table = (kind: ValueKind) => (kind === 'habitat' ? habitats : songs);
	const exists = async (kind: ValueKind, id: number) =>
		(
			await db
				.select({ id: table(kind).id })
				.from(table(kind))
				.where(eq(table(kind).id, id))
		).length > 0;
	const nameTaken = async (kind: ValueKind, name: string, exceptId = -1) =>
		(
			await db
				.select({ id: table(kind).id })
				.from(table(kind))
				.where(and(eq(table(kind).name, name), sql`${table(kind).id} != ${exceptId}`))
		).length > 0;
	const usesOf = async (kind: ValueKind, id: number) => {
		const [row] =
			kind === 'habitat'
				? await db.select({ n: count() }).from(birds).where(eq(birds.habitatId, id))
				: await db.select({ n: count() }).from(birdSongs).where(eq(birdSongs.songId, id));
		return row.n;
	};

	return {
		async login(password) {
			if (
				!env.OWNER_PASSWORD ||
				!env.JWT_SECRET ||
				!password ||
				!(await passwordMatches(password, env.OWNER_PASSWORD))
			) {
				return { ok: false, error: 'wrong-password' };
			}
			return { ok: true, token: await issueToken(env.JWT_SECRET) };
		},

		verifyToken: isOwner,

		async labels(token) {
			await owner(token);
			const rows = await db.select().from(labels);
			return Object.fromEntries(rows.map((row) => [row.codeName, row.word]));
		},

		async listValues(token, kind) {
			await owner(token);
			const t = table(kind);
			const rows = await db.select().from(t).orderBy(t.name);
			return Promise.all(
				rows.map(async (row) => ({ id: row.id, name: row.name, uses: await usesOf(kind, row.id) }))
			);
		},

		async addValue(token, kind, name) {
			await owner(token);
			const clean = name.trim();
			if (!clean) return { ok: false, error: 'empty' };
			if (await nameTaken(kind, clean)) return { ok: false, error: 'duplicate' };
			const [row] = await db
				.insert(table(kind))
				.values({ name: clean })
				.returning({ id: table(kind).id });
			return { ok: true, id: row.id };
		},

		async renameValue(token, kind, id, name) {
			await owner(token);
			const clean = name.trim();
			if (!clean) return { ok: false, error: 'empty' };
			if (!(await exists(kind, id))) return { ok: false, error: 'not-found' };
			if (await nameTaken(kind, clean, id)) return { ok: false, error: 'duplicate' };
			await db
				.update(table(kind))
				.set({ name: clean })
				.where(eq(table(kind).id, id));
			return { ok: true };
		},

		async removeValue(token, kind, id, moveTo) {
			await owner(token);
			if (!(await exists(kind, id))) return { ok: false, error: 'not-found' };
			const inUse = (await usesOf(kind, id)) > 0;
			if (moveTo === undefined) {
				if (inUse) return { ok: false, error: 'in-use' };
				await db.delete(table(kind)).where(eq(table(kind).id, id));
				return { ok: true };
			}
			if (moveTo === id || !(await exists(kind, moveTo))) return { ok: false, error: 'bad-target' };
			// One batch: the move and the removal succeed or fail together.
			if (kind === 'habitat') {
				await db.batch([
					db.update(birds).set({ habitatId: moveTo }).where(eq(birds.habitatId, id)),
					db.delete(habitats).where(eq(habitats.id, id))
				]);
			} else {
				await env.DB.batch([
					env.DB.prepare(
						'INSERT OR IGNORE INTO bird_song (bird_id, song_id) SELECT bird_id, ? FROM bird_song WHERE song_id = ?'
					).bind(moveTo, id),
					env.DB.prepare('DELETE FROM bird_song WHERE song_id = ?').bind(id),
					env.DB.prepare('DELETE FROM song WHERE id = ?').bind(id)
				]);
			}
			return { ok: true };
		}
	};
}
