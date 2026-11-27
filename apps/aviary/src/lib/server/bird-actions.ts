import { fail, type RequestEvent } from '@sveltejs/kit';
import { ownerToken } from '@universe/owner/cookie';
import { catalogFromPlatform, UnauthorizedError, type BirdInputError } from './catalog';
import type { EditBirdResult } from './catalog/types';
import { parseBirdForm } from './bird-input';

/** Label code name of each refusal. The form shows `label(code)`. */
const REFUSALS: Record<BirdInputError | EditBirdResultError | 'bad-form', string> = {
	'name-required': 'BirdNameRequired',
	'picture-required': 'BirdPictureRequired',
	'picture-too-large': 'PictureTooLarge',
	'picture-bad-type': 'PictureBadType',
	'bad-habitat': 'BirdHabitatInvalid',
	'bad-song': 'BirdSongInvalid',
	'bad-arrival': 'BirdArrivalInvalid',
	'bad-form': 'SomethingWrong',
	'not-found': 'SomethingWrong',
	'bad-picture': 'SomethingWrong'
};

type EditBirdResultError = Extract<EditBirdResult, { ok: false }>['error'];

/** The `addBird` form action, the same on every tab page. */
export async function addBirdAction({ request, cookies }: RequestEvent) {
	const input = await parseBirdForm(await request.formData());
	if ('error' in input) return fail(400, { error: REFUSALS[input.error] });
	try {
		const result = await catalogFromPlatform().addBird(ownerToken(cookies), input);
		if (!result.ok) return fail(400, { error: REFUSALS[result.error] });
		return { added: result.id };
	} catch (error) {
		if (error instanceof UnauthorizedError) return fail(401, { error: 'SessionExpired' });
		throw error;
	}
}

/** The `editBird` form action, the same on every tab page. The Bird is `?id=` of the action URL. */
export async function editBirdAction({ request, cookies, url }: RequestEvent) {
	const id = Number(url.searchParams.get('id'));
	if (!Number.isInteger(id)) return fail(400, { error: REFUSALS['bad-form'] });
	const input = await parseBirdForm(await request.formData());
	if ('error' in input) return fail(400, { error: REFUSALS[input.error] });
	try {
		const result = await catalogFromPlatform().editBird(ownerToken(cookies), id, input);
		if (!result.ok) return fail(400, { error: REFUSALS[result.error] });
		return { edited: id };
	} catch (error) {
		if (error instanceof UnauthorizedError) return fail(401, { error: 'SessionExpired' });
		throw error;
	}
}

/** The `archiveBird` form action, the same on every tab page. The Bird is `?id=` of the action URL. */
export async function archiveBirdAction({ cookies, url }: RequestEvent) {
	const id = Number(url.searchParams.get('id'));
	if (!Number.isInteger(id)) return fail(400, { error: REFUSALS['bad-form'] });
	try {
		const result = await catalogFromPlatform().archiveBird(ownerToken(cookies), id);
		if (!result.ok) return fail(400, { error: REFUSALS[result.error] });
		return { archived: id };
	} catch (error) {
		if (error instanceof UnauthorizedError) return fail(401, { error: 'SessionExpired' });
		throw error;
	}
}
