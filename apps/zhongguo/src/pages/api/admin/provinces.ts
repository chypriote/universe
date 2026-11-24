import type { APIRoute } from 'astro';
import { journalFromEnv } from '@/lib/journal';

export const prerender = false;

/** The Visited Provinces with their Province Cover. */
export const GET: APIRoute = async () => Response.json(await journalFromEnv().listVisitedProvinces());
