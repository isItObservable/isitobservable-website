import { getCollection, type CollectionEntry } from 'astro:content';
import type { ImageMetadata } from 'astro';
import categoriesFile from '~/content/categories.json';
import topicsFile from '~/content/topics.json';

const IMAGES = import.meta.glob<{ default: ImageMetadata }>('/src/assets/images/*', { eager: true });

/** "~/assets/images/sampling.jpg" → the optimizable image. Throws so a typo fails the build. */
export const imageFile = (path: string) => {
  const image = IMAGES[path.replace(/^~\//, '/src/')]?.default;
  if (!image) throw new Error(`Image not found: ${path}`);
  return image;
};
export const FALLBACK_IMAGE = '~/assets/images/fallback-image.jpg';

export type Article = CollectionEntry<'articles'>;
export type Page = CollectionEntry<'pages'>;
export type Category = CollectionEntry<'categories'>;
export type Entry = Article | Page;

const newestFirst = (a: Entry, b: Entry) => b.data.date.getTime() - a.data.date.getTime();

let cache: Promise<Article[]> | undefined;
/** Published articles, newest first. */
export const getArticles = () => (cache ??= getCollection('articles', ({ data }) => !data.draft).then((list) => list.sort(newestFirst)));
export const getPages = async () => (await getCollection('pages', ({ data }) => !data.draft)).sort(newestFirst);
// getCollection() returns file() entries sorted by id; the JSON array order is the editorial order.
const inFileOrder = <T extends { id: string }>(list: T[], file: { id: string }[]) => {
  const index = new Map(file.map((item, i) => [item.id, i]));
  return list.sort((a, b) => index.get(a.id)! - index.get(b.id)!);
};
export const getCategories = async () => inFileOrder(await getCollection('categories'), categoriesFile);
export const getTopics = async () => inFileOrder(await getCollection('topics'), topicsFile);

/** /open-telemetry/traces/foo */
export const entryUrl = (e: Entry) => `/${e.id}`;
/** Articles live in their category folder; pages name it in frontmatter. */
export const categoryId = (e: Entry) => (e.collection === 'articles' ? e.id.split('/').slice(0, -1).join('/') : e.data.category?.id) || undefined;
export const topCategoryId = (e: Entry) => categoryId(e)?.split('/')[0];

export const categoryTitle = async (id: string | undefined) => (id ? (await getCategories()).find((c) => c.id === id)?.data.title : undefined);

/** Hero/card image of an entry, the fallback image otherwise. */
export const entryImage = (e: Entry) => (e.collection === 'articles' && e.data.image
  ? { src: imageFile(e.data.image.src), alt: e.data.image.title }
  : { src: imageFile(FALLBACK_IMAGE), alt: '' });
export const fallbackImage = () => imageFile(FALLBACK_IMAGE);

/** Words / 256 per minute, "Quick" under one minute. */
export const readingTime = (markdown: string) => {
  const words = markdown.replace(/[#*`>|[\]()!_—–-]/g, ' ').split(/\s+/).filter(Boolean).length;
  return words < 256 ? 'Quick' : `${Math.ceil(words / 256)} minute`;
};

/** "Feb 10, 2025" in the site's time zone. */
export const formatDate = (date: Date) => new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'America/Los_Angeles' }).format(date);

/** Topics have no pages of their own; they link to the search. */
export const topicUrl = (title: string) => `/search?q=${encodeURIComponent(title)}`;
