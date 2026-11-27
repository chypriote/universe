import type { APIRoute } from 'astro';
import { journalWorkspace } from '@/lib/journal';
import { badRequest, jsonBody, respond } from '../_respond';

export const prerender = false;

/** Switches a Day on or off and edits it: any of `visible`, `title`, `notes`, `cityId`, `routeCityIds`. */
export const PATCH: APIRoute = async ({ params, request }) => {
	const input = await jsonBody<{
		visible?: boolean;
		title?: string;
		notes?: string;
		cityId?: number;
		routeCityIds?: number[];
	}>(request);
	const dayId = Number(params.id);
	if (!input || !Number.isInteger(dayId)) return badRequest('invalid-body');

	const journal = journalWorkspace();
	if (input.visible !== undefined) {
		const result = await journal.setDayVisible(dayId, input.visible);
		if (!result.ok) return respond(result);
	}
	return respond(
		await journal.editDay({
			dayId,
			title: input.title,
			notes: input.notes,
			cityId: input.cityId,
			routeCityIds: input.routeCityIds
		})
	);
};
