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
 * One entry of the ordered Picture list of a form. `{ id }` keeps a stored Picture (Edit only,
 * #285); an upload is stored under a new random key. The first entry is the tile Picture.
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

export type AddBirdResult =
	{ ok: true; id: number; pictureIds: number[] } | { ok: false; error: BirdInputError };

/** A Bird whose name matches what is being typed. Archived Birds are included, and marked. */
export interface SimilarBird extends BirdTile {
	archived: boolean;
}

export interface Catalog {
	login(password: string): Promise<LoginResult>;
	verifyToken(token: string): Promise<boolean>;
	/** The code-name to display-word map. Every operation but `login` and `verifyToken` takes the Owner token. */
	labels(token: string): Promise<Labels>;
	/** Tiles of one view, Archived excluded, Arrival newest first (a year sorts with days, none last). */
	listBirds(token: string, query: ListBirdsQuery): Promise<BirdTile[]>;
	/** Stores a new Bird with its ordered Pictures (bytes in R2 under random keys). */
	addBird(token: string, input: BirdInput): Promise<AddBirdResult>;
	/** Birds whose name contains `text` (ignoring case), Archived included. Empty under 3 characters. */
	findSimilarNames(token: string, text: string): Promise<SimilarBird[]>;
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
