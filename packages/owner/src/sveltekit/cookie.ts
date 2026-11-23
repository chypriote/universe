import type { Cookies } from '@sveltejs/kit';
import { OWNER_COOKIE, ownerCookieOptions } from '../session';

export { OWNER_COOKIE };

/** The Owner token from the cookie, or '' for a Viewer. Pass it to every Catalog write. */
export function ownerToken(cookies: Cookies): string {
	return cookies.get(OWNER_COOKIE) ?? '';
}

/** See `ownerCookieOptions` for `domain`. */
export function setOwnerToken(cookies: Cookies, token: string, secure: boolean, domain = '') {
	// A host-only cookie from before `domain` was set is sent first and hides the new one.
	if (domain) cookies.delete(OWNER_COOKIE, { path: '/' });
	cookies.set(OWNER_COOKIE, token, ownerCookieOptions(secure, domain));
}
