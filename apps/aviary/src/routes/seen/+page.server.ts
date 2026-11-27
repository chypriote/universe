import { addBirdAction, archiveBirdAction, editBirdAction } from '#lib/server/bird-actions';
import { loadView } from '#lib/server/list-view';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => loadView(url, 'seen');

export const actions: Actions = {
	addBird: addBirdAction,
	editBird: editBirdAction,
	archiveBird: archiveBirdAction
};
