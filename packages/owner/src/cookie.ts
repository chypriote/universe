import type { Cookies } from '@sveltejs/kit';

export const OWNER_COOKIE = 'owner';
const NINETY_DAYS = 60 * 60 * 24 * 90;

/** The Owner token from the cookie, or '' for a Viewer. Pass it to every Catalog write. */
export function ownerToken(cookies: Cookies): string {
	return cookies.get(OWNER_COOKIE) ?? '';
}

/**
 * `domain`: the parent domain every app runs under (`OWNER_COOKIE_DOMAIN`), so one login covers
 * them all. Empty: the cookie stays on this app's host.
 */
export function setOwnerToken(cookies: Cookies, token: string, secure: boolean, domain = '') {
	cookies.set(OWNER_COOKIE, token, {
		path: '/',
		domain: domain || undefined,
		httpOnly: true,
		secure,
		sameSite: 'lax',
		maxAge: NINETY_DAYS
	});
}
