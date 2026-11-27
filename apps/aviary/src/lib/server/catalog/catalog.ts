import { drizzle } from 'drizzle-orm/d1';
import { issueToken, passwordMatches, tokenIsValid, UnauthorizedError } from '@universe/owner/auth';
import { and, asc, count, eq, inArray, or, sql } from 'drizzle-orm';
import { birds, birdSongs, habitats, labels, pictures, songs } from '../db/schema';
import { arrivalPrecision } from '../../arrival';
import { MAX_PICTURE_BYTES, MIN_SIMILAR_CHARS } from './rules';
import type { Catalog, PictureUpload, ValueKind } from './types';

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

	/** The tile columns shared by every list of Birds. */
	const tileColumns = {
		id: birds.id,
		name: birds.name,
		arrival: birds.arrival,
		seen: birds.seen,
		flown: birds.flown,
		lost: birds.lost,
		nest: birds.nest,
		pictureId: sql<number | null>`(
			SELECT p.id FROM picture p WHERE p.bird_id = bird.id ORDER BY p.position, p.id LIMIT 1
		)`
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

		async listBirds(token, { view }) {
			await owner(token);
			const grounded = or(eq(birds.flown, true), eq(birds.lost, true));
			const inView = {
				aloft: sql`NOT (${birds.flown} OR ${birds.lost})`,
				grounded,
				nest: eq(birds.nest, true)
			}[view];
			// A year-only Arrival counts as the first day of that year, so it sorts with day Arrivals.
			const arrivalKey = sql`CASE ${birds.arrivalPrecision} WHEN 'year' THEN ${birds.arrival} || '-01-01' ELSE ${birds.arrival} END`;
			const rows = await db
				.select(tileColumns)
				.from(birds)
				.where(and(eq(birds.archived, false), inView))
				.orderBy(
					sql`${arrivalKey} IS NULL`,
					sql`${arrivalKey} DESC`,
					asc(birds.name),
					asc(birds.id)
				);
			return rows;
		},

		async addBird(token, input) {
			await owner(token);
			const name = input.name.trim();
			if (!name) return { ok: false, error: 'name-required' };
			const uploads = input.pictures.filter((p): p is PictureUpload => 'bytes' in p);
			if (uploads.length !== input.pictures.length) return { ok: false, error: 'picture-required' };
			if (uploads.length === 0 || uploads.some((p) => p.bytes.byteLength === 0)) {
				return { ok: false, error: 'picture-required' };
			}
			if (uploads.some((p) => p.contentType !== 'image/jpeg')) {
				return { ok: false, error: 'picture-bad-type' };
			}
			if (uploads.some((p) => p.bytes.byteLength > MAX_PICTURE_BYTES)) {
				return { ok: false, error: 'picture-too-large' };
			}
			const precision = input.arrival === null ? null : arrivalPrecision(input.arrival);
			if (input.arrival !== null && !precision) return { ok: false, error: 'bad-arrival' };
			if (input.habitatId !== null && !(await exists('habitat', input.habitatId))) {
				return { ok: false, error: 'bad-habitat' };
			}
			const songIds = [...new Set(input.songIds)];
			if (songIds.length > 0) {
				const found = await db
					.select({ id: songs.id })
					.from(songs)
					.where(inArray(songs.id, songIds));
				if (found.length !== songIds.length) return { ok: false, error: 'bad-song' };
			}

			// R2 first, then the rows; a failure removes what was stored.
			const keys = uploads.map(() => crypto.randomUUID());
			await Promise.all(
				uploads.map((p, i) =>
					env.PICTURES.put(keys[i], p.bytes, { httpMetadata: { contentType: p.contentType } })
				)
			);
			try {
				const [bird] = await db
					.insert(birds)
					.values({
						name,
						arrival: input.arrival,
						arrivalPrecision: precision,
						habitatId: input.habitatId,
						notes: input.notes.trim(),
						...input.flags
					})
					.returning({ id: birds.id });
				try {
					await db
						.insert(pictures)
						.values(keys.map((key, position) => ({ birdId: bird.id, key, position })));
					if (songIds.length > 0) {
						await db
							.insert(birdSongs)
							.values(songIds.map((songId) => ({ birdId: bird.id, songId })));
					}
				} catch (error) {
					await db.delete(birdSongs).where(eq(birdSongs.birdId, bird.id));
					await db.delete(pictures).where(eq(pictures.birdId, bird.id));
					await db.delete(birds).where(eq(birds.id, bird.id));
					throw error;
				}
				const rows = await db
					.select({ id: pictures.id })
					.from(pictures)
					.where(eq(pictures.birdId, bird.id))
					.orderBy(asc(pictures.position));
				return { ok: true, id: bird.id, pictureIds: rows.map((r) => r.id) };
			} catch (error) {
				await env.PICTURES.delete(keys);
				throw error;
			}
		},

		async findSimilarNames(token, text) {
			await owner(token);
			const needle = text.trim().toLowerCase();
			if ([...needle].length < MIN_SIMILAR_CHARS) return [];
			return db
				.select({ ...tileColumns, archived: birds.archived })
				.from(birds)
				.where(sql`instr(lower(${birds.name}), ${needle}) > 0`)
				.orderBy(asc(birds.name), asc(birds.id));
		},

		async getPicture(token, id) {
			await owner(token);
			const [row] = await db
				.select({ key: pictures.key })
				.from(pictures)
				.where(eq(pictures.id, id));
			if (!row) return null;
			const object = await env.PICTURES.get(row.key);
			if (!object) return null;
			// The browser resizes every Picture to JPEG before upload.
			return { body: object.body, contentType: object.httpMetadata?.contentType ?? 'image/jpeg' };
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
