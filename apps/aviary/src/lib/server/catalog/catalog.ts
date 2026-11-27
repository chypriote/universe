import { drizzle } from 'drizzle-orm/d1';
import type { BatchItem } from 'drizzle-orm/batch';
import { issueToken, passwordMatches, tokenIsValid, UnauthorizedError } from '@universe/owner/auth';
import { and, asc, count, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { birds, birdSongs, habitats, labels, pictures, sightings, songs } from '../db/schema';
import { arrivalPrecision } from '../../arrival';
import { MAX_PICTURE_BYTES, MIN_SIMILAR_CHARS } from './rules';
import type { BirdInput, BirdInputError, Catalog, PictureUpload, ValueKind } from './types';

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

	/** Whether a Bird's name holds the lowercased needle. JS lowercasing folds every script. */
	const nameHas = (name: string, needle: string) => name.toLowerCase().includes(needle);

	/** A real calendar day as `YYYY-MM-DD`. */
	const isDay = (day: string) => {
		const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
		if (!m) return false;
		return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toISOString().slice(0, 10) === day;
	};

	type Checked =
		| { ok: false; error: BirdInputError }
		| {
				ok: true;
				name: string;
				precision: 'day' | 'month' | 'year' | null;
				songIds: number[];
				uploads: PictureUpload[];
		  };

	/** The checks Add and Edit share. Kept Pictures (`{ id }`) are for the caller to check. */
	async function checkBirdInput(input: BirdInput): Promise<Checked> {
		const name = input.name.trim();
		if (!name) return { ok: false, error: 'name-required' };
		if (input.pictures.length === 0) return { ok: false, error: 'picture-required' };
		const uploads = input.pictures.filter((p): p is PictureUpload => 'bytes' in p);
		if (uploads.some((p) => p.bytes.byteLength === 0)) {
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
			const found = await db.select({ id: songs.id }).from(songs).where(inArray(songs.id, songIds));
			if (found.length !== songIds.length) return { ok: false, error: 'bad-song' };
		}
		return { ok: true, name, precision, songIds, uploads };
	}

	async function setArchived(token: string, id: number, archived: boolean) {
		await owner(token);
		const [bird] = await db.select({ id: birds.id }).from(birds).where(eq(birds.id, id));
		if (!bird) return { ok: false, error: 'not-found' } as const;
		await db.update(birds).set({ archived }).where(eq(birds.id, id));
		return { ok: true } as const;
	}

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

		async listBirds(token, { view, habitat, song, seen, nest, roosted, search }) {
			await owner(token);
			const grounded = or(eq(birds.flown, true), eq(birds.lost, true));
			const inView = {
				aloft: sql`NOT (${birds.flown} OR ${birds.lost})`,
				grounded,
				seen: eq(birds.seen, true)
			}[view];
			const needle = search?.trim().toLowerCase();
			const filters = [
				habitat === undefined ? undefined : eq(birds.habitatId, habitat),
				song === undefined
					? undefined
					: sql`EXISTS (SELECT 1 FROM bird_song bs WHERE bs.bird_id = bird.id AND bs.song_id = ${song})`,
				seen === 'only' ? eq(birds.seen, true) : undefined,
				seen === 'not' ? eq(birds.seen, false) : undefined,
				nest === 'only' ? eq(birds.nest, true) : undefined,
				nest === 'not' ? eq(birds.nest, false) : undefined,
				roosted === 'only' ? eq(birds.roosted, true) : undefined
			];
			// A month or year Arrival counts as the first day of it, so it sorts with day Arrivals.
			const arrivalKey = sql`CASE ${birds.arrivalPrecision} WHEN 'year' THEN ${birds.arrival} || '-01-01' WHEN 'month' THEN ${birds.arrival} || '-01' ELSE ${birds.arrival} END`;
			const rows = await db
				.select(tileColumns)
				.from(birds)
				.where(and(eq(birds.archived, false), inView, ...filters))
				.orderBy(
					sql`${arrivalKey} IS NULL`,
					sql`${arrivalKey} DESC`,
					asc(birds.name),
					asc(birds.id)
				);
			// D1's SQL lower() folds ASCII only, so the name match runs here, on both sides alike.
			return needle ? rows.filter((row) => nameHas(row.name, needle)) : rows;
		},

		async listBatchBirds(token) {
			await owner(token);
			return db
				.select({ ...tileColumns, roosted: birds.roosted })
				.from(birds)
				.where(eq(birds.archived, false))
				.orderBy(asc(birds.name), asc(birds.id));
		},

		async addBird(token, input) {
			await owner(token);
			const checked = await checkBirdInput(input);
			if (!checked.ok) return checked;
			const { name, precision, songIds, uploads } = checked;
			if (uploads.length !== input.pictures.length) return { ok: false, error: 'picture-required' };

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

		async editBird(token, id, input) {
			await owner(token);
			const [bird] = await db.select({ id: birds.id }).from(birds).where(eq(birds.id, id));
			if (!bird) return { ok: false, error: 'not-found' };
			const checked = await checkBirdInput(input);
			if (!checked.ok) return checked;
			const { name, precision, songIds } = checked;

			const stored = await db
				.select({ id: pictures.id, key: pictures.key })
				.from(pictures)
				.where(eq(pictures.birdId, id));
			const kept = input.pictures.filter((p): p is { id: number } => 'id' in p).map((p) => p.id);
			if (new Set(kept).size !== kept.length || kept.some((k) => !stored.some((s) => s.id === k))) {
				return { ok: false, error: 'bad-picture' };
			}
			const removed = stored.filter((s) => !kept.includes(s.id));

			const newKeys = new Map<PictureUpload, string>();
			for (const p of checked.uploads) newKeys.set(p, crypto.randomUUID());
			await Promise.all(
				checked.uploads.map((p) =>
					env.PICTURES.put(newKeys.get(p)!, p.bytes, {
						httpMetadata: { contentType: p.contentType }
					})
				)
			);
			try {
				// One batch: the fields, Songs and Pictures change together or not at all.
				const statements: BatchItem<'sqlite'>[] = [
					db
						.update(birds)
						.set({
							name,
							arrival: input.arrival,
							arrivalPrecision: precision,
							habitatId: input.habitatId,
							notes: input.notes.trim(),
							...input.flags,
							// Seen is forced on while the Bird has a Sighting.
							seen: sql`${input.flags.seen ? 1 : 0} OR EXISTS (SELECT 1 FROM sighting s WHERE s.bird_id = ${id})`,
							updatedAt: sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`
						})
						.where(eq(birds.id, id)),
					db.delete(birdSongs).where(eq(birdSongs.birdId, id)),
					...(songIds.length > 0
						? [db.insert(birdSongs).values(songIds.map((songId) => ({ birdId: id, songId })))]
						: []),
					...(removed.length > 0
						? [
								db.delete(pictures).where(
									inArray(
										pictures.id,
										removed.map((r) => r.id)
									)
								)
							]
						: []),
					...input.pictures.map((p, position) =>
						'id' in p
							? db.update(pictures).set({ position }).where(eq(pictures.id, p.id))
							: db.insert(pictures).values({ birdId: id, key: newKeys.get(p)!, position })
					)
				];
				await db.batch(statements as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]]);
			} catch (error) {
				await env.PICTURES.delete([...newKeys.values()]);
				throw error;
			}
			if (removed.length > 0) await env.PICTURES.delete(removed.map((r) => r.key));
			const rows = await db
				.select({ id: pictures.id })
				.from(pictures)
				.where(eq(pictures.birdId, id))
				.orderBy(asc(pictures.position));
			return { ok: true, pictureIds: rows.map((r) => r.id) };
		},

		async editBirds(token, ids, change) {
			await owner(token);
			const unique = [...new Set(ids)];
			if (unique.length === 0) return { ok: true, updated: 0 };
			if (change.habitatId != null && !(await exists('habitat', change.habitatId))) {
				return { ok: false, error: 'bad-habitat' };
			}
			// D1 allows 100 bound values per statement.
			const chunks = Array.from({ length: Math.ceil(unique.length / 50) }, (_, i) =>
				unique.slice(i * 50, i * 50 + 50)
			);
			let found = 0;
			for (const chunk of chunks) {
				const [row] = await db.select({ n: count() }).from(birds).where(inArray(birds.id, chunk));
				found += row.n;
			}
			if (found !== unique.length) return { ok: false, error: 'not-found' };

			const { seen, ...others } = change.flags ?? {};
			const set = {
				...(change.habitatId === undefined ? {} : { habitatId: change.habitatId }),
				...others,
				// Seen is forced on while a Bird has a Sighting.
				...(seen === undefined
					? {}
					: {
							seen: sql`${seen ? 1 : 0} OR EXISTS (SELECT 1 FROM sighting s WHERE s.bird_id = bird.id)`
						})
			};
			if (Object.keys(set).length === 0) return { ok: true, updated: 0 };
			const updatedAt = sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`;
			const statements: BatchItem<'sqlite'>[] = chunks.map((chunk) =>
				db
					.update(birds)
					.set({ ...set, updatedAt })
					.where(inArray(birds.id, chunk))
			);
			await db.batch(statements as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]]);
			return { ok: true, updated: unique.length };
		},

		async archiveBird(token, id) {
			return setArchived(token, id, true);
		},

		async restoreBird(token, id) {
			return setArchived(token, id, false);
		},

		async listArchivedBirds(token) {
			await owner(token);
			return db
				.select(tileColumns)
				.from(birds)
				.where(eq(birds.archived, true))
				.orderBy(asc(birds.name), asc(birds.id));
		},

		async deleteBirdForever(token, id) {
			await owner(token);
			const [bird] = await db
				.select({ archived: birds.archived })
				.from(birds)
				.where(eq(birds.id, id));
			if (!bird) return { ok: false, error: 'not-found' };
			if (!bird.archived) return { ok: false, error: 'not-archived' };
			const stored = await db
				.select({ key: pictures.key })
				.from(pictures)
				.where(eq(pictures.birdId, id));
			// One batch: the rows go together or not at all. Each child delete re-checks that the Bird
			// is still Archived, so a Restore landing meanwhile loses nothing. The R2 objects follow.
			const stillArchived = sql`EXISTS (SELECT 1 FROM bird b WHERE b.id = ${id} AND b.archived = 1)`;
			const [, , , removed] = await db.batch([
				db.delete(birdSongs).where(and(eq(birdSongs.birdId, id), stillArchived)),
				db.delete(sightings).where(and(eq(sightings.birdId, id), stillArchived)),
				db.delete(pictures).where(and(eq(pictures.birdId, id), stillArchived)),
				db
					.delete(birds)
					.where(and(eq(birds.id, id), eq(birds.archived, true)))
					.returning({ id: birds.id })
			]);
			if (removed.length === 0) return { ok: false, error: 'not-archived' };
			if (stored.length > 0) await env.PICTURES.delete(stored.map((p) => p.key));
			return { ok: true };
		},

		async findSimilarNames(token, text) {
			await owner(token);
			const needle = text.trim().toLowerCase();
			if ([...needle].length < MIN_SIMILAR_CHARS) return [];
			const rows = await db
				.select({ ...tileColumns, archived: birds.archived })
				.from(birds)
				.orderBy(asc(birds.name), asc(birds.id));
			return rows.filter((row) => nameHas(row.name, needle));
		},

		async getBird(token, id) {
			await owner(token);
			const [row] = await db
				.select({
					id: birds.id,
					name: birds.name,
					arrival: birds.arrival,
					habitat: habitats.name,
					habitatId: birds.habitatId,
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
					.select({ id: songs.id, name: songs.name })
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
				songIds: songRows.map((s) => s.id),
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
