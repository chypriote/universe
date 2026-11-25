import { glob } from 'astro/loaders';
import { defineCollection } from 'astro:content';
import { z } from "astro/zod"
import { d1Query } from '../scripts/d1.js';
import { loadPlans } from '../scripts/plans.js';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    // Required fields
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),

    // Optional basic fields
    author: z.string().optional(),
    image: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().default(false),

    // Date fields
    updatedDate: z.coerce.date().optional(),

    // SEO fields
    ogImage: z.string().optional(),
    canonicalUrl: z.string().optional(),

    // Organization fields
    featured: z.boolean().default(false),
    series: z.string().optional(),
    seriesOrder: z.number().optional(),

    // Display fields
    toc: z.boolean().default(true),
    readingTime: z.string().optional(),
  }),
});

const docs = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/docs' }),
  schema: z.object({
    // Required fields
    title: z.string(),
    description: z.string(),

    // Docs-specific fields
    order: z.number().optional(),
    section: z.string().optional(),

    // Optional basic fields (shared with blog)
    pubDate: z.coerce.date().optional(),
    author: z.string().optional(),
    image: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().default(false),

    // Date fields
    updatedDate: z.coerce.date().optional(),

    // SEO fields
    ogImage: z.string().optional(),
    canonicalUrl: z.string().optional(),

    // Organization fields
    featured: z.boolean().default(false),
    series: z.string().optional(),
    seriesOrder: z.number().optional(),

    // Display fields
    toc: z.boolean().default(true),
    readingTime: z.string().optional(),
  }),
});

// The Flight prices page data, from D1 at build time. One entry; the page reads it with getEntry.
const fares = defineCollection({
  loader: async () => {
    const [plans, searches, airports] = await Promise.all([
      loadPlans(),
      d1Query(
        'SELECT airport, stops, price, outbound_date, return_date, searched_on, created_at FROM flight_searches WHERE price IS NOT NULL',
      ),
      d1Query('SELECT airports.code, cities.name FROM airports JOIN cities ON cities.id = airports.city_id'),
    ]);
    return [{ id: 'all', plans, searches, airports }];
  },
  schema: z.object({
    plans: z.array(
      z.object({
        slug: z.string(),
        title: z.string(),
        zh: z.string(),
        seasons: z.array(z.number()),
        gateways: z.array(z.object({ code: z.string(), directWeekdays: z.number() })),
      }),
    ),
    searches: z.array(
      z.object({
        airport: z.string(),
        stops: z.enum(['stop', 'nostop']),
        price: z.number(),
        outbound_date: z.string(),
        return_date: z.string(),
        searched_on: z.string(),
        created_at: z.string(),
      }),
    ),
    airports: z.array(z.object({ code: z.string(), name: z.string() })),
  }),
});

const guides = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number(),
    updated: z.string(),
  }),
});

export const collections = { blog, docs, fares, guides };
