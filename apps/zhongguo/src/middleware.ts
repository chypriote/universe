import { defineMiddleware } from 'astro:middleware';
import { ownerToken } from '@universe/owner/astro';
import { ownerLogin } from '@/lib/journal';

const ADMIN_PAGES = /^\/admin(\/|$)/;
const ADMIN_API = /^\/api\/admin(\/|$)/;
const LOGIN = '/admin/login';

/** Every admin page and admin API needs a valid Owner login; the login page is the one way in. */
export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname.replace(/(.)\/$/, '$1');
  const isApi = ADMIN_API.test(path);
  if ((!isApi && !ADMIN_PAGES.test(path)) || path === LOGIN) return next();

  const token = ownerToken(context.cookies);
  if (token && (await ownerLogin().verifyToken(token))) return next();

  if (isApi) return Response.json({ error: 'Owner login required' }, { status: 401 });
  return context.redirect(LOGIN, 303);
});
