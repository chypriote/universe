// Fixed month names: ICU's en-GB short month varies by runtime ("Sep" or "Sept").
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const wholeEuros = new Intl.NumberFormat('fr-FR', {
	style: 'currency',
	currency: 'EUR',
	maximumFractionDigits: 0
});
const numbers = new Intl.NumberFormat('fr-FR');

/** 1604.2 -> "1 604,20 €"; 412 -> "412,00 €", or "412 €" with `{ whole: true }`. */
export function formatEuros(amount: number, { whole = false } = {}): string {
	return (whole ? wholeEuros : euros).format(amount);
}

/** 160420 -> "1 604,20 €" */
export function formatCents(cents: number): string {
	return formatEuros(cents / 100);
}

/** 12345 -> "12 345" */
export function formatNumber(value: number): string {
	return numbers.format(value);
}

/**
 * A stored date, read as written (no time zone shift):
 * "2024-05-12" or "2024-05-12T08:30:00Z" -> "12 May 2024", "2024-05" -> "May 2024", "2024" -> "2024".
 */
export function formatDate(stored: string): string {
	const [year, month, day] = stored.slice(0, 10).split('-');
	if (!month) return year;
	const monthName = MONTHS[Number(month) - 1];
	return day ? `${Number(day)} ${monthName} ${year}` : `${monthName} ${year}`;
}

/** "2024-05-12" or "2024-05" -> "May 2024" */
export function formatMonth(stored: string): string {
	const [year, month] = stored.split('-');
	return `${MONTHS[Number(month) - 1]} ${year}`;
}

/** "2024-05-12" -> "12 May" */
export function formatDayMonth(stored: string): string {
	const [, month, day] = stored.split('-');
	return `${Number(day)} ${MONTHS[Number(month) - 1]}`;
}
