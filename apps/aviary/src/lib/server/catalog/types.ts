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
	habitatId: number | null;
	/** Song names, by name. */
	songs: string[];
	/** The same Songs by id, for the Edit form. */
	songIds: number[];
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

/** The five flags of a Bird. */
export interface BirdFlags {
	seen: boolean;
	flown: boolean;
	lost: boolean;
	roosted: boolean;
	nest: boolean;
}

/** A Picture to store: the bytes the browser already cropped and resized. */
export interface PictureUpload {
	bytes: ArrayBuffer;
	contentType: string;
}

/**
 * One entry of the ordered Picture list of a form. `{ id }` keeps a stored Picture (Edit only); an upload is stored under a new random key. The first entry is the tile Picture.
 */
export type PictureInput = PictureUpload | { id: number };

/** What the Bird form sends, for Add and later Edit. */
export interface BirdInput {
	name: string;
	habitatId: number | null;
	songIds: number[];
	/** `YYYY-MM-DD`, `YYYY`, or null. */
	arrival: string | null;
	notes: string;
	flags: BirdFlags;
	pictures: PictureInput[];
}

/** Why a Bird form was refused. */
export type BirdInputError =
	| 'name-required'
	| 'picture-required'
	| 'picture-too-large'
	| 'picture-bad-type'
	| 'bad-habitat'
	| 'bad-song'
	| 'bad-arrival';

export type EditBirdResult =
	| { ok: true; pictureIds: number[] }
	| { ok: false; error: BirdInputError | 'not-found' | 'bad-picture' };

export type AddBirdResult =
	{ ok: true; id: number; pictureIds: number[] } | { ok: false; error: BirdInputError };

/** A Bird whose name matches what is being typed. Archived Birds are included, and marked. */
export interface SimilarBird extends BirdTile {
	archived: boolean;
}

export type ArchiveResult = { ok: true } | { ok: false; error: 'not-found' };
export type DeleteForeverResult = { ok: true } | { ok: false; error: 'not-found' | 'not-archived' };

export interface Catalog {
	login(password: string): Promise<LoginResult>;
	verifyToken(token: string): Promise<boolean>;
	/** The code-name to display-word map. Every operation but `login` and `verifyToken` takes the Owner token. */
	labels(token: string): Promise<Labels>;
	/** Tiles of one view, Archived excluded, Arrival newest first (a month or year sorts with days, none last). */
	listBirds(token: string, query: ListBirdsQuery): Promise<BirdTile[]>;
	/** Stores a new Bird with its ordered Pictures (bytes in R2 under random keys). */
	addBird(token: string, input: BirdInput): Promise<AddBirdResult>;
	/**
	 * Replaces every field of a Bird. `pictures` is the whole ordered list: `{ id }` keeps a stored
	 * Picture, an upload adds one, a Picture left out is deleted with its R2 object. At least one
	 * Picture stays. Seen stays on while the Bird has a Sighting, whatever `flags.seen` says.
	 */
	editBird(token: string, id: number, input: BirdInput): Promise<EditBirdResult>;
	/** Archives a Bird: it leaves every view, filter and search, and shows only in similar names. */
	archiveBird(token: string, id: number): Promise<ArchiveResult>;
	/** Brings an Archived Bird back to its view. */
	restoreBird(token: string, id: number): Promise<ArchiveResult>;
	/** Tiles of the Archived Birds, by name. */
	listArchivedBirds(token: string): Promise<BirdTile[]>;
	/**
	 * Deletes a Bird with its Pictures (rows and R2 objects), Sightings and Song links. Refused
	 * unless the Bird is Archived. The only delete of a Bird.
	 */
	deleteBirdForever(token: string, id: number): Promise<DeleteForeverResult>;
	/** Birds whose name contains `text` (ignoring case), Archived included. Empty under 3 characters. */
	findSimilarNames(token: string, text: string): Promise<SimilarBird[]>;
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
