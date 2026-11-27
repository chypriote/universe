import { catalogFromPlatform } from '#lib/server/catalog';
import type { RequestHandler } from './$types';

type Body =
	| { op: 'add'; birdId: number; day?: string }
	| { op: 'day'; id: number; day: string | null }
	| { op: 'delete'; id: number };

/** One Sighting change from the popup. A refusal answers 400 with its error code. */
export const POST: RequestHandler = async ({ request }) => {
	let body: Body;
	try {
		body = await request.json();
	} catch {
		return Response.json({ ok: false, error: 'bad-request' }, { status: 400 });
	}
	const catalog = catalogFromPlatform();
	const result =
		body.op === 'add'
			? await catalog.addSighting(Number(body.birdId), body.day)
			: body.op === 'day'
				? await catalog.setSightingDay(Number(body.id), body.day ?? null)
				: body.op === 'delete'
					? await catalog.deleteSighting(Number(body.id))
					: ({ ok: false, error: 'bad-request' } as const);
	return Response.json(result, { status: result.ok ? 200 : 400 });
};
