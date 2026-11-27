import { env } from 'cloudflare:workers';
import { buildJournal, type JournalEnv } from './journal';
import { dropSnapshots, snapshotsChangedBy, withSnapshots } from './snapshots';
import type {
	AtlasWorkspace,
	GalleryWorkspace,
	Journal,
	JournalWorkspace,
	OwnerLogin,
	ProvinceCovers,
	PublicReads
} from './types';

export type { JournalEnv } from './journal';
export type * from './types';

export function createJournal(env: JournalEnv): Journal {
	return buildJournal(env);
}

const bindings = () => env as unknown as JournalEnv;

/** The reads of the public pages. Trip and plan pages come from snapshots. */
export function publicReads(): PublicReads {
	return withSnapshots(createJournal(bindings()), bindings().PHOTOS);
}

export const ownerLogin = (): OwnerLogin => createJournal(bindings());
export const provinceCovers = (): ProvinceCovers => createJournal(bindings());
export const journalWorkspace = (): JournalWorkspace => createJournal(bindings());
export const atlas = (): AtlasWorkspace => createJournal(bindings());
export const galleryWorkspace = (): GalleryWorkspace => createJournal(bindings());

/** After a write to an admin API path: the snapshots it can change are built again on the next load. */
export function dropSnapshotsFromEnv(path: string) {
	return dropSnapshots(bindings().PHOTOS, snapshotsChangedBy(path));
}
