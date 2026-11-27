#!/usr/bin/env node
// One-time content lift for the Concept C rebrand (ISI-7951, spec ISI-7919 §3).
//
// Source: the Craft content already carried into src/content/articles/ (the Craft-replacement model,
// /api/blog.json). Target: the rebrand's `videos` collection (src/content/videos/) — the "video→blog
// twins" the Netflix-style hub renders. This is the scripted, reviewed lift §3 calls for: carry the
// content, drop the legacy structure (the 2-level category tree, Craft ids, the /api/blog.json-only
// fields). Rerunnable: it rewrites every file it owns under src/content/videos/ and keeps nothing by
// hand. Run: node scripts/migrate-craft.ts
//
// Not migrated here (deliberate):
//   - Weekly OTel/CloudNative News issues: none exist in the Craft export. That format is new
//     (ISI-7949); the news collections fill forward from the ingestion pipeline, not from Craft.
//   - Livestreams: scheduled/live entries are authored going forward, not carried from Craft.
//
// Delete this script once the rebrand cutover is done and the articles collection is retired.

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const root = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(root, 'src/content/articles');
const OUT = join(root, 'src/content/videos');

// --- Craft 2-level category tree → Concept C 5-bucket taxonomy (src/content/taxonomy.ts) ---
// The taxonomy has no "observability"/"SRE"/"events" bucket, so those fold into the nearest neon
// tile. Security content (runtime security, policy, CVEs) is pulled out of k8s into its own tile
// regardless of where it sat in Craft — that is the one cross-cutting override. Every assignment is
// printed at the end so the mapping is reviewable in the PR.
const SECURITY_HINTS = [
  'secur', 'falco', 'kubearmor', 'tetragon', 'tracee', 'gatekeeper', 'vulnerability',
];
const OTEL_HINTS = ['opentelemetry', 'otel'];

type Category = 'k8s' | 'otel' | 'cloudnative' | 'security';

function categoryFor(relPath: string, topics: string[]): Category {
  const hay = (relPath + ' ' + topics.join(' ')).toLowerCase();
  if (SECURITY_HINTS.some((h) => hay.includes(h))) return 'security';
  if (relPath.startsWith('open-telemetry/')) return 'otel';
  if (
    relPath.startsWith('observability/kubernetes/') ||
    relPath.startsWith('observability/prometheus/') ||
    relPath.startsWith('observability/service-mesh/')
  )
    return 'k8s';
  if (OTEL_HINTS.some((h) => hay.includes(h))) return 'otel';
  // events/*, observability/* (direct), site-reliability-engineering/* → the cloud-native catch-all.
  return 'cloudnative';
}

// youtube.com/watch?v=ID (+ &t=…) and youtu.be/ID → ID.
function youtubeId(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const watch = url.match(/[?&]v=([^&]+)/);
  if (watch) return watch[1];
  const short = url.match(/youtu\.be\/([^?&/]+)/);
  if (short) return short[1];
  return undefined;
}

// A one-paragraph card/meta summary as plain text: strip Markdown links, emphasis and inline code,
// collapse whitespace, trim to a sentence boundary near the limit.
function plainText(md: string, limit = 280): string {
  let s = md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links → text
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (s.length <= limit) return s;
  const cut = s.slice(0, limit);
  const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return (lastStop > limit * 0.5 ? cut.slice(0, lastStop + 1) : cut.replace(/\s+\S*$/, '') + '…').trim();
}

function firstParagraph(body: string): string {
  const p = body.split(/\n\s*\n/).map((x) => x.trim()).find((x) => x && !x.startsWith('#') && !x.startsWith('!['));
  return p ?? '';
}

// Split a Markdown file into { frontmatter object, body string }.
function splitFrontmatter(raw: string): { fm: Record<string, any>; body: string } {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error('no frontmatter');
  return { fm: parseYaml(m[1]) ?? {}, body: m[2].replace(/^\n+/, '') };
}

// YAML-escape a scalar for the double-quoted style we emit for title/description.
function q(s: string): string {
  return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (name.endsWith('.md') && !name.startsWith('_')) yield full;
  }
}

// --- Run ---
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
// Clear previously migrated files (keep the hand-authored _example.md template).
for (const name of readdirSync(OUT)) {
  if (name.endsWith('.md') && !name.startsWith('_')) rmSync(join(OUT, name));
}

const rows: Array<{ slug: string; category: string; from: string; yt: string }> = [];
const slugs = new Set<string>();

for (const file of walk(SRC)) {
  const relPath = relative(SRC, file).replace(/\\/g, '/'); // e.g. observability/kubernetes/foo.md
  const { fm, body } = splitFrontmatter(readFileSync(file, 'utf8'));
  const slug = basename(file, '.md');
  if (slugs.has(slug)) throw new Error(`duplicate slug: ${slug} (from ${relPath})`);
  slugs.add(slug);

  const topics: string[] = Array.isArray(fm.topics) ? fm.topics : [];
  const category = categoryFor(relPath, topics);
  const yt = youtubeId(fm.youtube);

  // description: the Craft subline, else the SEO description, else the opening paragraph.
  const descSource = fm.subline || fm.seo?.description || firstParagraph(body);
  const description = plainText(String(descSource));

  const img: string | undefined = fm.image?.src; // ~/assets/images/<file>
  const thumbFile = img ? img.replace(/^~\/assets\/images\//, '') : undefined;

  // Build the video→blog twin front-matter. Fields the rebrand schema doesn't carry (craftId,
  // youtube URL, related, goDeeper, seo, jsonLd) are dropped from front-matter; goDeeper links are
  // preserved in the body as a "Go deeper" resources section so no tutorial link is lost.
  const lines: string[] = ['---'];
  lines.push(`title: ${q(String(fm.title))}`);
  lines.push(`slug: ${slug}`);
  lines.push(`category: ${category}`);
  if (topics.length) lines.push(`tags: [${topics.join(', ')}]`);
  if (yt) lines.push(`youtubeId: ${yt}`);
  lines.push(`publishDate: ${toDate(fm.date)}`);
  if (thumbFile) lines.push(`thumbnail: ../../assets/images/${thumbFile}`);
  lines.push(`description: ${q(description)}`);
  lines.push('---');

  let out = lines.join('\n') + '\n\n' + body.trimEnd() + '\n';

  const goDeeper: Array<{ text: string; url: string }> = Array.isArray(fm.goDeeper) ? fm.goDeeper : [];
  if (goDeeper.length) {
    out += '\n## Go deeper\n\n';
    for (const g of goDeeper) out += `- [${g.text}](${g.url})\n`;
  }

  writeFileSync(join(OUT, `${slug}.md`), out);
  rows.push({ slug, category, from: relPath, yt: yt ?? '—' });
}

// Date → YYYY-MM-DD (publishDate is a date; the hub orders by day, not time).
function toDate(d: any): string {
  const s = typeof d === 'string' ? d : new Date(d).toISOString();
  return s.slice(0, 10);
}

rows.sort((a, b) => (a.category + a.slug).localeCompare(b.category + b.slug));
const byCat: Record<string, number> = {};
for (const r of rows) byCat[r.category] = (byCat[r.category] ?? 0) + 1;

console.log(`\nMigrated ${rows.length} articles → src/content/videos/\n`);
for (const r of rows) console.log(`  ${r.category.padEnd(12)} ${r.slug}  (${r.from}, yt=${r.yt})`);
console.log('\nBy category:', JSON.stringify(byCat));
const noYt = rows.filter((r) => r.yt === '—');
if (noYt.length) console.log('No youtubeId (blog-only twin):', noYt.map((r) => r.slug).join(', '));
