/** Largest stored Picture. The browser resizes to 1600 px JPEG first, far below this. */
export const MAX_PICTURE_BYTES = 5 * 1024 * 1024;

/** Characters of a name before similar Birds are looked up. */
export const MIN_SIMILAR_CHARS = 3;

/** Largest thumbnail the browser may store. A 400 px JPEG is far below this. */
export const MAX_THUMB_BYTES = 200 * 1024;

/** R2 key of the thumbnail of the Picture stored under `key`. */
export const thumbKey = (key: string) => `thumb/${key}`;

/** The keys of Pictures plus their thumbnails, for a delete. */
export const withThumbs = (keys: string[]) => keys.flatMap((key) => [key, thumbKey(key)]);
