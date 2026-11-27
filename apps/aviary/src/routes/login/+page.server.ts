import { env } from 'cloudflare:workers';
import { fail, redirect } from '@sveltejs/kit';
import { catalogFromPlatform } from '#lib/server/catalog';
import { safeNext } from '#lib/server/guard';
import { ownerToken, setOwnerToken } from '@universe/owner/cookie';
import type { Actions, PageServerLoad } from './$types';

// Someone who is already logged in has nothing to do here: back to the page they came from.
export const load: PageServerLoad = async ({ cookies, url }) => {
	const token = ownerToken(cookies);
	if (token !== '' && (await catalogFromPlatform().verifyToken(token))) {
		redirect(303, safeNext(url.searchParams.get('next')));
	}
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const password = String((await request.formData()).get('password') ?? '');
		const result = await catalogFromPlatform().login(password);
		if (!result.ok) return fail(400, { error: 'Wrong password' });
		setOwnerToken(cookies, result.token, url.protocol === 'https:', env.OWNER_COOKIE_DOMAIN);
		redirect(303, safeNext(url.searchParams.get('next')));
	}
};
