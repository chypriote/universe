import { describe, expect, it } from 'vitest';
import { today } from './sightings';

describe('today', () => {
	it('is the local day as YYYY-MM-DD, zero padded', () => {
		expect(today(new Date(2025, 0, 5, 23, 59))).toBe('2025-01-05');
		expect(today(new Date(2025, 10, 27, 0, 1))).toBe('2025-11-27');
	});
});
