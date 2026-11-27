import { describe, expect, it } from 'vitest';
import { initials, tintClass } from './tile';

describe('initials', () => {
	it('takes the first letters of the first two words, upper case', () => {
		expect(initials('green wing')).toBe('GW');
		expect(initials('one two three')).toBe('OT');
		expect(initials('solo')).toBe('S');
	});

	it('falls back to a question mark for an empty name', () => {
		expect(initials('  ')).toBe('?');
	});
});

describe('tintClass', () => {
	it('is stable for a name', () => {
		expect(tintClass('green wing')).toBe(tintClass('green wing'));
	});
});
