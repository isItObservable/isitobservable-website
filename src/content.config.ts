import { defineCollection, reference } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { categoryIds } from '~/content/taxonomy';

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

// === Concept C rebrand content model (ISI-7948, spec ISI-7919 §2). Additive: four new collections
// for the Netflix-style hub, independent of the live Craft-replacement model above and of the
// /api/blog.json contract. No craftId here — none of this came from Craft. ===

// Shared front-matter shape. `category` is validated against the taxonomy (unknown values fail the
// build). `thumbnail` uses Astro's image() helper (relative, co-located, optimized at build).
const rebrandBase = ({ image }: { image: () => z.ZodType }) =>
  z.object({
    title: z.string(),
    slug: z.string().optional(), // stable URL key; defaults to the file id when omitted
    category: z.enum(categoryIds), // drives the neon tile color via taxonomy.ts
    tags: z.array(z.string()).default([]),
    youtubeId: z.string().optional(), // present on videos + past livestreams
    publishDate: z.coerce.date(), // drives ordering in rails/feeds
    updatedDate: z.coerce.date().optional(), // freshness signal
    thumbnail: image().optional(), // card + OG image
    description: z.string(), // one-paragraph summary for cards + meta/OG
    draft: z.boolean().default(false), // excluded from the production build
    featured: z.boolean().default(false), // surfaces in Home hero / first rail
  });

const videos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: 'src/content/videos', generateId: idFromPath }),
  schema: ({ image }) =>
    rebrandBase({ image }).extend({
      type: z.literal('video').default('video'),
    }),
});

// Weekly news (both feeds). Machine-ingested (see ISI-7949), so the schema stays lean. `category`
// and `type` are fixed per feed, so ingested files don't need to set them.
const newsFields = z.object({
  issueNumber: z.number().int().positive(),
  sourceUrl: z.url(), // canonical generated source
  sections: z.array(z.object({ title: z.string(), url: z.url().optional() })).optional(),
});

const cloudnativeNews = defineCollection({
  loader: glob({ pattern: '**/*.md', base: 'src/content/cloudnative-news', generateId: idFromPath }),
  schema: ({ image }) =>
    rebrandBase({ image })
      .extend(newsFields.shape)
      .extend({
        type: z.literal('cloudnative-news').default('cloudnative-news'),
        category: z.literal('cloudnative').default('cloudnative'),
      }),
});

const otelNews = defineCollection({
  loader: glob({ pattern: '**/*.md', base: 'src/content/otel-news', generateId: idFromPath }),
  schema: ({ image }) =>
    rebrandBase({ image })
      .extend(newsFields.shape)
      .extend({
        type: z.literal('otel-news').default('otel-news'),
        category: z.literal('otelnews').default('otelnews'),
      }),
});

const livestreams = defineCollection({
  loader: glob({ pattern: '**/*.md', base: 'src/content/livestreams', generateId: idFromPath }),
  schema: ({ image }) =>
    rebrandBase({ image }).extend({
      type: z.literal('livestream').default('livestream'),
      startsAt: z.coerce.date(), // timezone-aware; drives the "next live" home banner
      status: z.enum(['scheduled', 'live', 'past']),
      registrationUrl: z.url().optional(),
      publishDate: z.coerce.date().optional(), // livestreams order by startsAt, so this is optional
    }),
});

export const collections = {
  articles,
  pages,
  categories,
  topics,
  authors,
  videos,
  'cloudnative-news': cloudnativeNews,
  'otel-news': otelNews,
  livestreams,
};
