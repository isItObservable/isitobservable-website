#!/usr/bin/env node
// One-shot import: Craft CMS 5 (prod dump loaded into a local MySQL) → Markdown + JSON in src/content,
// originals into src/assets/images. Rerunnable: rewrites everything it owns, keeps nothing by hand.
// Delete this script (and mysql2/turndown/yaml) once Craft is switched off.
//
//   gzip -dc dump.sql.gz | mysql -h 127.0.0.1 -P 3307 -u root craft
//   gh repo list isItObservable --limit 300 --json name -q '.[].name' | xargs -I{} git clone --depth 1 https://github.com/isItObservable/{} repos/{}
//   CRAFT_DB=mysql://root@127.0.0.1:3307/craft REPOS_DIR=repos npm run import
//
// Content is cleaned on the way, not copied blindly: code blocks get their indentation back from the tutorial repos,
// headings lose Craft's wrapping <strong>, all images are referenced as ~/assets/images/<file>.

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { mkdir, rm, writeFile, stat } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import mysql from 'mysql2/promise';
import TurndownService from 'turndown';
import { stringify } from 'yaml';

const ROOT = join(import.meta.dirname, '..');
const CONTENT = join(ROOT, 'src/content');
const IMAGES = join(ROOT, 'src/assets/images');
const LIVE_SITE = 'https://isitobservable.io';
const SITE_ID = 2; // the only site
const SECTIONS = { blogEntries: 1, categories: 2, topics: 3, contentPages: 12 } as const;

// Craft stores DATETIME in UTC; without timezone 'Z' mysql2 reads them as local time.
const db = await mysql.createConnection({ uri: process.env.CRAFT_DB ?? 'mysql://root@127.0.0.1:3307/craft', charset: 'utf8mb4', timezone: 'Z' });
const query = async <T,>(sql: string) => (await db.query(sql))[0] as T[];

// Live = the published version: not a draft, not a revision, not soft-deleted.
const LIVE = 'el.draftId IS NULL AND el.revisionId IS NULL AND el.dateDeleted IS NULL';

// --- Field layouts: Craft 5 keys elements_sites.content by layout-element UID, not by field handle.
const fieldsByUid = new Map((await query<{ uid: string; handle: string }>('SELECT uid, handle FROM fields')).map((f) => [f.uid, f.handle]));
const fieldsById = new Map((await query<{ id: number; handle: string }>('SELECT id, handle FROM fields')).map((f) => [f.id, f.handle]));
const layoutKeys = new Map<number, Map<string, string>>();
for (const { id, config } of await query<{ id: number; config: any }>('SELECT id, config FROM fieldlayouts WHERE dateDeleted IS NULL')) {
  const keys = new Map<string, string>();
  for (const tab of config?.tabs ?? []) for (const el of tab.elements ?? []) if (el.fieldUid) keys.set(el.uid, fieldsByUid.get(el.fieldUid)!);
  layoutKeys.set(id, keys);
}

type Element = { id: number; title: string; slug: string; uri: string | null; enabled: boolean; fields: Record<string, any> };
const toElement = (r: any): Element => {
  const keys = layoutKeys.get(r.fieldLayoutId) ?? new Map();
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(r.content ?? {})) if (keys.has(k)) fields[keys.get(k)!] = v;
  return { id: r.id, title: r.title, slug: r.slug, uri: r.uri, enabled: !!(r.elEnabled && r.esEnabled), fields };
};
const elementSql = (where: string) => `
  SELECT el.id, el.fieldLayoutId, el.enabled elEnabled, es.enabled esEnabled, es.title, es.slug, es.uri, es.content,
         e.sectionId, e.fieldId, e.postDate, et.handle type
  FROM elements el JOIN elements_sites es ON es.elementId = el.id AND es.siteId = ${SITE_ID}
  LEFT JOIN entries e ON e.id = el.id LEFT JOIN entrytypes et ON et.id = e.typeId
  WHERE ${LIVE} AND ${where}`;

// --- Entries per section (top level only: fieldId IS NULL).
const entries = await query<any>(elementSql('e.fieldId IS NULL AND e.sectionId IS NOT NULL ORDER BY e.postDate DESC, el.id DESC')); // Craft's default order
// Disabled entries were not on the live site, so they are not imported (an empty draft would only leak into the public repo).
const bySection = (id: number) => entries.filter((r) => r.sectionId === id).map((r) => ({ ...toElement(r), postDate: r.postDate as Date })).filter((e) => e.enabled);

// --- Nested blocks (Matrix + Super Table): walk down from live owners, ordered per field.
const nestedRows = await query<any>(`${elementSql('e.fieldId IS NOT NULL')}`);
const owners = await query<{ elementId: number; ownerId: number; sortOrder: number }>('SELECT elementId, ownerId, sortOrder FROM elements_owners');
const nestedById = new Map(nestedRows.map((r) => [r.id, r]));
type Block = Element & { type: string; field: string };
const blocks = new Map<number, Block[]>();
for (const o of owners.sort((a, b) => a.sortOrder - b.sortOrder)) {
  const r = nestedById.get(o.elementId);
  if (!r) continue;
  const list = blocks.get(o.ownerId) ?? [];
  list.push({ ...toElement(r), type: r.type, field: fieldsById.get(r.fieldId)! });
  blocks.set(o.ownerId, list);
}
const childBlocks = (ownerId: number, field: string) => (blocks.get(ownerId) ?? []).filter((b) => b.field === field && b.enabled);

// --- Assets.
type Asset = { id: number; filename: string; title: string; alt: string | null; width: number | null };
const assets = new Map(
  (await query<any>(`SELECT a.id, a.filename, a.alt, a.width, es.title FROM assets a JOIN elements el ON el.id = a.id JOIN elements_sites es ON es.elementId = a.id AND es.siteId = ${SITE_ID} WHERE ${LIVE}`))
    .map((a): [number, Asset] => [a.id, { id: a.id, filename: a.filename, title: a.title, alt: a.alt || null, width: a.width || null }]),
);
const asset = (id: number) => {
  const a = assets.get(id);
  if (!a) throw new Error(`Missing asset ${id}`);
  return a;
};

// --- Lookups for references.
const uriById = new Map(entries.filter((r) => r.uri).map((r) => [r.id as number, r.uri as string]));
const authors = new Map<number, { craftId: number; key: string; name: string; username: string; email: string; image?: string }>();
for (const u of await query<any>(`SELECT u.id, u.username, u.fullName, u.email, el.fieldLayoutId, es.content FROM users u JOIN entries_authors ea ON ea.authorId = u.id
  JOIN elements el ON el.id = u.id JOIN elements_sites es ON es.elementId = u.id AND es.siteId = ${SITE_ID} GROUP BY u.id`)) {
  const photo = toElement(u).fields.image?.[0]; // custom "image" field on users, not Craft's photoId
  authors.set(u.id, { craftId: u.id, key: slugify(u.fullName), name: u.fullName, username: u.username, email: u.email, image: photo ? imageRef(asset(photo).filename) : undefined });
}
const authorOf = new Map((await query<{ entryId: number; authorId: number }>('SELECT entryId, authorId FROM entries_authors ORDER BY sortOrder')).map((r) => [r.entryId, r.authorId]));

// --- HTML → Markdown.
const unknownTags = new Map<string, number>();
// br as backslash: Markdown's default "two trailing spaces" would not survive the trailing-whitespace cleanup.
const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-', emDelimiter: '*', hr: '---', br: '\\' });
// "- item" / "1. item" instead of turndown's "-   item"; continuation lines indented to the marker width.
turndown.addRule('listItem', {
  filter: 'li',
  replacement: (content, node: any) => {
    const parent = node.parentNode;
    const marker = parent.nodeName === 'OL' ? `${(Number(parent.getAttribute('start')) || 1) + Array.prototype.indexOf.call(parent.children, node)}. ` : '- ';
    const text = content.replace(/^\n+/, '').replace(/\n+$/, '\n').replace(/\n/gm, `\n${' '.repeat(marker.length)}`);
    return marker + text + (node.nextSibling && !/\n$/.test(text) ? '\n' : '');
  },
});
// Literal "<ID of the container>" in prose would turn into an HTML tag in Markdown and vanish.
const escapeText = turndown.escape.bind(turndown);
turndown.escape = (text: string) => escapeText(text).replace(/</g, '\\<');
/** One way to point at an image, in frontmatter and body alike. */
// Craft stores some names decomposed (e + ´). Git and Linux keep them composed (é), so references and files are NFC.
function imageRef(filename: string) { return `~/assets/images/${filename.normalize('NFC')}`; }
/** Images fill the column; a smaller display width (as set in the old editor) goes into the title: ![alt](src "width=200"). */
const mdImage = (alt: string, filename: string, width?: number) => `![${alt.replace(/[[\]]/g, '\\$&')}](${imageRef(filename)}${width ? ` "width=${width}"` : ''})`;

// {asset:123:url||https://…} and {entry:123@1:url||https://…}: Craft reference tags with a fallback URL.
const resolveRef = (value: string) =>
  value
    .replace(/\{entry:(\d+)(?:@\d+)?:url(?:\|\|([^}]*))?\}/g, (_, id, fallback) => (uriById.has(+id) ? `/${uriById.get(+id)}` : fallback ?? ''))
    .replace(/\{asset:(\d+)(?::url)?(?:\|\|([^}]*))?\}/g, (_, id) => `asset:${id}`);

turndown.addRule('craftImage', {
  filter: 'img',
  replacement: (_content, node: any) => {
    const src = resolveRef(node.getAttribute('src') ?? '');
    const id = src.match(/^asset:(\d+)/)?.[1];
    if (!id) return `![${node.getAttribute('alt') ?? ''}](${src})`;
    const a = asset(+id);
    const width = Number(node.getAttribute('width')) || undefined;
    return mdImage(node.getAttribute('alt') || a.title, a.filename, width && width < 800 ? width : undefined);
  },
});
turndown.addRule('craftLink', {
  filter: (node) => node.nodeName === 'A' && !!node.getAttribute('href'),
  replacement: (content, node: any) => {
    const href = resolveRef(node.getAttribute('href'));
    const title = node.getAttribute('title');
    return content.trim() ? `[${content}](${href.replace(/ /g, '%20')}${title ? ` "${title}"` : ''})` : '';
  },
});
// Three stray <h1> in bodies: the page already has the hero <h1>.
turndown.addRule('h1', { filter: 'h1', replacement: (content) => `\n\n## ${content}\n\n` });
// Bare <pre> (no <code>) in text and list items: turndown would flatten it into a paragraph.
turndown.addRule('pre', {
  filter: (node) => node.nodeName === 'PRE' && node.firstChild?.nodeName !== 'CODE',
  replacement: (_content, node: any) => `\n\n${fenced(node.textContent.replace(/ /g, ' ').replace(/\n$/, ''))}\n\n`,
});
turndown.addRule('figure',{ filter: 'figure', replacement: (content) => `\n\n${content.trim()}\n\n` });
// Keep YouTube/Vimeo iframes and tables as raw HTML: Markdown has no equivalent, Astro passes HTML through.
turndown.keep(['iframe', 'table'] as any);

const markdown = (html: string | null | undefined) => {
  if (!html) return '';
  for (const m of html.matchAll(/<(iframe|table|video|audio|object|embed|script|form)[\s>]/g)) unknownTags.set(m[1], (unknownTags.get(m[1]) ?? 0) + 1);
  return turndown.turndown(html)
    .replace(/[ \t]+$/gm, '')
    .replace(/\\(?=\n\s*\n|\s*$)/g, '') // a <br> ending a paragraph: invisible in Craft, a literal "\" in Markdown
    .replace(/(\S)\*\*\*\*(\S)/g, '$1$2') // <strong>a</strong><strong>b</strong> → one bold run, not a literal "****"
    .replace(/^(#{2,6}) \*\*([^*]+)\*\*$/gm, '$1 $2') // "## **Title**": headings are bold already
    .replace(/^(#{2,6} \d+)\\\./gm, '$1.') // "### 3\. Step": the escape is only needed in lists
    .trim();
};

// --- Code blocks. CKEditor collapsed all indentation, turned quotes and "--" into typography, and editors' search/replace
// reached into code ("fluentbit.fluent.io" → "Fluent Bit.fluent.io"). The code comes from the isItObservable tutorial repos,
// so each block is looked up there (line by line, ignoring case, spaces, quotes and dashes) and the original lines are used.
const LANGS: Record<string, string> = {
  yaml: 'yaml', yml: 'yaml', json: 'json', sh: 'bash', bash: 'bash', shell: 'bash', console: 'bash', zsh: 'bash', go: 'go', js: 'javascript',
  javascript: 'javascript', mjs: 'javascript', ts: 'typescript', typescript: 'typescript', py: 'python', python: 'python', java: 'java',
  tf: 'hcl', hcl: 'hcl', toml: 'toml', properties: 'properties', ini: 'ini', conf: 'ini', sql: 'sql', xml: 'xml', dockerfile: 'dockerfile',
};
const codeKey = (line: string) => line.toLowerCase().replace(/[\s\-–—"“”„'‘’`]/g, '');
const repoLines: string[] = [], repoLang: (string | undefined)[] = [], repoFile: number[] = [];
const repoIndex = new Map<string, number[]>();
const codeStats = { restored: 0, json: 0, guessed: 0, fixed: 0 };
if (process.env.REPOS_DIR) {
  let fileNo = 0;
  for (const rel of readdirSync(process.env.REPOS_DIR, { recursive: true }) as string[]) {
    if (/(^|\/)(\.git|node_modules|vendor)(\/|$)/.test(rel)) continue;
    const path = join(process.env.REPOS_DIR, rel);
    const ext = extname(rel).slice(1).toLowerCase();
    const isMd = ext === 'md';
    const fileLang = basename(rel) === 'Dockerfile' ? 'dockerfile' : LANGS[ext];
    if (!isMd && !fileLang) continue;
    const st = statSync(path);
    if (!st.isFile() || st.size > 300_000) continue;
    const text = readFileSync(path, 'utf8');
    if (text.includes('\0')) continue;
    fileNo++;
    let fenceLang: string | undefined, inFence = false;
    for (const line of text.split(/\r?\n/)) {
      if (isMd && /^\s*```/.test(line)) { inFence = !inFence; fenceLang = inFence ? LANGS[line.trim().slice(3).toLowerCase()] : undefined; continue; }
      if (isMd && !inFence) continue; // prose of READMEs is not code
      const key = codeKey(line);
      const id = repoLines.push(line.replace(/\s+$/, '')) - 1;
      repoLang.push(isMd ? fenceLang : fileLang);
      repoFile.push(fileNo);
      if (key.length >= 6) repoIndex.set(key, [...(repoIndex.get(key) ?? []), id]);
    }
  }
  console.log(`code index: ${repoLines.length} lines from ${fileNo} files`);
} else {
  console.warn('REPOS_DIR not set: code blocks keep Craft\'s collapsed indentation');
}

// Blocks the repos could not fully restore were re-indented by hand (whitespace only, checked line by line): scripts/code-fixes.json,
// keyed by a hash of Craft's text. CODE_TODO=<file> writes the blocks that still need that review.
const FIXES_FILE = join(import.meta.dirname, 'code-fixes.json');
const codeFixes: Record<string, { lang?: string; code: string }> = existsSync(FIXES_FILE) ? JSON.parse(readFileSync(FIXES_FILE, 'utf8')) : {};
const codeTodo: { hash: string; file: string; lang?: string; original: string; suggestion?: string }[] = [];
const usedFixes = new Set<string>();
const hashCode = (text: string) => createHash('sha1').update(text).digest('hex').slice(0, 16);
let currentEntry = '';

/** Typography that has no business in code. */
const plainCode = (line: string) => line.replace(/[“”„]/g, '"').replace(/[‘’]/g, "'").replace(/[–—]/g, '--');

const guessLang = (lines: string[]) => {
  const text = lines.filter((l) => l.trim());
  if (!text.length) return undefined;
  const first = text[0]!.trim();
  if (/^(\$ )?(kubectl|helm|git|curl|docker|export|cd|echo|sudo|npm|go|make|kind|minikube|gcloud|aws|az|cat|wget|chmod|mkdir|k6|istioctl|linkerd|cilium|hubble|kubectx|kustomize)\b/.test(first)) return 'bash';
  if (text.filter((l) => /^\s*-?\s*[\w.\/"-]+:(\s|$)/.test(l)).length / text.length >= 0.6) return 'yaml';
  return undefined;
};

/** Finds the block in the repos (rarest lines as anchors, LCS alignment around them) and returns the original lines. */
const restoreCode = (text: string): { code: string; lang?: string } => {
  const hash = hashCode(text);
  if (codeFixes[hash]) { codeStats.fixed++; usedFixes.add(hash); return codeFixes[hash]; }
  const result = matchRepos(text);
  // Multi-line code whose structure depends on indentation that is still collapsed (or only partly restored) needs review.
  const lines = result.code.split('\n').filter((l) => l.trim());
  const flat = lines.length > 1 && lines.some((l) => /^ \S/.test(l)) && !lines.some((l) => /^ {2}/.test(l));
  if (result.partial || (!result.restored && flat)) codeTodo.push({ hash, file: currentEntry, lang: result.lang, original: text, suggestion: result.partial ? result.code : undefined });
  return result;
};

const matchRepos = (text: string): { code: string; lang?: string; restored?: boolean; partial?: boolean } => {
  const lines = text.split('\n');
  const keys = lines.map(codeKey);
  const nonBlank = keys.filter((k) => k).length;
  let best: { score: number; match: (number | undefined)[] } | undefined;
  const anchors = keys.map((k, i) => ({ i, hits: k.length >= 6 ? repoIndex.get(k) ?? [] : [] }))
    .filter((a) => a.hits.length && a.hits.length <= 40).sort((a, b) => a.hits.length - b.hits.length).slice(0, 4);
  for (const anchor of anchors) for (const hit of anchor.hits) {
    // Longest common subsequence between the block and a window of the file around the anchor.
    let from = hit, to = hit;
    while (from > 0 && repoFile[from - 1] === repoFile[hit] && hit - from < anchor.i + 30) from--;
    while (to + 1 < repoLines.length && repoFile[to + 1] === repoFile[hit] && to - hit < keys.length - anchor.i + 60) to++;
    const window = repoLines.slice(from, to + 1).map(codeKey);
    const dp = Array.from({ length: keys.length + 1 }, () => new Uint16Array(window.length + 1));
    for (let i = keys.length - 1; i >= 0; i--) for (let j = window.length - 1; j >= 0; j--) {
      dp[i]![j] = keys[i] && keys[i] === window[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
    const match: (number | undefined)[] = Array(keys.length).fill(undefined);
    for (let i = 0, j = 0; i < keys.length && j < window.length;) {
      if (keys[i] && keys[i] === window[j]) { match[i] = from + j; i++; j++; } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) i++; else j++;
    }
    const score = dp[0]![0]! / nonBlank;
    if (!best || score > best.score) best = { score, match };
  }
  if (!best || best.score < 0.6) {
    const code = lines.map(plainCode).join('\n');
    try { // JSON can be re-indented without knowing the source
      const pretty = JSON.stringify(JSON.parse(code), null, 2);
      if (lines.length > 1) { codeStats.json++; return { code: pretty, lang: 'json' }; }
    } catch {}
    codeStats.guessed++;
    return { code, lang: guessLang(code.split('\n')) };
  }
  codeStats.restored++;
  let indent = '';
  const code = lines.map((line, i) => {
    const j = best.match[i];
    if (j !== undefined) { indent = repoLines[j]!.match(/^\s*/)![0]; return repoLines[j]!; }
    return line.trim() ? indent + plainCode(line.trim()) : ''; // edited in the article: keep the text, borrow the indentation
  }).join('\n');
  const langs = best.match.filter((j) => j !== undefined).map((j) => repoLang[j!]).filter(Boolean);
  return { code, lang: langs[0] ?? guessLang(code.split('\n')), restored: true, partial: best.score < 1 };
};

/** CKEditor stored code as one <p> per line. Join the lines, keep the text exactly (indentation included). */
const codeBlock = (html: string) => {
  // One <p> (or <p dir="ltr">) per line; where CKEditor turned a typed "- " into <ul><li>, the dash comes back.
  const lines = [...html.matchAll(/<(p|li)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g)].map((m) => (m[1] === 'li' ? `- ${m[2]}` : m[2]));
  const inner = (lines.length ? lines.join('\n') : html).replace(/<br\s*\/?>/g, '\n');
  const text = turndown.turndown(`<pre><code>${inner}</code></pre>`).replace(/^```\n?|\n?```$/g, '').replace(/\u00a0/g, ' ');
  return fenced(text);
};

/** Fenced code block: original lines from the tutorial repos where found, a language for Shiki, a fence longer than any ``` inside. */
function fenced(text: string) {
  const { code, lang } = restoreCode(text);
  const fence = '`'.repeat(Math.max(3, ...[...code.matchAll(/`+/g)].map((m) => m[0].length + 1)));
  return `${fence}${lang ?? ''}\n${code}\n${fence}`;
}

const body = (ownerId: number) =>
  childBlocks(ownerId, 'contentBuilder')
    .map((b) => {
      switch (b.type) {
        case 'text': return markdown(b.fields.text);
        case 'code': return codeBlock(b.fields.code ?? '');
        // Image blocks fill the column; SVGs were shown at their own size
        case 'image': return (b.fields.image2 ?? []).map((id: number) => { const a = asset(id); return mdImage(a.title, a.filename, a.filename.endsWith('.svg') && (a.width ?? 800) < 800 ? a.width! : undefined); }).join('\n\n');
        case 'list': {
          const tag = b.fields.listType === 'ordered' ? 'ol' : 'ul';
          return markdown(`<${tag}>${childBlocks(b.id, 'list').map((i) => `<li>${i.fields.item ?? ''}</li>`).join('')}</${tag}>`);
        }
        default: throw new Error(`Unknown block type ${b.type} in ${ownerId}`);
      }
    })
    .filter(Boolean)
    .join('\n\n');

// --- SEOmatic field: only literal overrides survive; templates like {entry.title} are the defaults the site applies anyway.
const seo = (value: any) => {
  const bundle = typeof value === 'string' ? JSON.parse(value) : value;
  const vars = typeof bundle?.metaGlobalVars === 'string' ? JSON.parse(bundle.metaGlobalVars) : bundle?.metaGlobalVars ?? {};
  const literal = (v: unknown) => (typeof v === 'string' && v.trim() && !v.includes('{') ? v.trim() : undefined);
  // seoTitle is skipped: the one literal value ("vulnerability-fluent-bit") never reached the live page.
  const out = { description: literal(vars.seoDescription), robots: vars.robots && vars.robots !== 'all' ? literal(vars.robots) : undefined };
  return Object.values(out).some(Boolean) ? JSON.parse(JSON.stringify(out)) : undefined;
};

const hyperUrl = (value: any) => (Array.isArray(value) ? value[0]?.linkValue : undefined) || undefined;
const jsonLd = (ownerId: number) => {
  const list = childBlocks(ownerId, 'metaJsonLd').map((b) => JSON.parse(b.fields.jsonLd));
  return list.length ? list : undefined;
};

// --- Write helpers.
const write = async (file: string, data: unknown, content?: string) => {
  await mkdir(dirname(file), { recursive: true });
  const text = content === undefined ? `${JSON.stringify(data, null, 2)}\n` : `---\n${stringify(data, { lineWidth: 0 })}---\n\n${content}\n`;
  await writeFile(file, text);
};
const clean = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && !(Array.isArray(v) && !v.length) && v !== '')) as T;

await rm(join(CONTENT, 'articles'), { recursive: true, force: true });
await rm(join(CONTENT, 'pages'), { recursive: true, force: true });

// --- Categories (structure order = lft).
const order = new Map((await query<{ elementId: number; lft: number; parent: number | null }>(
  `SELECT se.elementId, se.lft, (SELECT p.elementId FROM structureelements p WHERE p.structureId = se.structureId AND p.lft < se.lft AND p.rgt > se.rgt AND p.level = se.level - 1) parent
   FROM structureelements se WHERE se.structureId = 2 AND se.elementId IS NOT NULL`,
)).map((r) => [r.elementId, r]));
const categories = bySection(SECTIONS.categories).sort((a, b) => order.get(a.id)!.lft - order.get(b.id)!.lft);
await write(join(CONTENT, 'categories.json'), categories.map((c) => clean({
  id: c.uri!, craftId: c.id, title: c.title, slug: c.slug,
  parent: order.get(c.id)!.parent ? uriById.get(order.get(c.id)!.parent!) : undefined,
  subline: markdown(c.fields.subline) || undefined, seo: seo(c.fields.seoSettings),
})));

// --- Topics (Craft listed them in channel default order: postDate desc).
const topics = bySection(SECTIONS.topics);
const topicKey = new Map(topics.map((t) => [t.id, t.slug]));
await write(join(CONTENT, 'topics.json'), topics.map((t) => ({ id: t.slug, title: t.title })));

// --- Authors: only those of an article (users who only touched drafts or pages stay out, with their email).
const articleAuthors = new Set(bySection(SECTIONS.blogEntries).map((e) => authorOf.get(e.id)));
await write(join(CONTENT, 'authors.json'), [...authors.values()].filter((a) => articleAuthors.has(a.craftId)).map(({ key, ...a }) => ({ id: key, ...a })));

// --- Articles and pages.
const articleUris = new Set(bySection(SECTIONS.blogEntries).map((e) => e.uri));
// A trailing <br> renders as a literal "\" in Markdown and was invisible in Craft anyway.
const subline = (html: string | undefined) => markdown(html).replace(/\\$/, '') || undefined;
const common = (e: ReturnType<typeof bySection>[number]) => ({
  title: e.title,
  headline: e.fields.customHeadline || undefined,
  subline: subline(e.fields.subline),
  date: e.postDate.toISOString().replace('.000Z', 'Z'),
});
for (const e of bySection(SECTIONS.blogEntries)) {
  currentEntry = `articles/${e.uri}.md`;
  const hero = (e.fields.image ?? [])[0] ? asset(e.fields.image[0]) : undefined;
  const author = authors.get(authorOf.get(e.id)!);
  await write(join(CONTENT, 'articles', `${e.uri}.md`), clean({
    craftId: e.id,
    ...common(e),
    author: author?.key,
    topics: (e.fields.topics ?? []).map((id: number) => topicKey.get(id)).filter(Boolean),
    image: hero ? { src: imageRef(hero.filename), title: hero.title, alt: hero.alt } : undefined,
    youtube: hyperUrl(e.fields.youtubeLink),
    related: (e.fields.relatedArticles ?? []).map((id: number) => uriById.get(id)).filter((uri: string) => articleUris.has(uri)),
    goDeeper: childBlocks(e.id, 'goDeeperLinks').map((b) => {
      const link = b.fields.goDeeperLink?.[0] ?? {};
      return { text: link.linkText || link.linkValue, url: link.linkValue };
    }).filter((l) => l.url),
    seo: seo(e.fields.seoSettings),
    jsonLd: jsonLd(e.id),
  }), body(e.id));
}
for (const e of bySection(SECTIONS.contentPages)) {
  currentEntry = `pages/${e.uri}.md`;
  await write(join(CONTENT, 'pages', `${e.uri}.md`), clean({
    ...common(e),
    category: uriById.get((e.fields.categories ?? [])[0]), // pages live at /<slug>/, so the category is explicit
    topics: (e.fields.topics ?? []).map((id: number) => topicKey.get(id)).filter(Boolean),
    seo: seo(e.fields.seoSettings),
    jsonLd: jsonLd(e.id),
  }), body(e.id));
}

// --- Redirects (Retour static redirects) for the hosting phase.
await write(join(ROOT, 'redirects.json'), (await query<any>('SELECT redirectSrcUrl src, redirectDestUrl dest FROM retour_static_redirects WHERE enabled = 1 ORDER BY id'))
  .map((r) => ({ src: r.src, dest: r.dest })));

// --- Originals: skip files already downloaded with the same size, so reruns are cheap.
await mkdir(IMAGES, { recursive: true });
const sizes = new Map((await query<{ filename: string; size: number }>(`SELECT a.filename, a.size FROM assets a JOIN elements el ON el.id = a.id WHERE ${LIVE}`)).map((a) => [a.filename, a.size]));
let downloaded = 0;
for (const a of assets.values()) {
  const file = join(IMAGES, a.filename.normalize('NFC'));
  if ((await stat(file).catch(() => null))?.size === sizes.get(a.filename)) continue;
  const res = await fetch(`${LIVE_SITE}/assets/images/${encodeURIComponent(a.filename)}`);
  if (!res.ok) { console.warn(`! ${res.status} ${a.filename}`); continue; }
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  downloaded++;
}

console.log(`code blocks: ${codeStats.fixed} from code-fixes.json, ${codeStats.restored} restored from the repos, ${codeStats.json} JSON re-indented, ${codeStats.guessed} unchanged`);
if (process.env.CODE_TODO) await writeFile(process.env.CODE_TODO, JSON.stringify(codeTodo, null, 2));
const unusedFixes = Object.keys(codeFixes).filter((h) => !usedFixes.has(h));
if (unusedFixes.length) console.warn(`code-fixes.json: ${unusedFixes.length} unused (Craft text changed?): ${unusedFixes.join(', ')}`);
if (codeTodo.length) console.warn(`${codeTodo.length} code blocks need review (CODE_TODO=<file> lists them)`);
console.log(`articles ${articleUris.size}, pages ${bySection(SECTIONS.contentPages).length}, categories ${categories.length}, topics ${topics.length}, authors ${authors.size}, images ${assets.size} (${downloaded} downloaded)`);
if (unknownTags.size) console.log('raw HTML kept:', Object.fromEntries(unknownTags));
await db.end();

function slugify(s: string) {
  return s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
