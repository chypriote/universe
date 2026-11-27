import { fail } from '@sveltejs/kit';
import {
	catalogFromPlatform,
	UnauthorizedError,
	type BirdBatchChange,
	type ValueKind
} from '#lib/server/catalog';
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
	const [habitats, songs, archived, aloft, grounded] = await Promise.all([
		catalog.listValues(token, 'habitat'),
		catalog.listValues(token, 'song'),
		catalog.listArchivedBirds(token),
		catalog.listBirds(token, { view: 'aloft' }),
		catalog.listBirds(token, { view: 'grounded' })
	]);
	// Aloft and Grounded together are every Bird that is not Archived.
	const birds = [...aloft, ...grounded].sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id);
	return { habitats, songs, archived, birds };
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

const FLAG_KEYS = ['seen', 'flown', 'lost', 'roosted', 'nest'] as const;

/** Reads the batch form: a blank field keeps the value, `on` and `off` set the flag, `none` clears the Habitat. */
function batchChange(form: FormData): BirdBatchChange {
	const change: BirdBatchChange = {};
	const habitat = String(form.get('habitat') ?? '');
	if (habitat === 'none') change.habitatId = null;
	else if (habitat !== '') change.habitatId = Number(habitat);
	for (const key of FLAG_KEYS) {
		const value = form.get(key);
		if (value === 'on' || value === 'off') (change.flags ??= {})[key] = value === 'on';
	}
	return change;
}

const BATCH_REFUSALS = {
	'not-found': 'SomethingWrong',
	'bad-habitat': 'BirdHabitatInvalid'
} as const;

export const actions: Actions = {
	editBirds: async ({ request, cookies }) => {
		const form = await request.formData();
		const ids = form.getAll('ids').map(Number);
		if (!ids.every(Number.isInteger)) return fail(400, { batchError: 'SomethingWrong' });
		try {
			const result = await catalogFromPlatform().editBirds(
				ownerToken(cookies),
				ids,
				batchChange(form)
			);
			if (!result.ok) return fail(400, { batchError: BATCH_REFUSALS[result.error] });
			return { batchError: null };
		} catch (error) {
			if (error instanceof UnauthorizedError) return fail(401, { batchError: 'Unauthorized' });
			throw error;
		}
	},
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
