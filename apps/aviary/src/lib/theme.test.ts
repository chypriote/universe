import { describe, expect, it } from 'vitest';
const css = Object.values(
	import.meta.glob<string>('../app.css', { query: '?raw', import: 'default', eager: true })
)[0];

/** The Parakeet slots, read from the stylesheet: `--name: light` or `light-dark(light, dark)`. */
function slot(name: string, mode: 'light' | 'dark'): string {
	const match = css.match(new RegExp(`--${name}:\\s*([^;]+);`));
	if (!match) throw new Error(`Slot --${name} is not set in app.css`);
	return resolveValue(match[1].trim(), mode, name);
}

/** A hex colour, `var(--other)` or `light-dark(a, b)` of those. */
function resolveValue(value: string, mode: 'light' | 'dark', name: string): string {
	if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
	const reference = value.match(/^var\(--([a-z0-9-]+)\)$/);
	if (reference) return slot(reference[1], mode);
	const pair = value.match(/^light-dark\(\s*(.+?)\s*,\s*(.+?)\s*\)$/);
	if (pair) return resolveValue(pair[mode === 'light' ? 1 : 2], mode, name);
	throw new Error(`Slot --${name} is not a colour: ${value}`);
}

function luminance(hex: string) {
	const [r, g, b] = [1, 3, 5]
		.map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
		.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

// Shared Showcase colours (packages/showcase/TOKENS.md, "Semantic bindings").
const SHARED = {
	light: {
		surface: '#ffffff',
		muted: '#5a6a8e',
		onAccent: '#101a3a',
		focus: '#258dff',
		fieldBorder: '#5a6a8e',
		error: '#c9342a'
	},
	dark: {
		page: '#101a3a',
		surface: '#19254d',
		muted: '#a3b1d9',
		onAccent: '#101a3a',
		focus: '#5aa9ff',
		fieldBorder: '#a3b1d9',
		error: '#ff6f63'
	}
};

describe('Parakeet theme slots', () => {
	it('sets the values decided for the theme', () => {
		expect(slot('theme-page', 'light')).toBe('#eef9dc');
		expect(slot('theme-line', 'light')).toBe('#d6ecb6');
		expect(slot('theme-ink-dark', 'dark')).toBe('#eef9dc');
		expect(slot('theme-accent', 'light')).toBe('#8fd14f');
		expect(slot('theme-accent', 'dark')).toBe('#a3e05f');
		expect(slot('theme-icon-accent', 'light')).toBe('#3f7d0e');
		expect(slot('theme-icon-accent', 'dark')).toBe('#a3e05f');
	});

	for (const mode of ['light', 'dark'] as const) {
		describe(`contrast table, ${mode}`, () => {
			const page = mode === 'light' ? slot('theme-page', 'light') : SHARED.dark.page;
			const surface = SHARED[mode].surface;
			const accent = slot('theme-accent', mode);
			const iconAccent = slot('theme-icon-accent', mode);

			it('passes every text pair at 4.5', () => {
				const ink = mode === 'light' ? '#1a2f6b' : slot('theme-ink-dark', 'dark');
				expect(contrast(ink, page)).toBeGreaterThanOrEqual(4.5);
				expect(contrast(SHARED[mode].muted, page)).toBeGreaterThanOrEqual(4.5);
				expect(contrast(SHARED[mode].muted, surface)).toBeGreaterThanOrEqual(4.5);
				expect(contrast(SHARED[mode].onAccent, accent)).toBeGreaterThanOrEqual(4.5);
				expect(contrast(SHARED[mode].error, page)).toBeGreaterThanOrEqual(4.5);
			});

			it('passes every icon, focus and border pair at 3', () => {
				expect(contrast(iconAccent, page)).toBeGreaterThanOrEqual(3);
				expect(contrast(SHARED[mode].focus, page)).toBeGreaterThanOrEqual(3);
				expect(contrast(SHARED[mode].fieldBorder, page)).toBeGreaterThanOrEqual(3);
			});

			it('keeps the login parakeets readable: outline on the page, wing and beak on the body', () => {
				const body = slot('parakeet-body', mode);
				expect(contrast(slot('parakeet-outline', mode), page)).toBeGreaterThanOrEqual(3);
				expect(contrast(slot('parakeet-wing', mode), body)).toBeGreaterThanOrEqual(3);
				expect(contrast(slot('parakeet-beak', mode), body)).toBeGreaterThanOrEqual(3);
				if (mode === 'dark') expect(contrast(body, page)).toBeGreaterThanOrEqual(3);
			});
		});
	}
});
