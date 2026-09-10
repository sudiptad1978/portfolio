import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Fallback blog content — the zero-database path.
 * Posts written here are bundled at build time; when D1 is provisioned,
 * cron-synced posts are served alongside (and newer than) these.
 */
const blog = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    pubDate: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    canonicalUrl: z.string().url().optional(),
    cover: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
