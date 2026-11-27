import { describe, expect, it } from 'vitest';
import { formatTripDates } from './plan-calendar';

describe('formatTripDates', () => {
  it('shows the year once when both dates share it', () => {
    expect(formatTripDates('2025-03-27', '2025-04-21')).toBe('27 Mar — 21 Apr 2025');
  });

  it('shows both years when the trip crosses a year', () => {
    expect(formatTripDates('2025-12-28', '2026-01-05')).toBe('28 Dec 2025 — 5 Jan 2026');
  });
});
