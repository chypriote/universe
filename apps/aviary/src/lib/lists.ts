import { resolve } from '$app/paths';
import { label, type Labels } from './labels';

/** The tabs the StickyBar links to. */
export function lists(labels: Labels) {
	return [
		{ key: 'aloft', href: resolve('/'), label: label(labels, 'Aloft') },
		{ key: 'grounded', href: resolve('/grounded'), label: label(labels, 'Grounded') },
		{ key: 'nest', href: resolve('/nest'), label: label(labels, 'Nest') }
	];
}
