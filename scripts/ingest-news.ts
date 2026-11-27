#!/usr/bin/env node
// ISI-7949 / architecture ISI-7919 §4B — normalize the weekly CloudNative News and OTel News
// into content-collection files, one Markdown file per issue, matching the news schema (§2:
// issueNumber, sourceUrl, publishDate, optional sections[] + the shared core front-matter).
//
// Run by .github/workflows/ingest-news.yml, which then opens a PR with whatever this wrote.
// Idempotent: an issue whose file already exists is skipped, so re-runs and overlapping
// schedule/dispatch triggers never duplicate or clobber.
//
// SOURCE ADAPTER (the one open question, ISI-7919 §7 #1): how the news is *emitted* is not yet
// confirmed (markdown-in-a-repo? JSON/HTTP API? RSS/JSON artifact?). The arch doc says the
// workflow shape is identical whichever it is — so the source-specific part lives here, behind
// `NEWS_SOURCE_KIND`, and every adapter normalizes to the same `NewsItem`. Confirming the real
// shape is a config change (which adapter + which URL/dir), not a rewrite.
//
// Config (all via env, set in the workflow from repo variables/secrets):
//   NEWS_SOURCE_KIND   json | rss | dir            (default: json)
//   CLOUDNATIVE_NEWS_URL / OTEL_NEWS_URL           source endpoint for json|rss
//   NEWS_SOURCE_DIR                                root dir for the `dir` adapter (e.g. a checked-out generator repo)
//   DRY_RUN=1  or  --dry-run                       parse + report, write nothing
//
// Usage: node scripts/ingest-news.ts [--dry-run]

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

// A feed is one of the two news collections. Everything downstream is identical per feed.
// `type` and `category` are fixed per feed and defaulted by the Zod schema (src/content.config.ts),
// so ingested files deliberately omit them — this only names the collection and slug prefix.
type Feed = { collection: 'cloudnative-news' | 'otel-news'; type: 'cloudnative-news' | 'otel-news'; url?: string };
// The normalized shape every adapter returns. One item == one weekly issue.
// `sections` matches the schema: a list of links into the issue ({ title, url? }), not prose.
type NewsItem = { issueNumber: number; title: string; publishDate: string; sourceUrl: string; description: string; tags: string[]; sections: { title: string; url?: string }[]; body: string };

const DRY_RUN = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const KIND = (process.env.NEWS_SOURCE_KIND ?? 'json').toLowerCase();
const CONTENT = join(import.meta.dirname, '..', 'src', 'content');

const FEEDS: Feed[] = [
  { collection: 'cloudnative-news', type: 'cloudnative-news', url: process.env.CLOUDNATIVE_NEWS_URL },
  { collection: 'otel-news', type: 'otel-news', url: process.env.OTEL_NEWS_URL },
];

const issueFrom = (s: string) => Number(s.match(/#?\s*(\d+)/)?.[1] ?? 0); // "CloudNative News #42" → 42
const isoDate = (s: string) => new Date(s).toISOString().slice(0, 10); // drop the time; publishDate drives ordering only by day
// YAML needs quoting for strings with colons/quotes/leading specials; keep it minimal and always safe.
const yaml = (s: string) => `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

// --- Source adapters ---------------------------------------------------------
// Each returns NewsItem[] for one feed. Swap/confirm the adapter once §7 #1 is answered.

// json: the generator (or an artifact) exposes an array of already-structured items. This is the
// canonical shape — if we can influence the generator's output, emit exactly this and drop the rest.
const fromJson = async (feed: Feed): Promise<NewsItem[]> => {
  if (!feed.url) return [];
  const res = await fetch(feed.url);
  if (!res.ok) throw new Error(`${feed.collection}: ${res.status} ${feed.url}`);
  const raw = await res.json();
  const items = Array.isArray(raw) ? raw : (raw.items ?? raw.data ?? []);
  return items.map((it: any): NewsItem => ({
    issueNumber: Number(it.issueNumber ?? it.issue ?? issueFrom(it.title ?? '')),
    title: String(it.title ?? `${feed.collection} #${it.issueNumber ?? ''}`).trim(),
    publishDate: isoDate(it.publishDate ?? it.date ?? it.pubDate ?? new Date().toISOString()),
    sourceUrl: String(it.sourceUrl ?? it.url ?? it.link ?? ''),
    description: String(it.description ?? it.summary ?? '').trim(),
    tags: Array.isArray(it.tags) ? it.tags.map(String) : [],
    sections: Array.isArray(it.sections) ? it.sections.map((s: any) => ({ title: String(s.title ?? s.heading ?? ''), url: s.url ?? s.link ?? undefined })).filter((s: any) => s.title) : [],
    body: String(it.body ?? it.content ?? it.markdown ?? '').trim(),
  }));
};

// rss: the generator publishes a feed. Parse with the standard-library DOM-free regex approach used
// elsewhere in scripts/ (no XML dep). One <item> == one issue.
const fromRss = async (feed: Feed): Promise<NewsItem[]> => {
  if (!feed.url) return [];
  const res = await fetch(feed.url);
  if (!res.ok) throw new Error(`${feed.collection}: ${res.status} ${feed.url}`);
  const xml = await res.text();
  const pick = (block: string, tag: string) => block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`))?.[1] ?? '';
  const uncdata = (s: string) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const block = m[1]!;
    const title = uncdata(pick(block, 'title'));
    const link = uncdata(pick(block, 'link'));
    const desc = uncdata(pick(block, 'description'));
    return {
      issueNumber: issueFrom(title),
      title,
      publishDate: isoDate(uncdata(pick(block, 'pubDate')) || new Date().toISOString()),
      sourceUrl: link,
      description: desc.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 300),
      tags: [],
      sections: [],
      body: desc,
    } as NewsItem;
  });
};

// dir: the generator writes Markdown files into a directory we check out alongside this repo.
// Expect files named like `issue-42.md` / `42.md`; front-matter, if present, is left to the content
// author — here we lift issueNumber + body and let the normalizer fill the rest.
const fromDir = (feed: Feed): NewsItem[] => {
  const root = process.env.NEWS_SOURCE_DIR ? join(process.env.NEWS_SOURCE_DIR, feed.collection) : '';
  if (!root || !existsSync(root)) return [];
  return readdirSync(root).filter((f) => f.endsWith('.md')).map((file) => {
    const body = readFileSync(join(root, file), 'utf8');
    const fm = body.match(/^---\n([\s\S]*?)\n---\n?/);
    const front = fm?.[1] ?? '';
    const get = (k: string) => front.match(new RegExp(`^${k}:\\s*(.+)$`, 'm'))?.[1]?.replace(/^["']|["']$/g, '').trim() ?? '';
    const issueNumber = Number(get('issueNumber')) || issueFrom(file) || issueFrom(get('title'));
    return {
      issueNumber,
      title: get('title') || `${feed.collection} #${issueNumber}`,
      publishDate: isoDate(get('publishDate') || get('date') || new Date().toISOString()),
      sourceUrl: get('sourceUrl') || get('url'),
      description: get('description'),
      tags: [],
      sections: [],
      body: body.replace(/^---\n[\s\S]*?\n---\n?/, '').trim(),
    } as NewsItem;
  });
};

const fetchItems = async (feed: Feed): Promise<NewsItem[]> => {
  if (KIND === 'json') return fromJson(feed);
  if (KIND === 'rss') return fromRss(feed);
  if (KIND === 'dir') return fromDir(feed);
  throw new Error(`unknown NEWS_SOURCE_KIND "${KIND}" (expected json | rss | dir)`);
};

// --- Normalize → content file ------------------------------------------------

const render = (feed: Feed, item: NewsItem) => {
  // `type` + `category` are omitted on purpose — the Zod schema defaults them per feed.
  const slug = `${feed.type}-issue-${item.issueNumber}`;
  const front = [
    '---',
    `title: ${yaml(item.title)}`,
    `slug: ${yaml(slug)}`,
    `tags: [${item.tags.map(yaml).join(', ')}]`,
    `publishDate: ${item.publishDate}`,
    `description: ${yaml(item.description)}`,
    'draft: false',
    'featured: false',
    `issueNumber: ${item.issueNumber}`,
    `sourceUrl: ${yaml(item.sourceUrl)}`,
    ...(item.sections.length
      ? ['sections:', ...item.sections.flatMap((s) => [`  - title: ${yaml(s.title)}`, ...(s.url ? [`    url: ${yaml(s.url)}`] : [])])]
      : []),
    '---',
    '',
  ].join('\n');
  const body = item.body || `_No body provided by the source for issue #${item.issueNumber}._`;
  return { slug, file: join(CONTENT, feed.collection, `${slug}.md`), text: `${front}${body}\n` };
};

// --- Main --------------------------------------------------------------------

let created = 0;
let skipped = 0;
const createdSlugs: string[] = [];

for (const feed of FEEDS) {
  let items: NewsItem[] = [];
  try {
    items = await fetchItems(feed);
  } catch (err) {
    console.error(`! ${feed.collection}: ${(err as Error).message}`);
    continue; // one feed failing must not sink the other
  }
  // issueNumber drives the filename; sourceUrl is a required z.url() in the schema. Drop anything
  // the source emits without both, and say so rather than writing a file the build would reject.
  const valid = items.filter((it) => {
    const ok = it.issueNumber > 0 && /^https?:\/\//.test(it.sourceUrl);
    if (!ok) console.warn(`  ! skipping malformed item (issue=${it.issueNumber}, sourceUrl=${it.sourceUrl || 'none'})`);
    return ok;
  });
  console.log(`${feed.collection}: ${valid.length} ingestable issue(s) from source (kind=${KIND})`);
  for (const item of valid) {
    const { slug, file, text } = render(feed, item);
    if (existsSync(file)) { skipped++; continue; }
    if (DRY_RUN) {
      console.log(`  [dry-run] would write ${file}`);
    } else {
      mkdirSync(join(CONTENT, feed.collection), { recursive: true });
      writeFileSync(file, text);
      console.log(`  + ${slug}.md`);
    }
    created++;
    createdSlugs.push(slug);
  }
}

console.log(`\n${DRY_RUN ? '[dry-run] ' : ''}created ${created}, skipped ${skipped} existing`);

// Expose counts to the workflow so it only opens a PR when something actually changed.
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `created=${created}\n`);
  appendFileSync(process.env.GITHUB_OUTPUT, `slugs=${createdSlugs.join(',')}\n`);
}
