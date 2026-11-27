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

/** Refusals of the Archived list. */
const BIRD_REFUSALS = { 'not-found': 'SomethingWrong', 'not-archived': 'BirdNotArchived' } as const;

const asKind = (value: FormDataEntryValue | null): ValueKind | null =>
	value === 'habitat' || value === 'song' ? value : null;

export const load: PageServerLoad = async ({ cookies }) => {
	const catalog = catalogFromPlatform();
	const token = ownerToken(cookies);
	const [habitats, songs, archived] = await Promise.all([
		catalog.listValues(token, 'habitat'),
		catalog.listValues(token, 'song'),
		catalog.listArchivedBirds(token)
	]);
	return { habitats, songs, archived };
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

/** Runs one change of an Archived Bird; a refusal comes back as a code name for the page to label. */
async function changeBird(
	request: Request,
	cookies: Parameters<typeof ownerToken>[0],
	run: (
		id: number,
		token: string
	) => Promise<{ ok: true } | { ok: false; error: keyof typeof BIRD_REFUSALS }>
) {
	const birdId = Number((await request.formData()).get('id'));
	if (!Number.isInteger(birdId)) return fail(400, { archivedError: 'SomethingWrong' });
	try {
		const result = await run(birdId, ownerToken(cookies));
		if (!result.ok) return fail(400, { archivedError: BIRD_REFUSALS[result.error] });
		return { archivedError: null };
	} catch (error) {
		if (error instanceof UnauthorizedError) return fail(401, { archivedError: 'Unauthorized' });
		throw error;
	}
}

export const actions: Actions = {
	restore: ({ request, cookies }) =>
		changeBird(request, cookies, (birdId, token) =>
			catalogFromPlatform().restoreBird(token, birdId)
		),
	deleteForever: ({ request, cookies }) =>
		changeBird(request, cookies, (birdId, token) =>
			catalogFromPlatform().deleteBirdForever(token, birdId)
		),
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
