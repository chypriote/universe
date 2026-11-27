/** A URL slug from a title: lower case ASCII words joined by dashes; empty when the title has none. */
export function slugOf(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Photo files sit under trips/<slug>/ for Trips and plans alike, so a slug is unique across both. */
export async function slugTaken(db: D1Database, slug: string): Promise<boolean> {
  const row = await db
    .prepare('SELECT slug FROM trips WHERE slug = ?1 UNION SELECT slug FROM plans WHERE slug = ?1')
    .bind(slug)
    .first();
  return row !== null;
}
