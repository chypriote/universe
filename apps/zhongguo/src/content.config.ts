import { glob } from 'astro/loaders';
import { defineCollection } from 'astro:content';
import { z } from "astro/zod"
import { d1Query } from '../scripts/d1.js';

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

const flights = defineCollection({
  // From D1 at build time. Not the raw SerpApi response: only china.js's cache reads it.
  loader: async () => {
    const rows = await d1Query(
      'SELECT airport, stops, price, outbound_date, return_date, searched_on, created_at FROM flight_searches'
    );
    return rows.map((row: Record<string, string | number | null>) => ({
      id: `${row.airport}-${row.stops}-${row.outbound_date}-${row.return_date}`,
      ...row,
    }));
  },
  schema: z.object({
    id: z.string(),
    airport: z.string(),
    stops: z.enum(['stop', 'nostop']),
    price: z.number().nullable(),
    outbound_date: z.string(),
    return_date: z.string(),
    searched_on: z.string(),
    created_at: z.string(),
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

export const collections = { blog, docs, flights, guides };
