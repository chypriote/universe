import { describe, expect, it } from 'vitest';
import { movePicture, removePicture, type PictureItem } from './picture-list';

const item = (key: string): PictureItem => ({ key, url: `u-${key}` });
const keys = (items: PictureItem[]) => items.map((i) => i.key);

describe('PictureList operations', () => {
	const list = [item('a'), item('b'), item('c')];

	it('moves a Picture earlier and later', () => {
		expect(keys(movePicture(list, 2, 0))).toEqual(['c', 'a', 'b']);
		expect(keys(movePicture(list, 0, 1))).toEqual(['b', 'a', 'c']);
	});
	it('ignores a move outside the list', () => {
		expect(keys(movePicture(list, 0, -1))).toEqual(['a', 'b', 'c']);
		expect(keys(movePicture(list, 2, 3))).toEqual(['a', 'b', 'c']);
	});
	it('removes a Picture without touching the input', () => {
		expect(keys(removePicture(list, 1))).toEqual(['a', 'c']);
		expect(list).toHaveLength(3);
	});
});
