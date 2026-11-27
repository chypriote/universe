import { and, asc, eq, or, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { issueToken, passwordMatches, tokenIsValid, UnauthorizedError } from '@universe/owner/auth';
import { birds, labels, pictures } from '../db/schema';
import type { Catalog } from './types';

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
				.where(and(eq(birds.archived, false), inView))
				.orderBy(
					sql`${arrivalKey} IS NULL`,
					sql`${arrivalKey} DESC`,
					asc(birds.name),
					asc(birds.id)
				);
			return rows;
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
		}
	};
}
