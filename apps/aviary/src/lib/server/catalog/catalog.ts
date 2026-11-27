import { drizzle } from 'drizzle-orm/d1';
import { issueToken, passwordMatches, tokenIsValid, UnauthorizedError } from '@universe/owner/auth';
import { and, asc, count, desc, eq, or, sql } from 'drizzle-orm';
import { birds, birdSongs, habitats, labels, pictures, sightings, songs } from '../db/schema';
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

	/** A real calendar day as `YYYY-MM-DD`. */
	const isDay = (day: string) => {
		const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
		if (!m) return false;
		return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toISOString().slice(0, 10) === day;
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

		async listBirds(token, { view, habitat, song, nest, search }) {
			await owner(token);
			const grounded = or(eq(birds.flown, true), eq(birds.lost, true));
			const inView = {
				aloft: sql`NOT (${birds.flown} OR ${birds.lost})`,
				grounded,
				nest: eq(birds.nest, true)
			}[view];
			const needle = search?.trim().toLowerCase();
			const filters = [
				habitat === undefined ? undefined : eq(birds.habitatId, habitat),
				song === undefined
					? undefined
					: sql`EXISTS (SELECT 1 FROM bird_song bs WHERE bs.bird_id = bird.id AND bs.song_id = ${song})`,
				nest === 'only' ? eq(birds.nest, true) : undefined,
				nest === 'not' ? eq(birds.nest, false) : undefined,
				needle ? sql`instr(lower(${birds.name}), ${needle}) > 0` : undefined
			];
			// A year-only Arrival counts as the first day of that year, so it sorts with day Arrivals.
			const arrivalKey = sql`CASE ${birds.arrivalPrecision} WHEN 'year' THEN ${birds.arrival} || '-01-01' ELSE ${birds.arrival} END`;
			const rows = await db
				.select({
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
				})
				.from(birds)
				.where(and(eq(birds.archived, false), inView, ...filters))
				.orderBy(
					sql`${arrivalKey} IS NULL`,
					sql`${arrivalKey} DESC`,
					asc(birds.name),
					asc(birds.id)
				);
			return rows;
		},

		async getBird(token, id) {
			await owner(token);
			const [row] = await db
				.select({
					id: birds.id,
					name: birds.name,
					arrival: birds.arrival,
					habitat: habitats.name,
					notes: birds.notes,
					seen: birds.seen,
					flown: birds.flown,
					lost: birds.lost,
					roosted: birds.roosted,
					nest: birds.nest
				})
				.from(birds)
				.leftJoin(habitats, eq(habitats.id, birds.habitatId))
				.where(eq(birds.id, id));
			if (!row) return null;
			const [songRows, pictureRows, sightingRows] = await Promise.all([
				db
					.select({ name: songs.name })
					.from(birdSongs)
					.innerJoin(songs, eq(songs.id, birdSongs.songId))
					.where(eq(birdSongs.birdId, id))
					.orderBy(songs.name),
				db
					.select({ id: pictures.id })
					.from(pictures)
					.where(eq(pictures.birdId, id))
					.orderBy(pictures.position, pictures.id),
				db
					.select({ id: sightings.id, day: sightings.day })
					.from(sightings)
					.where(eq(sightings.birdId, id))
					.orderBy(sql`${sightings.day} IS NULL`, desc(sightings.day), desc(sightings.id))
			]);
			return {
				...row,
				songs: songRows.map((s) => s.name),
				pictureIds: pictureRows.map((p) => p.id),
				sightings: sightingRows
			};
		},

		async addSighting(token, birdId, day) {
			await owner(token);
			if (day !== undefined && !isDay(day)) return { ok: false, error: 'bad-day' };
			const [bird] = await db.select({ id: birds.id }).from(birds).where(eq(birds.id, birdId));
			if (!bird) return { ok: false, error: 'not-found' };
			// One batch: the Sighting and the forced Seen go in together.
			const [inserted] = await db.batch([
				db
					.insert(sightings)
					.values({ birdId, day: day ?? null })
					.returning({ id: sightings.id }),
				db.update(birds).set({ seen: true }).where(eq(birds.id, birdId))
			]);
			return { ok: true, id: inserted[0].id };
		},

		async setSightingDay(token, id, day) {
			await owner(token);
			if (day !== null && !isDay(day)) return { ok: false, error: 'bad-day' };
			const updated = await db
				.update(sightings)
				.set({ day })
				.where(eq(sightings.id, id))
				.returning({ id: sightings.id });
			return updated.length ? { ok: true } : { ok: false, error: 'not-found' };
		},

		async deleteSighting(token, id) {
			await owner(token);
			const deleted = await db
				.delete(sightings)
				.where(eq(sightings.id, id))
				.returning({ id: sightings.id });
			return deleted.length ? { ok: true } : { ok: false, error: 'not-found' };
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
