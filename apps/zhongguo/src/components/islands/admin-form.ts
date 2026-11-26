// Pieces shared by the admin editors of Trips and plans.

export const MESSAGES: Record<string, string> = {
  'not-landscape': 'The cover must be a landscape Photo',
  'not-portrait': 'A Highlight Photo must be a portrait Photo',
  'wrong-count': 'There must be 4 Highlight Photos',
  'duplicate-photo': 'A Photo can be picked once only',
  'unknown-photo': 'A Photo no longer exists: reload the page',
  'no-cover': 'Pick a cover first',
  'in-use': 'This Photo is the cover or a Highlight Photo: pick another one first',
  exists: 'A Photo with this name is already here',
  'breaks-cover': 'The new file breaks the orientation of the cover or a Highlight Photo',
  unreadable: 'The file is not a readable image',
  'unsupported-type': 'Only .jpg, .jpeg, .png and .webp files',
  'invalid-name': 'Invalid file name',
  'invalid-focus': 'That position is not valid',
  'unknown-day': 'The Day no longer exists: reload the page',
  'unknown-city': 'Unknown City',
  'main-not-on-route': 'The main City must be one of the Cities of the Day',
  'invalid-title': 'A title is needed',
  'unknown-plan': 'The plan no longer exists: reload the page',
  'invalid-date': 'Pick a valid start date',
  'unknown-plan-day': 'A Plan Day no longer exists: reload the page',
  'unknown-activity': 'An Activity no longer exists: reload the page',
  'duplicate-activity': 'A Day lists an Activity once only',
  'slug-taken': 'A Trip or plan already has that name',
};

export const message = (error = '') => MESSAGES[error] ?? error ?? 'Not saved';

export async function save(method: string, url: string, body: unknown): Promise<{ ok: boolean; error?: string; [key: string]: unknown }> {
  try {
    const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await response.json();
  } catch {
    return { ok: false, error: 'The request failed' };
  }
}

export const field = 'border border-border bg-surface px-3 py-2 text-sm text-foreground';
export const button = 'btn btn-outline cursor-pointer !px-4 !py-2 disabled:pointer-events-none disabled:opacity-40';

/** A .webp thumbnail: 960 px wide for a landscape Photo, 480 px otherwise, never enlarged. */
export async function makeThumb(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const width = Math.min(bitmap.width, bitmap.width > bitmap.height ? 960 : 480);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = Math.round((bitmap.height * width) / bitmap.width);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The browser cannot make a thumbnail'))), 'image/webp', 0.8),
  );
}
