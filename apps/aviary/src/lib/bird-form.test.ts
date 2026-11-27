import { describe, expect, it } from 'vitest';
import { buildBirdFormData, emptyBirdForm, validateBirdForm } from './bird-form';
import { parseBirdForm } from './server/bird-input';

const blob = (text: string) => new Blob([text], { type: 'image/jpeg' });

describe('validateBirdForm', () => {
	it('needs a name', () => {
		const form = { ...emptyBirdForm(), name: '  ' };
		expect(validateBirdForm(form, 1)).toBe('BirdNameRequired');
	});
	it('needs a Picture', () => {
		const form = { ...emptyBirdForm(), name: 'X' };
		expect(validateBirdForm(form, 0)).toBe('BirdPictureRequired');
	});
	it('refuses a bad Arrival', () => {
		const form = { ...emptyBirdForm(), name: 'X', arrival: '2024-02-30' };
		expect(validateBirdForm(form, 1)).toBe('BirdArrivalInvalid');
	});
	it('accepts a day, a year, or nothing', () => {
		for (const arrival of ['2024-05-12', '2024', '']) {
			expect(validateBirdForm({ ...emptyBirdForm(), name: 'X', arrival }, 1)).toBeNull();
		}
	});
});

describe('form data round trip', () => {
	it('carries the fields and the Pictures in order to the server parser', async () => {
		const form = {
			...emptyBirdForm(),
			name: ' Bird One ',
			habitatId: '4',
			songIds: ['2', '3'],
			arrival: '2024',
			notes: 'n',
			flags: { seen: true, flown: false, lost: false, roosted: true, nest: false }
		};
		const data = buildBirdFormData(form, [
			{ key: 'a', url: '', blob: blob('one') },
			{ key: 'b', url: '', blob: blob('two') }
		]);
		const parsed = await parseBirdForm(data);
		if ('error' in parsed) throw new Error('parse failed');
		expect(parsed).toMatchObject({
			name: 'Bird One',
			habitatId: 4,
			songIds: [2, 3],
			arrival: '2024',
			notes: 'n',
			flags: { seen: true, flown: false, lost: false, roosted: true, nest: false }
		});
		expect(parsed.pictures).toHaveLength(2);
		const texts = parsed.pictures.map((p) =>
			'bytes' in p ? new TextDecoder().decode(p.bytes) : null
		);
		expect(texts).toEqual(['one', 'two']);
	});

	it('keeps stored Pictures by id, in order, between uploads (for Edit)', async () => {
		const data = buildBirdFormData({ ...emptyBirdForm(), name: 'X' }, [
			{ key: 'a', url: '', id: 7 },
			{ key: 'b', url: '', blob: blob('new') },
			{ key: 'c', url: '', id: 9 }
		]);
		const parsed = await parseBirdForm(data);
		if ('error' in parsed) throw new Error('parse failed');
		expect(parsed.pictures.map((p) => ('id' in p ? p.id : 'new'))).toEqual([7, 'new', 9]);
	});

	it('maps no Habitat to null and an empty Arrival to null', async () => {
		const parsed = await parseBirdForm(buildBirdFormData({ ...emptyBirdForm(), name: 'X' }, []));
		if ('error' in parsed) throw new Error('parse failed');
		expect(parsed).toMatchObject({ habitatId: null, arrival: null, songIds: [] });
	});

	it('rejects a form without a readable payload', async () => {
		expect(await parseBirdForm(new FormData())).toEqual({ error: 'bad-form' });
	});
});
