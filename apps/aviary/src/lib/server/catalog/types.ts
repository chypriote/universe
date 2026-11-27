/**
 * Public interface of the Catalog module: the one test seam.
 * Types only. Domain names follow GLOSSARY.md.
 */

export type LoginResult = { ok: true; token: string } | { ok: false; error: 'wrong-password' };

/** Code name to display word. A missing word falls back to the code name in the UI. */
export type Labels = Record<string, string>;

export interface Catalog {
	login(password: string): Promise<LoginResult>;
	verifyToken(token: string): Promise<boolean>;
	/** The code-name to display-word map. Every operation but `login` and `verifyToken` takes the Owner token. */
	labels(token: string): Promise<Labels>;
}
