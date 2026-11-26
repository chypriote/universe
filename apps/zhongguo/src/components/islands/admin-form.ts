// Pieces shared by the admin editors of Trips and plans.

export const MESSAGES: Record<string, string> = {
  'not-landscape': 'The Trip Cover must be a landscape Photo',
  'not-portrait': 'A Highlight Photo must be a portrait Photo',
  'wrong-count': 'There must be 4 Highlight Photos',
  'duplicate-photo': 'A Photo can be picked once only',
  'unknown-photo': 'A Photo is not in this Trip: reload the page',
  'no-cover': 'The Trip has no Trip Cover: pick one first',
  'invalid-focus': 'That position is not valid',
  'unknown-day': 'The Day no longer exists: reload the page',
  'unknown-city': 'Unknown City',
  'main-not-on-route': 'The main City must be one of the Cities of the Day',
  'invalid-title': 'A title is needed',
  'unknown-plan': 'The plan no longer exists: reload the page',
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
