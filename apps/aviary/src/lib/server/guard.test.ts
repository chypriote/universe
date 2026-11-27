import { describe, expect, it } from 'vitest';
import { createGuard, safeNext } from './guard';

const NOINDEX = 'noindex, nofollow, noarchive';

/** A fake request event: only what the guard reads. */
function event(path: string, init: { method?: string; session?: boolean } = {}) {
	const cookies = {
		get: (name: string) => (name === 'owner' && init.session ? 'valid' : undefined)
	};
	return {
		url: new URL(path, 'https://aviary.test'),
		request: new Request(new URL(path, 'https://aviary.test'), { method: init.method ?? 'GET' }),
		cookies
	};
}

const guard = createGuard(async (token) => token === 'valid');
const page = async () => new Response('page', { status: 200 });

const run = (path: string, init?: { method?: string; session?: boolean }) =>
	guard({ event: event(path, init), resolve: page } as never);

describe('access guard', () => {
	it('redirects a page request without a session to login, keeping the page in `next`', async () => {
		const response = await run('/grounded?tab=1');
		expect(response.status).toBe(303);
		expect(response.headers.get('location')).toBe('/login?next=%2Fgrounded%3Ftab%3D1');
	});

	it('redirects an unknown URL without a session to login too', async () => {
		const response = await run('/no/such/page');
		expect(response.status).toBe(303);
		expect(response.headers.get('location')).toBe('/login?next=%2Fno%2Fsuch%2Fpage');
	});

	it('redirects the home page to a plain login', async () => {
		const response = await run('/');
		expect(response.headers.get('location')).toBe('/login');
	});

	it('answers 401 to a form action, an API request and a picture request without a session', async () => {
		expect((await run('/?/addBird', { method: 'POST' })).status).toBe(401);
		expect((await run('/api/birds')).status).toBe(401);
		expect((await run('/pictures/12')).status).toBe(401);
	});

	it('lets the login page and its form through without a session', async () => {
		expect((await run('/login')).status).toBe(200);
		expect((await run('/login', { method: 'POST' })).status).toBe(200);
	});

	it('lets a request with a valid session reach the page', async () => {
		expect((await run('/grounded', { session: true })).status).toBe(200);
		expect((await run('/api/birds', { session: true })).status).toBe(200);
	});

	it('treats an invalid session like no session', async () => {
		const bad = { ...event('/'), cookies: { get: () => 'forged' } };
		const response = await guard({ event: bad, resolve: page } as never);
		expect(response.status).toBe(303);
	});

	it('marks every response noindex, nofollow, noarchive', async () => {
		for (const response of [
			await run('/'),
			await run('/login'),
			await run('/api/birds'),
			await run('/pictures/1'),
			await run('/robots.txt'),
			await run('/', { session: true })
		]) {
			expect(response.headers.get('x-robots-tag')).toBe(NOINDEX);
		}
	});

	it('serves a robots file that disallows everything, without a session', async () => {
		const response = await run('/robots.txt');
		expect(response.status).toBe(200);
		expect(await response.text()).toBe('User-agent: *\nDisallow: /\n');
	});
});

describe('safeNext', () => {
	it('keeps a path on this app', () => {
		expect(safeNext('/grounded?tab=1')).toBe('/grounded?tab=1');
	});

	it('falls back to the home page for anything else', () => {
		expect(safeNext(null)).toBe('/');
		expect(safeNext('')).toBe('/');
		expect(safeNext('https://elsewhere.test/')).toBe('/');
		expect(safeNext('//elsewhere.test/')).toBe('/');
		expect(safeNext('/\\elsewhere.test')).toBe('/');
	});
});
