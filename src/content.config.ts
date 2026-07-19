import { file, glob } from 'astro/loaders';
import { defineCollection } from 'astro:content';
import { z } from "astro/zod"

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
  loader: file('flights/flights.json'),
  schema: z.object({
    id: z.string(),
    airport: z.string(),
    stops: z.enum(['stop', 'nostop']),
    price: z.number().nullable(),
    outbound_date: z.string(),
    return_date: z.string(),
    response: z.string(),
    searched_on: z.string(),
    created_at: z.string(),
  }),
});

const pictureSchema = z.object({
  url: z.string(),
  caption: z.string().optional(),
});

const attractionSchema = z.object({
  name: z.string(),
  city: z.string(),
  rating: z.number(),
  description: z.string(),
  pictures: z.array(pictureSchema).default([]),
});

const trainTripSchema = z.object({
  outgoing_city: z.string(),
  destination_city: z.string(),
  time_of_day: z.string(),
  departure_time: z.string(),
  arrival_time: z.string(),
  duration_minutes: z.number(),
});

const daySchema = z.object({
  day_number: z.number(),
  main_city: z.string(),
  title: z.string(),
  notes: z.string(),
  attractions: z.array(attractionSchema),
  train_trips: z.array(trainTripSchema).default([]),
});

const hotelSchema = z.object({
  name: z.string(),
  address: z.string(),
  rating: z.number(),
  price: z.number().nullable(),
  pictures: z.array(pictureSchema).default([]),
});

const restaurantSchema = z.object({
  name: z.string(),
  address: z.string(),
  rating: z.number(),
  suggested_dishes: z.array(z.string()).default([]),
  pictures: z.array(pictureSchema).default([]),
});

const citySchema = z.object({
  name: z.string(),
  country: z.string(),
  region: z.string(),
  hotels: z.array(hotelSchema).default([]),
  restaurants: z.array(restaurantSchema).default([]),
});

const itineraries = defineCollection({
  loader: glob({
    pattern: '**/!(example_itinerary).json',
    base: './itineraries',
    generateId: ({ entry }) => entry.replace(/\.json$/, '').replace(/_/g, '-'),
  }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    suggested_duration_days: z.number(),
    released_itinerary: z.object({
      start_date: z.string(),
      end_date: z.string(),
      pictures: z.array(z.string()).default([]),
    }),
    days: z.array(daySchema),
    cities: z.array(citySchema).default([]),
  }),
});

export const collections = { blog, docs, flights, itineraries };
