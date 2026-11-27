import { addBirdAction } from '#lib/server/bird-actions';
import { loadView } from '#lib/server/list-view';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ cookies, url }) => loadView(cookies, url, 'aloft');

export const actions: Actions = { addBird: addBirdAction };
