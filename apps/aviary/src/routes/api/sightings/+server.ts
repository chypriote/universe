import { catalogFromPlatform, UnauthorizedError } from '#lib/server/catalog';
import { ownerToken } from '@universe/owner/cookie';
import type { RequestHandler } from './$types';

type Body =
	| { op: 'add'; birdId: number; day?: string }
	| { op: 'day'; id: number; day: string | null }
	| { op: 'delete'; id: number };

/** One Sighting change from the popup. A refusal answers 400 with its error code. */
export const POST: RequestHandler = async ({ request, cookies }) => {
	let body: Body;
	try {
		body = await request.json();
	} catch {
		return Response.json({ ok: false, error: 'bad-request' }, { status: 400 });
	}
	const catalog = catalogFromPlatform();
	const token = ownerToken(cookies);
	try {
		const result =
			body.op === 'add'
				? await catalog.addSighting(token, Number(body.birdId), body.day)
				: body.op === 'day'
					? await catalog.setSightingDay(token, Number(body.id), body.day ?? null)
					: body.op === 'delete'
						? await catalog.deleteSighting(token, Number(body.id))
						: ({ ok: false, error: 'bad-request' } as const);
		return Response.json(result, { status: result.ok ? 200 : 400 });
	} catch (e) {
		if (e instanceof UnauthorizedError) {
			return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}
		throw e;
	}
};
