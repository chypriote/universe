import { describe, expect, it } from 'vitest';
import {
	formatCents,
	formatDate,
	formatDayMonth,
	formatEuros,
	formatMonth,
	formatNumber,
	monthName
} from './format';

// Intl puts no-break spaces in French numbers.
const plain = (s: string) => s.replace(/[\u202f\u00a0]/g, ' ');

describe('money and numbers', () => {
	it('writes euros the French way', () => {
		expect(plain(formatEuros(1604.2))).toBe('1 604,20 €');
		expect(plain(formatEuros(412, { whole: true }))).toBe('412 €');
		expect(plain(formatCents(160420))).toBe('1 604,20 €');
	});

	it('groups numbers the French way', () => {
		expect(plain(formatNumber(12345))).toBe('12 345');
	});
});

describe('dates', () => {
	it('writes dates the English way, never the American way', () => {
		expect(formatDate('2024-05-12')).toBe('12 May 2024');
		expect(formatDate('2024-09-03T23:30:00Z')).toBe('3 Sep 2024');
		expect(formatDate('2024-05')).toBe('May 2024');
		expect(formatDate('2024')).toBe('2024');
		expect(formatMonth('2024-11-02')).toBe('Nov 2024');
		expect(formatDayMonth('2024-11-02')).toBe('2 Nov');
		expect(monthName('2024-09-30')).toBe('Sep');
	});
});
