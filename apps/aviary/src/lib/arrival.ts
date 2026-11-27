/** `day` for a real `YYYY-MM-DD`, `year` for `YYYY`, null for anything else. */
export function arrivalPrecision(text: string): 'day' | 'year' | null {
	if (/^\d{4}$/.test(text)) return 'year';
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
	if (!match) return null;
	const [, y, m, d] = match.map(Number);
	const date = new Date(Date.UTC(y, m - 1, d));
	const real =
		date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
	return real ? 'day' : null;
}
