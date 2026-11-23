import { resolve } from '$app/paths';

/** The lists the StickyBar Tabs link to. */
export const lists = [
	{ key: 'collection', href: resolve('/'), label: 'Collection' },
	{ key: 'wishlist', href: resolve('/wishlist'), label: 'Wishlist' }
];
