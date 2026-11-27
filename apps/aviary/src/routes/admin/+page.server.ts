import { fail } from '@sveltejs/kit';
import { catalogFromPlatform, type BirdBatchChange, type ValueKind } from '#lib/server/catalog';
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

export const load: PageServerLoad = async () => {
	const catalog = catalogFromPlatform();
	const [habitats, songs, archived, birds] = await Promise.all([
		catalog.listValues('habitat'),
		catalog.listValues('song'),
		catalog.listArchivedBirds(),
		catalog.listBatchBirds()
	]);
	return { habitats, songs, archived, birds };
};

/** Runs one list change; a refusal comes back as a code name for the page to label. */
async function change(
	request: Request,
	run: (
		kind: ValueKind,
		form: FormData
	) => Promise<{ ok: true } | { ok: false; error: keyof typeof REFUSALS }>
) {
	const form = await request.formData();
	const kind = asKind(form.get('kind'));
	if (!kind) return fail(400, { kind: 'habitat' as const, error: REFUSALS['not-found'] });
	const result = await run(kind, form);
	if (!result.ok) return fail(400, { kind, error: REFUSALS[result.error] });
	return { kind, error: null };
}

const id = (form: FormData, key: string) => Number(form.get(key));

/** Runs one change of an Archived Bird; a refusal comes back as a code name for the page to label. */
async function changeBird(
	request: Request,
	run: (id: number) => Promise<{ ok: true } | { ok: false; error: keyof typeof BIRD_REFUSALS }>
) {
	const birdId = Number((await request.formData()).get('id'));
	if (!Number.isInteger(birdId)) return fail(400, { archivedError: 'SomethingWrong' });
	const result = await run(birdId);
	if (!result.ok) return fail(400, { archivedError: BIRD_REFUSALS[result.error] });
	return { archivedError: null };
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
	editBirds: async ({ request }) => {
		const form = await request.formData();
		const ids = form.getAll('ids').map(Number);
		if (!ids.every(Number.isInteger)) return fail(400, { batchError: 'SomethingWrong' });
		const result = await catalogFromPlatform().editBirds(ids, batchChange(form));
		if (!result.ok) return fail(400, { batchError: BATCH_REFUSALS[result.error] });
		return { batchError: null };
	},
	restore: ({ request }) =>
		changeBird(request, (birdId) => catalogFromPlatform().restoreBird(birdId)),
	deleteForever: ({ request }) =>
		changeBird(request, (birdId) => catalogFromPlatform().deleteBirdForever(birdId)),
	add: ({ request }) =>
		change(request, (kind, form) =>
			catalogFromPlatform().addValue(kind, String(form.get('name') ?? ''))
		),
	rename: ({ request }) =>
		change(request, (kind, form) =>
			catalogFromPlatform().renameValue(kind, id(form, 'id'), String(form.get('name') ?? ''))
		),
	remove: ({ request }) =>
		change(request, (kind, form) => {
			const moveTo = form.get('moveTo');
			return catalogFromPlatform().removeValue(
				kind,
				id(form, 'id'),
				moveTo === null || moveTo === '' ? undefined : Number(moveTo)
			);
		})
};
