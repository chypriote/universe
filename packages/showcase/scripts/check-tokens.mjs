// Fails when a Showcase component uses a raw colour, type size, shadow or radius
// instead of a token. Token values live in src/showcase.css.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = new URL('../src/components/', import.meta.url).pathname;

const rules = [
	[/(?:\[|:\s*)#[0-9a-fA-F]{3,8}\b/, 'hex colour'],
	[/\b(?:rgba?|hsla?|oklch|oklab|color-mix)\(/, 'colour function'],
	[/\b(?:text|shadow|rounded)-\[/, 'arbitrary type, shadow or radius value']
];

const failures = [];
for (const file of readdirSync(dir).filter((f) => f.endsWith('.svelte'))) {
	readFileSync(join(dir, file), 'utf8')
		.split('\n')
		.forEach((line, i) => {
			for (const [pattern, what] of rules) {
				if (pattern.test(line)) failures.push(`${file}:${i + 1} ${what}: ${line.trim()}`);
			}
		});
}

if (failures.length) {
	console.error(`Use a token from src/showcase.css instead:\n${failures.join('\n')}`);
	process.exit(1);
}
