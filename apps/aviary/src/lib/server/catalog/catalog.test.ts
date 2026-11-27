import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it } from 'vitest';
import { createCatalog, UnauthorizedError } from './index';
import type { Catalog } from './types';

let catalog: Catalog;
let token: string;

/** Fake labels: each value equals its code name. */
const FAKE_LABELS = ['Aloft', 'Grounded', 'Nest', 'Seen', 'Flown', 'Lost', 'Roosted'];

async function seedLabels(codeNames: string[]) {
	await env.DB.prepare('DELETE FROM labels').run();
	if (codeNames.length === 0) return;
	await env.DB.batch(
		codeNames.map((name) =>
			env.DB.prepare('INSERT INTO labels (code_name, word) VALUES (?, ?)').bind(name, name)
		)
	);
}

beforeEach(async () => {
	await seedLabels(FAKE_LABELS);
	catalog = createCatalog(env);
	const login = await catalog.login('test-password');
	if (!login.ok) throw new Error('login failed in setup');
	token = login.token;
});

function base64url(bytes: Uint8Array | string) {
	const raw = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes;
	return btoa(String.fromCharCode(...raw))
		.replaceAll('+', '-')
		.replaceAll('/', '_')
		.replaceAll('=', '');
}

async function signJwt(payload: object, secret: string) {
	const head = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
	const body = base64url(JSON.stringify(payload));
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${head}.${body}`));
	return `${head}.${body}.${base64url(new Uint8Array(sig))}`;
}

describe('Owner login', () => {
	it('refuses a wrong password', async () => {
		expect(await catalog.login('nope')).toEqual({ ok: false, error: 'wrong-password' });
	});

	it('issues a token for the right password that verifies', async () => {
		const result = await catalog.login('test-password');
		expect(result.ok).toBe(true);
		if (result.ok) expect(await catalog.verifyToken(result.token)).toBe(true);
	});

	it('refuses every login when the secrets are not configured', async () => {
		const unset = createCatalog({ ...env, OWNER_PASSWORD: '', JWT_SECRET: '' });
		expect(await unset.login('')).toEqual({ ok: false, error: 'wrong-password' });
		expect(await unset.login('anything')).toEqual({ ok: false, error: 'wrong-password' });
	});

	it('rejects garbage, tampered, wrongly signed and expired tokens', async () => {
		const exp = Math.floor(Date.now() / 1000);
		expect(await catalog.verifyToken('')).toBe(false);
		expect(await catalog.verifyToken('a.b.c')).toBe(false);
		expect(await catalog.verifyToken(token.slice(0, -2) + 'xx')).toBe(false);
		expect(await catalog.verifyToken(await signJwt({ exp: exp + 3600 }, 'other-secret'))).toBe(
			false
		);
		expect(await catalog.verifyToken(await signJwt({ exp: exp - 10 }, 'test-jwt-secret'))).toBe(
			false
		);
		expect(await catalog.verifyToken(await signJwt({ exp: exp + 3600 }, 'test-jwt-secret'))).toBe(
			true
		);
	});
});

describe('labels', () => {
	it('rejects a bad token with UnauthorizedError', async () => {
		await expect(catalog.labels('not-a-token')).rejects.toBeInstanceOf(UnauthorizedError);
		await expect(catalog.labels('')).rejects.toBeInstanceOf(UnauthorizedError);
	});

	it('maps each code name to its display word', async () => {
		expect(await catalog.labels(token)).toEqual({
			Aloft: 'Aloft',
			Grounded: 'Grounded',
			Nest: 'Nest',
			Seen: 'Seen',
			Flown: 'Flown',
			Lost: 'Lost',
			Roosted: 'Roosted'
		});
	});

	it('is empty when no label is seeded', async () => {
		await seedLabels([]);
		expect(await catalog.labels(token)).toEqual({});
	});
});
