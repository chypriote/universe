import { fail } from '@sveltejs/kit';
import { catalogFromPlatform, UnauthorizedError, type ValueKind } from '#lib/server/catalog';
import { ownerToken } from '@universe/owner/cookie';
import type { Actions, PageServerLoad } from './$types';

/** Label code names for each refusal. The page shows `label(code)`. */
const REFUSALS = {
	empty: 'ValueEmpty',
	duplicate: 'ValueDuplicate',
	'not-found': 'ValueNotFound',
	'in-use': 'ValueInUse',
	'bad-target': 'ValueBadTarget'
} as const;

const asKind = (value: FormDataEntryValue | null): ValueKind | null =>
	value === 'habitat' || value === 'song' ? value : null;

export const load: PageServerLoad = async ({ cookies }) => {
	const catalog = catalogFromPlatform();
	const token = ownerToken(cookies);
	const [habitats, songs] = await Promise.all([
		catalog.listValues(token, 'habitat'),
		catalog.listValues(token, 'song')
	]);
	return { habitats, songs };
};

/** Runs one list change; a refusal comes back as a code name for the page to label. */
async function change(
	request: Request,
	cookies: Parameters<typeof ownerToken>[0],
	run: (
		kind: ValueKind,
		form: FormData,
		token: string
	) => Promise<{ ok: true } | { ok: false; error: keyof typeof REFUSALS }>
) {
	const form = await request.formData();
	const kind = asKind(form.get('kind'));
	if (!kind) return fail(400, { kind: 'habitat' as const, error: REFUSALS['not-found'] });
	try {
		const result = await run(kind, form, ownerToken(cookies));
		if (!result.ok) return fail(400, { kind, error: REFUSALS[result.error] });
		return { kind, error: null };
	} catch (error) {
		if (error instanceof UnauthorizedError) return fail(401, { kind, error: 'Unauthorized' });
		throw error;
	}
}

const id = (form: FormData, key: string) => Number(form.get(key));

export const actions: Actions = {
	add: ({ request, cookies }) =>
		change(request, cookies, (kind, form, token) =>
			catalogFromPlatform().addValue(token, kind, String(form.get('name') ?? ''))
		),
	rename: ({ request, cookies }) =>
		change(request, cookies, (kind, form, token) =>
			catalogFromPlatform().renameValue(token, kind, id(form, 'id'), String(form.get('name') ?? ''))
		),
	remove: ({ request, cookies }) =>
		change(request, cookies, (kind, form, token) => {
			const moveTo = form.get('moveTo');
			return catalogFromPlatform().removeValue(
				token,
				kind,
				id(form, 'id'),
				moveTo === null || moveTo === '' ? undefined : Number(moveTo)
			);
		})
};
