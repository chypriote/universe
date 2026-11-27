import { resolve } from '$app/paths';
import { label, type Labels } from './labels';

/** The tabs the StickyBar links to. Grounded and Nest join when their pages exist. */
export function lists(labels: Labels) {
	return [{ key: 'aloft', href: resolve('/'), label: label(labels, 'Aloft') }];
}
