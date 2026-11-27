import type { Handle } from '@sveltejs/kit/hooks';
import { OWNER_COOKIE } from '@universe/owner/session';

const NOINDEX = 'noindex, nofollow, noarchive';
const ROBOTS = 'User-agent: *\nDisallow: /\n';

/** A `next` value that stays on this app: a path, never a URL or a protocol-relative link. */
export function safeNext(next: string | null): string {
	if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return '/';
	// A browser drops tabs and newlines from a URL, so `/%09/host` (or a raw tab) can turn into
	// `//host`. Reject control characters, raw or percent-encoded, and keep only a path that
	// stays on this origin.
	try {
		// eslint-disable-next-line no-control-regex
		if (/[\u0000-\u001f\u007f]/.test(decodeURIComponent(next))) return '/';
		const base = 'https://aviary.invalid';
		if (new URL(next, base).origin !== base) return '/';
	} catch {
		return '/';
	}
	return next;
}

const isApiOrPicture = (path: string) =>
	path === '/api' || path.startsWith('/api/') || path.startsWith('/pictures/');

/**
 * The access guard: nothing is reachable without the Owner session, except the login page and
 * the robots file. Every response, redirects and errors included, is marked noindex.
 */
export function createGuard(verifyToken: (token: string) => Promise<boolean>): Handle {
	return async ({ event, resolve }) => {
		const respond = (response: Response) => {
			response.headers.set('X-Robots-Tag', NOINDEX);
			return response;
		};
		const { pathname, search } = event.url;

		if (pathname === '/robots.txt') {
			return respond(new Response(ROBOTS, { headers: { 'Content-Type': 'text/plain' } }));
		}
		if (pathname === '/login') return respond(await resolve(event));

		const token = event.cookies.get(OWNER_COOKIE) ?? '';
		if (token !== '' && (await verifyToken(token))) return respond(await resolve(event));

		const isRead = event.request.method === 'GET' || event.request.method === 'HEAD';
		if (isRead && !isApiOrPicture(pathname)) {
			const target = pathname === '/' && search === '' ? '/login' : null;
			const location = target ?? `/login?next=${encodeURIComponent(`${pathname}${search}`)}`;
			return respond(new Response(null, { status: 303, headers: { Location: location } }));
		}
		return respond(Response.json({ error: 'Owner login required' }, { status: 401 }));
	};
}
