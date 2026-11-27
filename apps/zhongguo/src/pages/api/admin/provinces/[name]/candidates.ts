import type { APIRoute } from 'astro';
import { provinceCovers } from '@/lib/journal';
import { badRequest } from '../../_respond';

export const prerender = false;

/** The Photos that can be the cover of a Visited Province. */
export const GET: APIRoute = async ({ params }) => {
  const candidates = await provinceCovers().listCoverCandidates(params.name ?? '');
  return candidates ? Response.json(candidates) : badRequest('unknown-province');
};
