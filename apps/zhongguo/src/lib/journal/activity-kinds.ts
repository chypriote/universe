/** The kinds of an Activity, named by what the Owner goes for. A new kind is a new line here and in the migration CHECK. */
export const ACTIVITY_KINDS = [
  { value: 'nature', label: 'Nature' },
  { value: 'heritage', label: 'Heritage' },
  { value: 'modern-city', label: 'Modern city' },
  { value: 'show', label: 'Show' },
] as const;

/** How much the Owner suggests an Activity, best first. */
export const ACTIVITY_RATINGS = [
  { value: 'do-not-miss', label: 'Do not miss' },
  { value: 'recommended', label: 'Recommended' },
  { value: 'skippable', label: 'Skippable' },
  { value: 'avoid', label: 'Avoid' },
] as const;

export type ActivityKind = (typeof ACTIVITY_KINDS)[number]['value'];
export type ActivityRating = (typeof ACTIVITY_RATINGS)[number]['value'];
