import { drizzle } from 'drizzle-orm/d1';
import { issueToken, passwordMatches, tokenIsValid, UnauthorizedError } from '@universe/owner/auth';
import { labels } from '../db/schema';
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
		}
	};
}
