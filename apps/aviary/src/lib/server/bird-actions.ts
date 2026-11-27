import { fail, type RequestEvent } from '@sveltejs/kit';
import { catalogFromPlatform, type BirdInputError } from './catalog';
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
export async function addBirdAction({ request }: RequestEvent) {
	const input = await parseBirdForm(await request.formData());
	if ('error' in input) return fail(400, { error: REFUSALS[input.error] });
	const result = await catalogFromPlatform().addBird(input);
	if (!result.ok) return fail(400, { error: REFUSALS[result.error] });
	return { added: result.id };
}

/** The `editBird` form action, the same on every tab page. The Bird is `?id=` of the action URL. */
export async function editBirdAction({ request, url }: RequestEvent) {
	const id = Number(url.searchParams.get('id'));
	if (!Number.isInteger(id)) return fail(400, { error: REFUSALS['bad-form'] });
	const input = await parseBirdForm(await request.formData());
	if ('error' in input) return fail(400, { error: REFUSALS[input.error] });
	const result = await catalogFromPlatform().editBird(id, input);
	if (!result.ok) return fail(400, { error: REFUSALS[result.error] });
	return { edited: id };
}

/** The `archiveBird` form action, the same on every tab page. The Bird is `?id=` of the action URL. */
export async function archiveBirdAction({ url }: RequestEvent) {
	const id = Number(url.searchParams.get('id'));
	if (!Number.isInteger(id)) return fail(400, { error: REFUSALS['bad-form'] });
	const result = await catalogFromPlatform().archiveBird(id);
	if (!result.ok) return fail(400, { error: REFUSALS[result.error] });
	return { archived: id };
}
