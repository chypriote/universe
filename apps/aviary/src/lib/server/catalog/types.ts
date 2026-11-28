import type { LoginResult } from '@universe/owner/auth';

export type { LoginResult };
/**
 * Public interface of the Catalog module: the one test seam.
 * Types only. Domain names follow GLOSSARY.md.
 */

/** Code name to display word. A missing word falls back to the code name in the UI. */
export type Labels = Record<string, string>;

/** The tabs. Grounded is computed from Flown or Lost and no Songs; Seen is the Seen flag. */
export type BirdView = 'flock' | 'aloft' | 'grounded' | 'seen';

/** The Nest filter: every Bird, only Nest Birds, or only Birds not in the Nest. */
export type NestFilter = 'all' | 'only' | 'not';

/** The Seen filter: every Bird, only Seen Birds, or only Birds not Seen. */
export type SeenFilter = 'all' | 'only' | 'not';

/** The Roosted filter: every Bird, or only Roosted Birds. */
export type RoostedFilter = 'all' | 'only';

/** The Flown and Lost filters: every Bird, only Birds with that flag, or only Birds without it. */
export type FlagFilter = 'all' | 'only' | 'not';

export interface ListBirdsQuery {
	view: BirdView;
	/** Habitat id. */
	habitat?: number;
	/** Song id. */
	song?: number;
	seen?: SeenFilter;
	nest?: NestFilter;
	roosted?: RoostedFilter;
	flown?: FlagFilter;
	lost?: FlagFilter;
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

/** A tile with the Roosted flag, for the Admin batch list only. */
export type BatchBird = BirdTile & { roosted: boolean; habitatId: number | null };

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

/**
 * What a batch edit changes. A missing field stays as it is; `habitatId: null` clears the Habitat.
 * `addSongId` and `removeSongId` add or remove one Song on every listed Bird.
 */
export interface BirdBatchChange {
	habitatId?: number | null;
	addSongId?: number;
	removeSongId?: number;
	flags?: Partial<BirdFlags>;
}

export type BatchEditResult =
	{ ok: true; updated: number } | { ok: false; error: 'not-found' | 'bad-habitat' | 'bad-song' };

export interface Catalog {
	login(password: string): Promise<LoginResult>;
	verifyToken(token: string): Promise<boolean>;
	/** The code-name to display-word map. */
	labels(): Promise<Labels>;
	/** Tiles of one view, Archived excluded, Arrival newest first (a month or year sorts with days, none last). */
	listBirds(query: ListBirdsQuery): Promise<BirdTile[]>;
	/** Every Bird not Archived, by name, with its Roosted flag (a tile never carries it): the Admin batch list. */
	listBatchBirds(): Promise<BatchBird[]>;
	/** Stores a new Bird with its ordered Pictures (bytes in R2 under random keys). */
	addBird(input: BirdInput): Promise<AddBirdResult>;
	/**
	 * Replaces every field of a Bird. `pictures` is the whole ordered list: `{ id }` keeps a stored
	 * Picture, an upload adds one, a Picture left out is deleted with its R2 object. At least one
	 * Picture stays. Seen stays on while the Bird has a Sighting, whatever `flags.seen` says.
	 */
	editBird(id: number, input: BirdInput): Promise<EditBirdResult>;
	/**
	 * Applies one change to every listed Bird together, or to none. Seen cannot be cleared on a
	 * Bird that has a Sighting: that Bird keeps Seen and gets the rest.
	 */
	editBirds(ids: number[], change: BirdBatchChange): Promise<BatchEditResult>;
	/** Archives a Bird: it leaves every view, filter and search, and shows only in similar names. */
	archiveBird(id: number): Promise<ArchiveResult>;
	/** Brings an Archived Bird back to its view. */
	restoreBird(id: number): Promise<ArchiveResult>;
	/** Tiles of the Archived Birds, by name. */
	listArchivedBirds(): Promise<BirdTile[]>;
	/**
	 * Deletes a Bird with its Pictures (rows and R2 objects), Sightings and Song links. Refused
	 * unless the Bird is Archived. The only delete of a Bird.
	 */
	deleteBirdForever(id: number): Promise<DeleteForeverResult>;
	/** Birds whose name contains `text` (ignoring case), Archived included. Empty under 3 characters. */
	findSimilarNames(text: string): Promise<SimilarBird[]>;
	/** The popup view of a Bird, or null when there is no such Bird. */
	getBird(id: number): Promise<BirdDetail | null>;
	/** Adds a Sighting (`YYYY-MM-DD`, or no day). The first Sighting turns Seen on. */
	addSighting(birdId: number, day?: string): Promise<AddSightingResult>;
	/** Changes a Sighting's day, or clears it with null. */
	setSightingDay(id: number, day: string | null): Promise<ValueResult<'not-found' | 'bad-day'>>;
	/** Deletes a Sighting. Seen stays on: it is only forced, never cleared. */
	deleteSighting(id: number): Promise<ValueResult<'not-found'>>;
	/** The R2 object of a Picture (or its small thumbnail), or null when the Picture or that object is gone. */
	getPicture(id: number, size?: 'thumb'): Promise<PictureObject | null>;
	/** Stores the thumbnail the browser made of a Picture. False when the Picture is unknown. */
	putThumbnail(id: number, bytes: ArrayBuffer): Promise<boolean>;
	/** Every value of a list, by name, with its usage. */
	listValues(kind: ValueKind): Promise<ListValue[]>;
	addValue(kind: ValueKind, name: string): Promise<AddValueResult>;
	renameValue(
		kind: ValueKind,
		id: number,
		name: string
	): Promise<ValueResult<'empty' | 'duplicate' | 'not-found'>>;
	/**
	 * Removes a value. A value in use is refused without `moveTo`; with it, every Bird
	 * moves to that value first (a Bird that has both gets it once).
	 */
	removeValue(
		kind: ValueKind,
		id: number,
		moveTo?: number
	): Promise<ValueResult<'in-use' | 'not-found' | 'bad-target'>>;
}
