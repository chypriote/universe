import { describe, expect, it } from 'vitest';
import { label } from './labels';

describe('label', () => {
	it('shows the display word of a code name', () => {
		expect(label({ Aloft: 'Aloft' }, 'Aloft')).toBe('Aloft');
	});

	it('falls back to the code name when the label is missing or empty', () => {
		expect(label({}, 'Grounded')).toBe('Grounded');
		expect(label({ Grounded: '' }, 'Grounded')).toBe('Grounded');
	});
});
