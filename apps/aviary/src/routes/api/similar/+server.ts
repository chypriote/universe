import { catalogFromPlatform } from '#lib/server/catalog';
import type { RequestHandler } from './$types';

/** Birds whose name matches `?q=`, Archived included. */
export const GET: RequestHandler = async ({ url }) =>
	Response.json(await catalogFromPlatform().findSimilarNames(url.searchParams.get('q') ?? ''));
