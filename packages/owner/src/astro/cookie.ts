import { OWNER_COOKIE, ownerCookieOptions } from '../session';

export { OWNER_COOKIE };

/** The part of Astro's `cookies` these helpers use, so this package needs no `astro` dependency. */
type AstroCookies = {
	get(name: string): { value: string } | undefined;
	set(name: string, value: string, options: ReturnType<typeof ownerCookieOptions>): void;
	delete(name: string, options: { path: string; domain?: string }): void;
};

/** The Owner token from the cookie, or '' for a Viewer. */
export function ownerToken(cookies: AstroCookies): string {
	return cookies.get(OWNER_COOKIE)?.value ?? '';
}

/** See `ownerCookieOptions` for `domain`. */
export function setOwnerToken(cookies: AstroCookies, token: string, secure: boolean, domain = '') {
	// A host-only cookie from before `domain` was set is sent first and hides the new one.
	if (domain) cookies.delete(OWNER_COOKIE, { path: '/' });
	cookies.set(OWNER_COOKIE, token, ownerCookieOptions(secure, domain));
}

/** Log out: drop the cookie on the host and, when set, on the shared domain. */
export function clearOwnerToken(cookies: AstroCookies, domain = '') {
	cookies.delete(OWNER_COOKIE, { path: '/' });
	if (domain) cookies.delete(OWNER_COOKIE, { path: '/', domain });
}
