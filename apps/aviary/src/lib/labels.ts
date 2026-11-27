/** Code name to display word, as the Catalog's `labels` returns it. */
export type Labels = Record<string, string>;

/** The display word for a code name. A missing label falls back to the code name. */
export function label(labels: Labels, codeName: string): string {
	return labels[codeName] || codeName;
}
