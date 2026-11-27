import { loadView } from '#lib/server/list-view';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ cookies, url }) => loadView(cookies, url, 'aloft');
