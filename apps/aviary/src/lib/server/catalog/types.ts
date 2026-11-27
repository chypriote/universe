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

/** One meeting with a Bird. */
export interface Sighting {
	id: number;
	/** `YYYY-MM-DD`, or null when the day is unknown. */
	day: string | null;
}

/** The popup view of one Bird. */
export interface BirdDetail {
	id: number;
	name: string;
	arrival: string | null;
	/** The Habitat name, or null. */
	habitat: string | null;
	/** Song names, by name. */
	songs: string[];
	notes: string;
	seen: boolean;
	flown: boolean;
	lost: boolean;
	roosted: boolean;
	nest: boolean;
	/** Picture ids in order; the first is the tile Picture. */
	pictureIds: number[];
	/** Newest day first, unknown days last. */
	sightings: Sighting[];
}

export type AddSightingResult =
	{ ok: true; id: number } | { ok: false; error: 'not-found' | 'bad-day' };

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
	/** The popup view of a Bird, or null when there is no such Bird. */
	getBird(token: string, id: number): Promise<BirdDetail | null>;
	/** Adds a Sighting (`YYYY-MM-DD`, or no day). The first Sighting turns Seen on. */
	addSighting(token: string, birdId: number, day?: string): Promise<AddSightingResult>;
	/** Changes a Sighting's day, or clears it with null. */
	setSightingDay(
		token: string,
		id: number,
		day: string | null
	): Promise<ValueResult<'not-found' | 'bad-day'>>;
	/** Deletes a Sighting. Seen stays on: it is only forced, never cleared. */
	deleteSighting(token: string, id: number): Promise<ValueResult<'not-found'>>;
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
