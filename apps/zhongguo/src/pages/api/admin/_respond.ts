/** A Journal result as JSON: a refused rule is a 409 for a clash and a 400 otherwise. */
export function respond(result: object): Response {
  if (!('ok' in result) || result.ok) return Response.json(result);
  const error = 'error' in result ? result.error : '';
  return Response.json(result, { status: error === 'exists' || error === 'breaks-cover' || error === 'date-taken' || error === 'code-taken' ? 409 : 400 });
}

/** The JSON body of a request, or null when it is not valid JSON. */
export async function jsonBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export const badRequest = (error: string) => Response.json({ ok: false, error }, { status: 400 });
