import { env } from 'cloudflare:workers';
import { buildJournal, type JournalEnv } from './journal';
import { dropSnapshots, withSnapshots } from './snapshots';
import type { Journal } from './types';

export type { JournalEnv } from './journal';
export type * from './types';

export function createJournal(env: JournalEnv): Journal {
  return buildJournal(env);
}

/** The Journal of the current request, from the Worker bindings. Trip and plan pages come from snapshots. */
export function journalFromEnv(): Journal {
  const bindings = env as unknown as JournalEnv;
  return withSnapshots(createJournal(bindings), bindings.PHOTOS);
}

/** After an admin write: the next Trip or plan page load builds its snapshot again. */
export function dropSnapshotsFromEnv() {
  return dropSnapshots((env as unknown as JournalEnv).PHOTOS);
}
