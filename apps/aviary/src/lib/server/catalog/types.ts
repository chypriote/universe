/**
 * Public interface of the Catalog module: the one test seam.
 * Types only. Domain names follow GLOSSARY.md.
 */

export type LoginResult = { ok: true; token: string } | { ok: false; error: 'wrong-password' };

/** Code name to display word. A missing word falls back to the code name in the UI. */
export type Labels = Record<string, string>;

/** The three tabs. Grounded is computed from Flown or Lost; Nest is the Nest flag. */
export type BirdView = 'aloft' | 'grounded' | 'nest';

export interface ListBirdsQuery {
	view: BirdView;
}

/** What a tile shows. Roosted is never on a tile. */
export interface BirdTile {
	id: number;
	name: string;
	/** `YYYY-MM-DD`, `YYYY`, or null when unknown. */
	arrival: string | null;
	seen: boolean;
	flown: boolean;
	lost: boolean;
	nest: boolean;
	/** The first Picture, or null (the tile shows the initials). */
	pictureId: number | null;
}

export interface PictureObject {
	body: ReadableStream;
	contentType: string;
}

export interface Catalog {
	login(password: string): Promise<LoginResult>;
	verifyToken(token: string): Promise<boolean>;
	/** The code-name to display-word map. Every operation but `login` and `verifyToken` takes the Owner token. */
	labels(token: string): Promise<Labels>;
	/** Tiles of one view, Archived excluded, Arrival newest first (a year sorts with days, none last). */
	listBirds(token: string, query: ListBirdsQuery): Promise<BirdTile[]>;
	/** The R2 object of a Picture, or null when the Picture or its object is gone. */
	getPicture(token: string, id: number): Promise<PictureObject | null>;
}
