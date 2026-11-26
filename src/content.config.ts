import { defineCollection, reference } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

// The file path is the URL: articles/open-telemetry/traces/foo.md → /open-telemetry/traces/foo
const idFromPath = ({ entry }: { entry: string }) => entry.replace(/\.md$/, '');

// Images live in src/assets/images/ and are referenced the same way everywhere: ~/assets/images/<file>
const imagePath = z.string().regex(/^~\/assets\/images\/[^/]+$/, 'Use ~/assets/images/<file>');

// Entries migrated from Craft keep their Craft id: it is the `id` in /api/blog.json (dynatrace.com Feed Me). New entries have none.
const craftId = z.number().int().optional();

const seo = z.object({
  title: z.string().optional(), // only when it differs from the title
  description: z.string().optional(), // default: subline as plain text
  robots: z.string().optional(), // default: all
}).optional();

const jsonLd = z.array(z.record(z.string(), z.unknown())).default([]); // raw schema.org objects, printed as-is

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: 'src/content/articles', generateId: idFromPath }),
  schema: z.object({
    craftId,
    title: z.string(),
    headline: z.string().optional(), // replaces the title in the hero
    subline: z.string().optional(), // Markdown, one paragraph
    date: z.coerce.date(),
    author: reference('authors'),
    topics: z.array(reference('topics')).default([]),
    image: z.object({ src: imagePath, title: z.string(), alt: z.string().nullable() }).optional(), // hero, card and YouTube teaser
    youtube: z.url().optional(), // the episode; shows the teaser and "Watch episode"
    related: z.array(reference('articles')).default([]),
    goDeeper: z.array(z.object({ text: z.string(), url: z.url() })).default([]),
    seo,
    jsonLd,
    draft: z.boolean().default(false), // not built, not in the API
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: 'src/content/pages', generateId: idFromPath }),
  schema: z.object({
    title: z.string(),
    headline: z.string().optional(),
    subline: z.string().optional(),
    date: z.coerce.date(),
    category: reference('categories').optional(), // listed on that category page and the home row
    topics: z.array(reference('topics')).default([]),
    seo,
    jsonLd,
    draft: z.boolean().default(false),
  }),
});

const categories = defineCollection({
  loader: file('src/content/categories.json'), // array order = menu and home order
  schema: z.object({
    craftId,
    title: z.string(),
    slug: z.string(),
    parent: reference('categories').optional(), // max 2 levels
    subline: z.string().optional(),
    seo,
  }),
});

const topics = defineCollection({
  loader: file('src/content/topics.json'), // array order = topic cloud order
  schema: z.object({ title: z.string() }),
});

const authors = defineCollection({
  loader: file('src/content/authors.json'),
  schema: z.object({
    craftId,
    name: z.string(),
    username: z.string(), // with email: author fields of /api/blog.json
    email: z.email(),
    image: imagePath.optional(),
  }),
});

export const collections = { articles, pages, categories, topics, authors };
