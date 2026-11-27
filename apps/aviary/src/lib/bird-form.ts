import { arrivalPrecision } from './arrival';
import type { PictureItem } from './picture-list';

/** The Bird form as the fields hold it. Add starts empty; Edit (#285) starts from a Bird. */
export interface BirdFormState {
	name: string;
	/** A Habitat id, or '' for none. */
	habitatId: string;
	songIds: string[];
	/** `YYYY-MM-DD`, `YYYY`, or ''. */
	arrival: string;
	notes: string;
	flags: { seen: boolean; flown: boolean; lost: boolean; roosted: boolean; nest: boolean };
}

export function emptyBirdForm(): BirdFormState {
	return {
		name: '',
		habitatId: '',
		songIds: [],
		arrival: '',
		notes: '',
		flags: { seen: false, flown: false, lost: false, roosted: false, nest: false }
	};
}

/** The label code name of the first problem, or null when the form may be sent. */
export function validateBirdForm(form: BirdFormState, pictureCount: number): string | null {
	if (!form.name.trim()) return 'BirdNameRequired';
	if (pictureCount === 0) return 'BirdPictureRequired';
	const arrival = form.arrival.trim();
	if (arrival && !arrivalPrecision(arrival)) return 'BirdArrivalInvalid';
	return null;
}

/**
 * The wire format of Add and Edit: a JSON `payload` with the fields and the ordered Picture list
 * (`{ id }` kept, `{ upload: true }` new), and the new files as `picture` entries in that order.
 */
export function buildBirdFormData(form: BirdFormState, pictures: PictureItem[]): FormData {
	const data = new FormData();
	data.set(
		'payload',
		JSON.stringify({
			name: form.name.trim(),
			habitatId: form.habitatId === '' ? null : Number(form.habitatId),
			songIds: form.songIds.map(Number),
			arrival: form.arrival.trim() || null,
			notes: form.notes,
			flags: form.flags,
			pictures: pictures.map((p) => (p.blob ? { upload: true } : { id: p.id }))
		})
	);
	for (const p of pictures) if (p.blob) data.append('picture', p.blob, 'picture.jpg');
	return data;
}
