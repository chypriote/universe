/** `day` for a real `YYYY-MM-DD`, `month` for `YYYY-MM`, `year` for `YYYY`, null for anything else. */
export function arrivalPrecision(text: string): 'day' | 'month' | 'year' | null {
	if (/^\d{4}$/.test(text)) return 'year';
	if (/^\d{4}-(0[1-9]|1[0-2])$/.test(text)) return 'month';
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
	if (!match) return null;
	const [, y, m, d] = match.map(Number);
	const date = new Date(Date.UTC(y, m - 1, d));
	const real =
		date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
	return real ? 'day' : null;
}
