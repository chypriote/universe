import { getContext, setContext } from 'svelte';

/** The fixed words of the shared components. English unless the app sets its own. */
export interface UiLabels {
	skipToContent: string;
	switchToLight: string;
	switchToDark: string;
	cancel: string;
	save: string;
	/** The `aria-label` of the tabs nav. */
	lists: string;
	/** The calendar button of a date Field; `{label}` is the Field label. */
	pickDate: string;
}

export const defaultUiLabels: UiLabels = {
	skipToContent: 'Skip to content',
	switchToLight: 'Switch to light theme',
	switchToDark: 'Switch to dark theme',
	cancel: 'Cancel',
	save: 'Save',
	lists: 'Lists',
	pickDate: 'Pick {label} date'
};

const KEY = Symbol('ui-labels');

/** An app calls this once in its root layout. A getter, so the words follow the page data. */
export function setUiLabels(get: () => Partial<UiLabels>) {
	setContext(KEY, get);
}

/** Call during component setup; read the result in the markup so it stays current. */
export function getUiLabels(): () => UiLabels {
	const get = getContext<(() => Partial<UiLabels>) | undefined>(KEY);
	return () => ({ ...defaultUiLabels, ...get?.() });
}
