/** Initials tile for a Bird with no Picture (COMPONENTS.md, BirdTile). */

/** First letters of the first two words of the name, upper case. */
export function initials(name: string): string {
	const words = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
	if (words.length === 0) return '?';
	return words.map((w) => Array.from(w)[0].toLocaleUpperCase()).join('');
}

/** Tint classes of the initials square, picked by the name's character codes. */
const TINTS = ['bg-highlight', 'bg-success', 'bg-info', 'bg-primary'] as const;

export function tintClass(name: string): string {
	let sum = 0;
	for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
	return TINTS[sum % TINTS.length];
}
