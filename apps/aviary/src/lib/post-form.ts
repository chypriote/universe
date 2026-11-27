import { deserialize } from '$app/forms';
import { invalidateAll } from '$app/navigation';

export type Outcome = { ok: true } | { ok: false; error: string };

/**
 * Posts form data to a form action of the current page and reloads the page data on success. A
 * failure carries a label code name; a lost session (401) is reported, never silently dropped.
 */
export async function postForm(action: string, body: FormData): Promise<Outcome> {
	try {
		const response = await fetch(action, {
			method: 'POST',
			body,
			headers: { 'x-sveltekit-action': 'true' }
		});
		if (response.status === 401) return { ok: false, error: 'SessionExpired' };
		const result = deserialize(await response.text());
		if (result.type === 'success') {
			await invalidateAll();
			return { ok: true };
		}
		const code = result.type === 'failure' ? result.data?.error : undefined;
		return { ok: false, error: typeof code === 'string' ? code : 'SomethingWrong' };
	} catch {
		return { ok: false, error: 'NetworkError' };
	}
}
