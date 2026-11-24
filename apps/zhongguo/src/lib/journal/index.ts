import { env } from 'cloudflare:workers';
import { buildJournal, type JournalEnv } from './journal';
import type { Journal } from './types';

export type { JournalEnv } from './journal';
export type * from './types';

export function createJournal(env: JournalEnv): Journal {
  return buildJournal(env);
}

/** The Journal of the current request, from the Worker bindings. */
export function journalFromEnv(): Journal {
  return createJournal(env as unknown as JournalEnv);
}
