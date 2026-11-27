import type { APIRoute } from 'astro';
import { journalWorkspace } from '@/lib/journal';
import { badRequest, jsonBody, respond } from '../_respond';

export const prerender = false;

/** Edits a plan Day: any of `title`, `notes`, `cityId`, `routeCityIds`; or moves it: `{ move: 'up' | 'down' }`. */
export const PATCH: APIRoute = async ({ params, request }) => {
	const input = await jsonBody<{
		title?: string;
		notes?: string;
		cityId?: number;
		routeCityIds?: number[];
		move?: string;
	}>(request);
	const dayId = Number(params.id);
	if (!input || !Number.isInteger(dayId)) return badRequest('invalid-body');

	const journal = journalWorkspace();
	if (input.move !== undefined) {
		if (input.move !== 'up' && input.move !== 'down') return badRequest('invalid-body');
		return respond(await journal.movePlanDay(dayId, input.move));
	}
	return respond(
		await journal.editPlanDay({
			dayId,
			title: input.title,
			notes: input.notes,
			cityId: input.cityId,
			routeCityIds: input.routeCityIds
		})
	);
};

/** Deletes a plan Day. */
export const DELETE: APIRoute = async ({ params }) => {
	const dayId = Number(params.id);
	if (!Number.isInteger(dayId)) return badRequest('invalid-body');
	return respond(await journalWorkspace().deletePlanDay(dayId));
};
