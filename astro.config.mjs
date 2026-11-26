// @ts-check
import { readFileSync } from 'node:fs';
import { cp, readdir, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import { rehypeHeadingIds, unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

const SITE = 'https://isitobservable.io';

// Old URLs (from Craft's Retour plugin). Static hosting has no server redirects: Astro writes a page that forwards at once.
const redirects = Object.fromEntries(JSON.parse(readFileSync(new URL('./redirects.json', import.meta.url), 'utf8')).map((/** @type {{ src: string, dest: string }} */ r) => [r.src, r.dest]));

/**
 * A category is a page and a folder (open-telemetry.html, open-telemetry/…). GitHub Pages redirects a folder URL to
 * /folder/, which is a 404 without an index.html. With one, it is known to serve open-telemetry.html at /open-telemetry
 * (https://til.simonwillison.net/github/github-pages). So every such folder gets an index.html that forwards to the page. @type {(root: string, dir?: string) => Promise<void>}
 */
const folderIndexes = async (root, dir = root) => {
  for (const name of await readdir(dir)) {
    const path = `${dir}/${name}`;
    if (!(await stat(path)).isDirectory()) continue;
    await folderIndexes(root, path);
    if (!(await stat(`${path}.html`).catch(() => null))) continue;
    const url = path.slice(root.length); // /open-telemetry
    await writeFile(`${path}/index.html`, `<!doctype html><meta charset="utf-8"><title>${url}</title><link rel="canonical" href="${SITE}${url}"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=${url}">`);
  }
};

/** Walks a hast tree; enough for the small rehype step below. @type {(node: any, fn: (node: any) => void) => void} */
const visit = (node, fn) => { fn(node); node.children?.forEach((/** @type {any} */ child) => visit(child, fn)); };
/** Text content of a hast node. @type {(node: any) => string} */
const text = (node) => (node.type === 'text' ? node.value : (node.children ?? []).map(text).join(''));

// External links open in a new tab. Body images link to the original, served at /assets/images/<file> by the hook below.
const contentLinks = () => (/** @type {any} */ tree) => visit(tree, (node) => {
  if (node.tagName === 'a' && /^https?:\/\//.test(node.properties?.href ?? '') && !String(node.properties.href).startsWith(SITE)) {
    node.properties.target = '_blank';
    node.properties.rel = ['noopener', 'noreferrer'];
  }
  // ![alt](src "width=200"): display width instead of full column width
  const width = node.tagName === 'img' && String(node.properties?.title ?? '').match(/^width=(\d+)$/)?.[1];
  if (width) { node.properties.style = `width:${width}px`; delete node.properties.title; }
  node.children?.forEach((/** @type {any} */ child, /** @type {number} */ i) => {
    const src = child.tagName === 'img' && node.tagName !== 'a' ? String(child.properties?.src ?? '') : '';
    if (!src.includes('assets/images/')) return;
    const href = `/assets/images/${encodeURIComponent(decodeURIComponent(src.split('/').pop() ?? ''))}`;
    node.children[i] = { type: 'element', tagName: 'a', properties: { href, target: '_blank', className: ['lightbox'] }, children: [child] };
  });
});

export default defineConfig({
  site: SITE,
  // URLs as on the old site: /about, /open-telemetry/traces/<slug> (no trailing slash) → about.html, …/<slug>.html
  trailingSlash: 'never',
  build: { format: 'file' },
  redirects,
  markdown: {
    // Colors as CSS variables (--shiki-dark) instead of inline styles, so the code background is a design token.
    shikiConfig: { themes: { dark: 'github-dark' }, defaultColor: false },
    // unified (remark/rehype) instead of Astro 7's default Sätteri: we need the rehype steps below.
    // smartypants off: no automatic quote or dash rewriting in content.
    processor: unified({
      smartypants: false,
      rehypePlugins: [
        contentLinks,
        rehypeHeadingIds, // ids first, so the anchors below have something to link to
        // <a class="anchor" href="#id">#</a> before the heading text (styled in Prose.astro).
        [rehypeAutolinkHeadings, {
          behavior: 'prepend',
          test: ['h2', 'h3', 'h4', 'h5', 'h6'],
          properties: (/** @type {any} */ heading) => {
            const label = `Direct link to ${text(heading)}`;
            return { class: 'anchor', title: label, ariaLabel: label };
          },
          content: { type: 'text', value: '#' },
        }],
      ],
    }),
  },
  integrations: [
    sitemap(),
    {
      // Feed Me on dynatrace.com downloads /assets/images/<filename> from /api/blog.json: keep the originals at their old URLs.
      name: 'original-images',
      hooks: {
        'astro:build:done': async ({ dir }) => {
          await cp(fileURLToPath(new URL('./src/assets/images/', import.meta.url)), fileURLToPath(new URL('./assets/images/', dir)), { recursive: true });
          await folderIndexes(fileURLToPath(dir).replace(/\/$/, ''));
        },
      },
    },
  ],
});
