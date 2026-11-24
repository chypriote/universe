import { env } from 'cloudflare:workers';
import { clearOwnerToken } from '@universe/owner/astro';
import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = ({ cookies, redirect }) => {
  clearOwnerToken(cookies, env.OWNER_COOKIE_DOMAIN);
  return redirect('/admin/login', 303);
};
