import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { createJournal } from './index';

const journal = createJournal(env);

/** A token signed like the Owner login does, with the claims and secret the test picks. */
async function signJwt(claims: Record<string, unknown>, secret: string) {
  const encoder = new TextEncoder();
  const base64Url = (bytes: Uint8Array) =>
    btoa(String.fromCharCode(...bytes))
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replaceAll('=', '');
  const head = base64Url(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = base64Url(encoder.encode(JSON.stringify(claims)));
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${head}.${body}`));
  return `${head}.${body}.${base64Url(new Uint8Array(signature))}`;
}

describe('Owner login', () => {
  it('refuses a wrong password', async () => {
    expect(await journal.login('nope')).toEqual({ ok: false, error: 'wrong-password' });
  });

  it('refuses an empty password', async () => {
    expect(await journal.login('')).toEqual({ ok: false, error: 'wrong-password' });
  });

  it('issues a token for the right password that verifies', async () => {
    const result = await journal.login('test-password');
    expect(result.ok).toBe(true);
    if (result.ok) expect(await journal.verifyToken(result.token)).toBe(true);
  });

  it('issues an HS256 token that lasts 90 days, as in the other apps', async () => {
    const result = await journal.login('test-password');
    if (!result.ok) throw new Error('login failed');
    const [head, body] = result.token
      .split('.')
      .slice(0, 2)
      .map((part) => JSON.parse(atob(part.replaceAll('-', '+').replaceAll('_', '/'))));
    expect(head.alg).toBe('HS256');
    expect(body.exp - body.iat).toBe(60 * 60 * 24 * 90);
  });

  it('rejects garbage, tampered, wrongly signed and expired tokens', async () => {
    const result = await journal.login('test-password');
    if (!result.ok) throw new Error('login failed');
    const now = Math.floor(Date.now() / 1000);
    expect(await journal.verifyToken('')).toBe(false);
    expect(await journal.verifyToken('a.b.c')).toBe(false);
    expect(await journal.verifyToken(result.token.slice(0, -2) + 'xx')).toBe(false);
    expect(await journal.verifyToken(await signJwt({ exp: now + 3600 }, 'other-secret'))).toBe(
      false,
    );
    expect(await journal.verifyToken(await signJwt({ exp: now - 10 }, 'test-jwt-secret'))).toBe(
      false,
    );
    expect(await journal.verifyToken(await signJwt({ exp: now + 3600 }, 'test-jwt-secret'))).toBe(
      true,
    );
  });
});
