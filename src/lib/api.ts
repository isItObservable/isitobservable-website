// /api/blog.json: same shape as the former Craft Element API endpoint. dynatrace.com's Feed Me imports from it,
// so field names and value formats must not change. Ids exist only for entries migrated from Craft (null otherwise).
import { getEntry } from 'astro:content';
import { categoryId, FALLBACK_IMAGE, getArticles, getCategories, type Article } from './content';
import { SITE_URL } from './site';
import { sublineToHtml } from './subline';

/** 2025-02-10T13:49:00Z → "2025-02-10 05:49:00.000000" (PHP DateTime in the site's time zone). */
const phpDate = (date: Date) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).map((part) => [part.type, part.value]));
  return { date: `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}.000000`, timezone_type: 3, timezone: 'America/Los_Angeles' };
};

/** The old asset URL had a double slash (base URL + "/assets/images"); Feed Me knows the images by it, so it stays. */
const assetUrl = (file: string) => `${SITE_URL}//assets/images/${encodeURIComponent(file)}`;

const item = async (a: Article) => {
  const categories = await getCategories();
  const category = categories.find((c) => c.id === categoryId(a));
  const author = (await getEntry(a.data.author))!.data;
  const image = a.data.image ?? { src: FALLBACK_IMAGE, title: a.data.title, alt: null }; // Feed Me always expects an image
  const file = image.src.split('/').pop()!;
  return {
    id: a.data.craftId ?? null,
    slug: a.id.split('/').pop(),
    title: a.data.title,
    url: `${SITE_URL}/${a.id}`,
    status: 'live',
    postDate: phpDate(a.data.date),
    customHeadline: a.data.headline ?? null,
    subline: a.data.subline ? await sublineToHtml(a.data.subline) : null,
    image: { title: image.title, url: assetUrl(file), filename: `isitobservable_${file.replace(/\.[^.]+$/, '')}`, alt: image.alt },
    categories: category ? [{ id: category.data.craftId ?? null, slug: category.data.slug, title: category.data.title, url: `${SITE_URL}/${category.id}` }] : [],
    author: { id: author.craftId ?? null, mail: author.email, username: author.username, name: author.name },
    contentType: { slug: 'blog', title: 'Blog' },
    contentSeries: { slug: 'is-it-observable', title: 'Is it Observable' },
  };
};

/**
 * All articles on one page, with Element API's pagination block. Craft paged by 10, but a static host can't serve ?page=N,
 * and there are few articles: without a `next` link Feed Me stops after this one request.
 */
export const blogFeed = async () => {
  const articles = await getArticles();
  return {
    data: await Promise.all(articles.map(item)),
    meta: { pagination: { total: articles.length, count: articles.length, per_page: articles.length, current_page: 1, total_pages: 1, links: {} } },
  };
};
