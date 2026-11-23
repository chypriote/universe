/** The Owner session cookie, framework-free. Each framework adapter reads and writes it. */
export const OWNER_COOKIE = 'owner';
const NINETY_DAYS = 60 * 60 * 24 * 90;

export type OwnerCookieOptions = {
	path: '/';
	domain: string | undefined;
	httpOnly: true;
	secure: boolean;
	sameSite: 'lax';
	maxAge: number;
};

/**
 * `domain`: the parent domain every app runs under (`OWNER_COOKIE_DOMAIN`), so one login covers
 * them all. Empty: the cookie stays on this app's host.
 */
export function ownerCookieOptions(secure: boolean, domain = ''): OwnerCookieOptions {
	return {
		path: '/',
		domain: domain || undefined,
		httpOnly: true,
		secure,
		sameSite: 'lax',
		maxAge: NINETY_DAYS
	};
}
