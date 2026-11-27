/** The Owner's local day as `YYYY-MM-DD`: the day "Add a sighting" records. */
export function today(now: Date = new Date()): string {
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
