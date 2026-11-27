#!/usr/bin/env node
// ISI-7949 / architecture ISI-7919 §4C (OPTIONAL, Phase-3 nice-to-have) — refresh the video
// library from the IsItObservable YouTube channel via the YouTube Data API v3.
//
// Scope (§4C): this produces *stubs/metadata* (title, publishDate, youtubeId, thumbnail,
// description), NOT finished blogs — each stub is written with `draft: true` so it never
// publishes until an editor flesh it into the written form of the video. The companion workflow
// opens a PR with the new/changed stubs.
//
// Config (via env, from the workflow):
//   YOUTUBE_API_KEY                 required — GitHub Actions secret
//   YOUTUBE_UPLOADS_PLAYLIST_ID     a playlist id to read (preferred), OR
//   YOUTUBE_CHANNEL_ID              a channel id — its uploads playlist is resolved automatically
//   YOUTUBE_CATEGORY                taxonomy category for the stubs (default: opentelemetry)
//   MAX_RESULTS                     how many recent videos to look at (default: 25)
//   DRY_RUN=1  or  --dry-run        report, write nothing
//
// Usage: node scripts/sync-youtube.ts [--dry-run]

import { existsSync, mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

const DRY_RUN = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const KEY = process.env.YOUTUBE_API_KEY;
const CATEGORY = process.env.YOUTUBE_CATEGORY ?? 'opentelemetry';
const MAX = Number(process.env.MAX_RESULTS ?? 25);
const CONTENT = join(import.meta.dirname, '..', 'src', 'content', 'videos');
const API = 'https://www.googleapis.com/youtube/v3';

if (!KEY) { console.error('YOUTUBE_API_KEY is required'); process.exit(1); }

const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 80);
const yaml = (s: string) => `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

const api = async (path: string, params: Record<string, string>) => {
  const url = new URL(`${API}/${path}`);
  for (const [k, v] of Object.entries({ ...params, key: KEY! })) url.searchParams.set(k, v);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${path}: ${await res.text()}`);
  return res.json();
};

// Resolve the uploads playlist from a channel id when a playlist id is not given directly.
let playlist = process.env.YOUTUBE_UPLOADS_PLAYLIST_ID;
if (!playlist) {
  const channel = process.env.YOUTUBE_CHANNEL_ID;
  if (!channel) { console.error('set YOUTUBE_UPLOADS_PLAYLIST_ID or YOUTUBE_CHANNEL_ID'); process.exit(1); }
  const data = await api('channels', { part: 'contentDetails', id: channel });
  playlist = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!playlist) { console.error(`no uploads playlist for channel ${channel}`); process.exit(1); }
}

const items = (await api('playlistItems', { part: 'snippet,contentDetails', maxResults: String(Math.min(MAX, 50)), playlistId: playlist })).items ?? [];
console.log(`playlist ${playlist}: ${items.length} recent video(s)`);

let created = 0;
let skipped = 0;
const createdSlugs: string[] = [];

for (const it of items) {
  const s = it.snippet ?? {};
  const youtubeId = it.contentDetails?.videoId ?? s.resourceId?.videoId;
  if (!youtubeId) continue;
  const title = String(s.title ?? '').trim();
  if (!title || title === 'Private video' || title === 'Deleted video') continue;
  const slug = slugify(title);
  const file = join(CONTENT, `${slug}.md`);
  if (existsSync(file)) { skipped++; continue; }

  const thumb = s.thumbnails?.maxres?.url ?? s.thumbnails?.high?.url ?? s.thumbnails?.default?.url ?? '';
  const description = String(s.description ?? '').split('\n')[0]!.trim().slice(0, 300);
  const text = [
    '---',
    `title: ${yaml(title)}`,
    `slug: ${yaml(slug)}`,
    'type: video',
    `category: ${CATEGORY}`,
    'tags: []',
    `youtubeId: ${yaml(youtubeId)}`,
    `publishDate: ${new Date(s.publishedAt ?? Date.now()).toISOString().slice(0, 10)}`,
    `thumbnail: ${yaml(thumb)}`,
    `description: ${yaml(description)}`,
    'draft: true # stub from sync-youtube.ts — an editor writes the full post before publishing',
    'featured: false',
    '---',
    '',
    `<!-- Auto-generated stub for https://www.youtube.com/watch?v=${youtubeId} -->`,
    '',
    '_Draft stub. Write the blog form of this video here, then set `draft: false`._',
    '',
  ].join('\n');

  if (DRY_RUN) {
    console.log(`  [dry-run] would write ${slug}.md`);
  } else {
    mkdirSync(CONTENT, { recursive: true });
    writeFileSync(file, text);
    console.log(`  + ${slug}.md`);
  }
  created++;
  createdSlugs.push(slug);
}

console.log(`\n${DRY_RUN ? '[dry-run] ' : ''}created ${created} stub(s), skipped ${skipped} existing`);

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `created=${created}\n`);
  appendFileSync(process.env.GITHUB_OUTPUT, `slugs=${createdSlugs.join(',')}\n`);
}
