#!/usr/bin/env node
// Compares the build (dist/) with the live Craft site. Run after `npm run build`; exits 1 on any mismatch.
//   1. every URL in the live sitemaps exists in dist/ with the same <title>
//   2. all items of the live /api/blog.json?page=1…N equal the items of dist/api/blog.json (one page), every image.url exists.
//      `subline` is compared as text: its HTML now comes from Markdown (no stray <br />, dir="ltr", trailing spaces).
//   3. the home page has the latest-YouTube-video teaser
// Usable until Craft is switched off; afterwards delete it together with scripts/import-craft.ts.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

const LIVE = process.env.LIVE_SITE ?? 'https://isitobservable.io';
const DIST = join(import.meta.dirname, '..', 'dist');
const failures: string[] = [];
const fail = (message: string) => failures.push(message);
const get = async (url: string) => { const res = await fetch(url); if (!res.ok) throw new Error(`${res.status} ${url}`); return res.text(); };
const decode = (s: string) => s.replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
const title = (html: string) => decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '');
const text = (html: string | null) => html && decode(html.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').replace(/&#x26;/g, '&')).replace(/\s+/g, ' ').trim();
const comparable = (item: any) => item && { ...item, subline: text(item.subline) };

// 1. Pages
const index = await get(`${LIVE}/sitemap.xml`);
const sitemaps = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);
const paths = (await Promise.all(sitemaps.map(get))).flatMap((xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname.replace(/\/$/, '')));
for (const path of paths) {
  const file = join(DIST, `${path || '/index'}.html`); // build.format 'file': /about → about.html
  if (!existsSync(file)) { fail(`missing page ${path || '/'}`); continue; }
  const [liveHtml, ourHtml] = [await get(`${LIVE}${path || '/'}`), readFileSync(file, 'utf8')];
  if (title(liveHtml) !== title(ourHtml)) fail(`title ${path || '/'}: live "${title(liveHtml)}" ≠ "${title(ourHtml)}"`);
}
console.log(`pages: ${paths.length} checked`);

// 2. Feed Me API
const first = JSON.parse(await get(`${LIVE}/api/blog.json`));
const live: any[] = [];
for (let page = 1; page <= first.meta.pagination.total_pages; page++) live.push(...JSON.parse(await get(`${LIVE}/api/blog.json?page=${page}`)).data);
const ours: any[] = JSON.parse(readFileSync(join(DIST, 'api/blog.json'), 'utf8')).data;
if (live.length !== ours.length) fail(`api: live has ${live.length} items, dist ${ours.length}`);
for (const [i, item] of live.map(comparable).entries()) {
  const our = comparable(ours[i]);
  for (const key of Object.keys(item)) if (!isDeepStrictEqual(item[key], our?.[key])) fail(`api #${i} ${item.slug}.${key}: ${JSON.stringify(item[key])} ≠ ${JSON.stringify(our?.[key])}`);
}
for (const item of ours) {
  const file = decodeURIComponent(new URL(item.image.url.replace('//assets', '/assets')).pathname);
  if (!existsSync(join(DIST, file))) fail(`api image missing: ${file}`);
}
console.log(`api: ${live.length} items checked`);

// 3. YouTube teaser
if (!/youtube\.com\/watch\?v=[\w-]{11}/.test(readFileSync(join(DIST, 'index.html'), 'utf8'))) fail('home: no latest-video link (YouTube RSS unreachable at build time?)');

if (failures.length) {
  console.error(`\n${failures.length} mismatch(es):\n${failures.map((f) => `  - ${f}`).join('\n')}`);
  process.exit(1);
}
console.log('parity ok');
