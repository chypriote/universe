/**
 * One entry of a PictureList. A stored Picture has an `id`; a new one has a `blob` (already
 * cropped and resized). `url` previews either. The first entry is the tile Picture.
 */
export interface PictureItem {
	/** Stable key for the list. */
	key: string;
	id?: number;
	blob?: Blob;
	url: string;
}

/** Moves one Picture to a new position. A position outside the list changes nothing. */
export function movePicture(items: PictureItem[], from: number, to: number): PictureItem[] {
	if (from < 0 || from >= items.length || to < 0 || to >= items.length) return items;
	const next = [...items];
	const [moved] = next.splice(from, 1);
	next.splice(to, 0, moved);
	return next;
}

export function removePicture(items: PictureItem[], index: number): PictureItem[] {
	return items.filter((_, i) => i !== index);
}

/** The image files of a clipboard or file list; other kinds are ignored. */
export function imagesOf(files: Iterable<File> | null | undefined): File[] {
	return [...(files ?? [])].filter((file) => file.type.startsWith('image/'));
}
