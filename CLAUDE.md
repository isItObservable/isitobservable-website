# isitobservable.io

Static Astro site. All content is Markdown/JSON in `src/content/`, images in `src/assets/images/`. No CMS, no database, no server code. It replaced Craft CMS in 2026-11: same content, same URLs (no trailing slash), same look, and `/api/blog.json` keeps its contract.

## Commands

```bash
npm run dev       # http://localhost:4321
npm run check     # astro check: types + content schemas
npm run build     # astro build + Pagefind index (dist/)
npm run preview   # serve dist/
npm run parity    # compare dist/ with the live Craft site (only while Craft is live)
npm run import    # re-import from a Craft DB dump (only while Craft is live, see the header of scripts/import-craft.ts)
```

## Where things are

| What | Where | URL |
|---|---|---|
| Articles | `src/content/articles/<category>/<subcategory>/<slug>.md` | the file path: `/open-telemetry/traces/<slug>` |
| Pages (About, Lightning Talks) | `src/content/pages/<slug>.md` | `/<slug>` |
| Categories (2 levels, order = menu/home order) | `src/content/categories.json` | `/<id>` |
| Topics (order = topic cloud order) | `src/content/topics.json` | none, they link to `/search?q=<title>` |
| Authors | `src/content/authors.json` | – |
| Images (originals) | `src/assets/images/<file>` | optimized at build; originals also at `/assets/images/<file>` |
| Schemas (single source of truth for fields) | `src/content.config.ts` | – |
| Navigation, social links, site constants | `src/lib/site.ts` | – |
| Feed for dynatrace.com (Feed Me) | `src/lib/api.ts` → `src/pages/api/blog.json.ts` | `/api/blog.json` |
| Redirects (old URLs) | `redirects.json` → Astro `redirects` (pages that forward at once) | the `src` paths |

## Add an article

1. Create `src/content/articles/<category>/<subcategory>/<slug>.md` (folder = category, must exist in `categories.json`). Slug in English, lowercase, dashes.
2. Frontmatter (see the schema for all fields). No `craftId`: only articles migrated from Craft have one.
   ```yaml
   title: …
   subline: One paragraph, Markdown.
   date: 2026-12-01T09:00:00Z
   author: giulia-di-pietro # id from authors.json
   topics: [opentelemetry]  # ids from topics.json
   image: { src: ~/assets/images/my-image.jpg, title: Shown as alt text and in the API, alt: null }
   youtube: https://www.youtube.com/watch?v=…
   related: [open-telemetry/traces/…]
   goDeeper: [{ text: View the tutorial on GitHub, url: https://github.com/isItObservable/… }]
   ```
3. Put the image into `src/assets/images/` (filename without spaces).
4. Body: plain Markdown. Images fill the column: `![Title](~/assets/images/foo.png)`; smaller: `![Title](~/assets/images/foo.png "width=200")`. Code: fenced blocks with a language (` ```yaml `).
5. `npm run check && npm run build`.

## Rules

- **`/api/blog.json` is a contract.** dynatrace.com's Feed Me imports it (title, slug, postDate, status, customHeadline, subline, image.url/filename/title, url, contentType, contentSeries, categories) and follows `meta.pagination.links.next`. All articles are on one page, so there's no next link and no `?page=N` (Craft paged by 10). Do not change field names, formats, the double slash in `image.url`, or URLs without trailing slash there.
- **`craftId`** (articles, categories, authors migrated from Craft) is the `id` in `/api/blog.json`: never change or reuse one, never add one to new entries (their API id is `null`).
- **Never rename or delete a file in `src/assets/images/`** that an article uses: Feed Me identifies images by filename.
- **URLs have no trailing slash** (`trailingSlash: 'never'`, `build.format: 'file'` → `about.html`), as on the old site. Links in content and code are written without one.
- **Moving an article file changes its URL.** Add the old path to `redirects.json`.
- **Static hosting, no server logic.** Every folder next to a page (`open-telemetry.html` + `open-telemetry/`) gets an `index.html` that forwards to the page (hook in `astro.config.mjs`), and `404.html` forwards URLs with a trailing slash. Keep both: GitHub Pages needs them for URLs without slash.
- **Images** are always referenced as `~/assets/images/<file>`, in frontmatter and body.
- Code in English. Single quotes, semicolons, 2 spaces, `~/` imports. Comments explain why.
- Plain CSS: tokens in `src/styles/global.css`, everything else scoped in the component. No Tailwind, no UI framework, no client framework. Client JS is small TS in `src/scripts/`.
- JSON in `<script>` is escaped (`<` → `\u003c`).

## Check before commit

```bash
npm run check && npm run build
npm run parity   # while Craft is live
```

## What changed against Craft (deliberate)

- **Code blocks** were broken in Craft (CKEditor lost all indentation, made quotes typographic, editors' search/replace changed tokens such as `fluentbit.fluent.io`). The import restored them: 52 from the isItObservable GitHub repos, 17 JSON re-indented, 99 re-indented by hand (`scripts/code-fixes.json`, whitespace/quotes/case only, checked line by line). All have a language and Shiki highlighting.
- **Subline HTML** in `/api/blog.json` is rendered from Markdown; 12 entries differ from Craft only in stray `<br />`, `dir="ltr"` or trailing spaces.
- **Meta descriptions** are the subline as clean text (Craft's SEOmatic merged words at line breaks).
- **Code blocks** that Craft showed on a single line (CKEditor stored lines as `</p><p>` and Prism joined them) are multi-line now, so some articles are longer.
- **Headings** are no longer wrapped in bold; anchors are lowercase and show on hover. The spacing above h2/h3 is the same as before.
- Commands inside list items are styled code blocks (Craft: unstyled `<pre>`). Three empty spacer paragraphs on Lightning Talks pages are gone. The share icons sit centered without Craft's 48px offset.
- External links always open in a new tab. Body images link to the original instead of a lightbox. Rows use native scroll-snap.
- Category pages also list entries without topics (Craft hid them).
- The latest YouTube video comes from the channel RSS at build time. Rebuild to refresh it.

## Later

- Hosting: GitHub Pages (repo `isItObservable/isitobservable-website`), custom domain isitobservable.io. Check after the first deploy: `/open-telemetry`, `/open-telemetry/`, `/about/`, the redirects, and an `image.url` from `/api/blog.json` with its `//assets/…`.
- GitHub Actions deploy plus a daily rebuild (YouTube teaser).
- Cutover, then delete `scripts/import-craft.ts`, `scripts/code-fixes.json`, `scripts/check-parity.ts` and the devDependencies `mysql2`, `turndown`, `@types/turndown`, `yaml`.

## Deliberately not

No CMS, no database, no SSR or Lambda code, no MDX, no Tailwind, no Swiper/PhotoSwipe, no YouTube API key.
