import type { BirdInput, PictureInput } from './catalog/types';

/**
 * Reads the Bird form data (see `buildBirdFormData`) into Catalog input. Shared by Add and Edit.
 * The Catalog does the real checks; this only refuses what cannot be read.
 */
export async function parseBirdForm(form: FormData): Promise<BirdInput | { error: 'bad-form' }> {
	const bad = { error: 'bad-form' } as const;
	let payload: Record<string, unknown>;
	try {
		payload = JSON.parse(String(form.get('payload')));
	} catch {
		return bad;
	}
	if (!payload || typeof payload !== 'object') return bad;
	const { name, habitatId, songIds, arrival, notes, flags, pictures } = payload as {
		name?: unknown;
		habitatId?: unknown;
		songIds?: unknown;
		arrival?: unknown;
		notes?: unknown;
		flags?: Record<string, unknown>;
		pictures?: unknown;
	};
	if (typeof name !== 'string' || typeof notes !== 'string') return bad;
	if (habitatId !== null && !Number.isInteger(habitatId)) return bad;
	if (arrival !== null && typeof arrival !== 'string') return bad;
	if (!Array.isArray(songIds) || !songIds.every(Number.isInteger)) return bad;
	if (!Array.isArray(pictures) || !flags) return bad;

	const files = form.getAll('picture').filter((f): f is File => typeof f !== 'string');
	let next = 0;
	const list: PictureInput[] = [];
	for (const entry of pictures as { id?: unknown; upload?: unknown }[]) {
		if (entry?.upload === true) {
			const file = files[next++];
			if (!file) return bad;
			list.push({ bytes: await file.arrayBuffer(), contentType: file.type });
		} else if (Number.isInteger(entry?.id)) {
			list.push({ id: entry.id as number });
		} else return bad;
	}
	if (next !== files.length) return bad;

	return {
		name,
		habitatId: habitatId as number | null,
		songIds: songIds as number[],
		arrival: arrival as string | null,
		notes,
		flags: {
			seen: flags.seen === true,
			flown: flags.flown === true,
			lost: flags.lost === true,
			roosted: flags.roosted === true,
			nest: flags.nest === true
		},
		pictures: list
	};
}
