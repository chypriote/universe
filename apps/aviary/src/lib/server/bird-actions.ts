import { fail, type RequestEvent } from '@sveltejs/kit';
import { ownerToken } from '@universe/owner/cookie';
import { catalogFromPlatform, UnauthorizedError, type BirdInputError } from './catalog';
import { parseBirdForm } from './bird-input';

/** Label code name of each refusal. The form shows `label(code)`. */
const REFUSALS: Record<BirdInputError | 'bad-form', string> = {
	'name-required': 'BirdNameRequired',
	'picture-required': 'BirdPictureRequired',
	'picture-too-large': 'PictureTooLarge',
	'picture-bad-type': 'PictureBadType',
	'bad-habitat': 'BirdHabitatInvalid',
	'bad-song': 'BirdSongInvalid',
	'bad-arrival': 'BirdArrivalInvalid',
	'bad-form': 'SomethingWrong'
};

/** The `addBird` form action, the same on every tab page. Edit (#285) adds its own beside it. */
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
