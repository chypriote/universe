import type { APIRoute } from 'astro';
import { journalFromEnv } from '@/lib/journal';
import { badRequest, jsonBody, respond } from './_respond';

/** The Journal methods behind the routes of a Trip and of a Trip plan: one handler each serves both. */
type Kind = {
  cover: 'setTripCover' | 'setPlanCover';
  focus: 'setTripCoverFocus' | 'setPlanCoverFocus';
  highlights: 'setHighlightPhotos' | 'setPlanHighlightPhotos';
  dayPhotos: 'setDayPhotos' | 'setPlanDayPhotos';
};

export const TRIP_ROUTES = {
  cover: 'setTripCover',
  focus: 'setTripCoverFocus',
  highlights: 'setHighlightPhotos',
  dayPhotos: 'setDayPhotos',
} as const satisfies Kind;
export const PLAN_ROUTES = {
  cover: 'setPlanCover',
  focus: 'setPlanCoverFocus',
  highlights: 'setPlanHighlightPhotos',
  dayPhotos: 'setPlanDayPhotos',
} as const satisfies Kind;

const isIds = (value: unknown): value is number[] => Array.isArray(value) && value.every((id) => typeof id === 'number');

/** Sets the cover: `{ photoId }`. */
export const putCover =
  (kind: Kind): APIRoute =>
  async ({ params, request }) => {
    const input = await jsonBody<{ photoId?: unknown }>(request);
    if (typeof input?.photoId !== 'number') return badRequest('invalid-body');
    return respond(await journalFromEnv()[kind.cover](params.slug ?? '', input.photoId));
  };

/** Sets the focal point of the cover: `{ x, y }` in percent. */
export const putCoverFocus =
  (kind: Kind): APIRoute =>
  async ({ params, request }) => {
    const input = await jsonBody<{ x?: unknown; y?: unknown }>(request);
    if (typeof input?.x !== 'number' || typeof input.y !== 'number') return badRequest('invalid-body');
    return respond(await journalFromEnv()[kind.focus](params.slug ?? '', input.x, input.y));
  };

/** Sets the Highlight Photos: `{ photoIds }`, in order. */
export const putHighlights =
  (kind: Kind): APIRoute =>
  async ({ params, request }) => {
    const input = await jsonBody<{ photoIds?: unknown }>(request);
    if (!isIds(input?.photoIds)) return badRequest('invalid-body');
    return respond(await journalFromEnv()[kind.highlights](params.slug ?? '', input.photoIds));
  };

/** Sets the Photos of a Day: `{ photoIds }`, in order. */
export const putDayPhotos =
  (kind: Kind): APIRoute =>
  async ({ params, request }) => {
    const input = await jsonBody<{ photoIds?: unknown }>(request);
    const dayId = Number(params.id);
    if (!Number.isInteger(dayId) || !isIds(input?.photoIds)) return badRequest('invalid-body');
    return respond(await journalFromEnv()[kind.dayPhotos](dayId, input.photoIds));
  };
