/**
 * Public interface of the Catalog module: the one test seam.
 * Types only. Domain names follow GLOSSARY.md.
 */

export type LoginResult = { ok: true; token: string } | { ok: false; error: 'wrong-password' };

/** Code name to display word. A missing word falls back to the code name in the UI. */
export type Labels = Record<string, string>;

/** The three tabs. Grounded is computed from Flown or Lost; Nest is the Nest flag. */
export type BirdView = 'aloft' | 'grounded' | 'nest';

/** The Nest filter: every Bird, only Nest Birds, or only Birds not in the Nest. */
export type NestFilter = 'all' | 'only' | 'not';

export interface ListBirdsQuery {
	view: BirdView;
	/** Habitat id. */
	habitat?: number;
	/** Song id. */
	song?: number;
	nest?: NestFilter;
	/** Part of the name, ignoring case. Blank means no search. */
	search?: string;
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

/** The two Admin lists. */
export type ValueKind = 'habitat' | 'song';

/** A Habitat or Song value, with the number of Birds that use it. */
export interface ListValue {
	id: number;
	name: string;
	uses: number;
}

export type ValueResult<E extends string> = { ok: true } | { ok: false; error: E };
export type AddValueResult = { ok: true; id: number } | { ok: false; error: 'empty' | 'duplicate' };

export interface Catalog {
	login(password: string): Promise<LoginResult>;
	verifyToken(token: string): Promise<boolean>;
	/** The code-name to display-word map. Every operation but `login` and `verifyToken` takes the Owner token. */
	labels(token: string): Promise<Labels>;
	/** Tiles of one view, Archived excluded, Arrival newest first (a year sorts with days, none last). */
	listBirds(token: string, query: ListBirdsQuery): Promise<BirdTile[]>;
	/** The R2 object of a Picture, or null when the Picture or its object is gone. */
	getPicture(token: string, id: number): Promise<PictureObject | null>;
	/** Every value of a list, by name, with its usage. */
	listValues(token: string, kind: ValueKind): Promise<ListValue[]>;
	addValue(token: string, kind: ValueKind, name: string): Promise<AddValueResult>;
	renameValue(
		token: string,
		kind: ValueKind,
		id: number,
		name: string
	): Promise<ValueResult<'empty' | 'duplicate' | 'not-found'>>;
	/**
	 * Removes a value. A value in use is refused without `moveTo`; with it, every Bird
	 * moves to that value first (a Bird that has both gets it once).
	 */
	removeValue(
		token: string,
		kind: ValueKind,
		id: number,
		moveTo?: number
	): Promise<ValueResult<'in-use' | 'not-found' | 'bad-target'>>;
}
