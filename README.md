# isitobservable.io

The website of [Is It Observable](https://isitobservable.io): tutorials and episodes about observability, OpenTelemetry and Kubernetes.

A static [Astro](https://astro.build) site. All content is Markdown and JSON in `src/content/`, images are in `src/assets/images/`. There's no CMS, no database and no server code. Search is [Pagefind](https://pagefind.app), built with the site.

## Run it

Needs Node 24 (`.nvmrc`, `.node-version`).

```bash
npm ci
npm run dev       # http://localhost:4321
```

```bash
npm run check     # types + content schemas
npm run build     # static site + search index in dist/
npm run preview   # serve dist/
```

## Write an article

1. Create `src/content/articles/<category>/<subcategory>/<slug>.md`. The path is the URL, and the folder must be a category from `src/content/categories.json`.
2. Put the hero and body images into `src/assets/images/` and reference them as `~/assets/images/<file>`.
3. Run `npm run check && npm run build`.

The frontmatter fields are defined in `src/content.config.ts`. [CLAUDE.md](CLAUDE.md) has an example article, the project layout and the rules, for example that `/api/blog.json` is a feed other sites import and must not change shape.

## Tutorials

The code for the episodes lives in the [isItObservable](https://github.com/isItObservable) GitHub organization.

## License

© Dynatrace LLC. All rights reserved. The source is public to read and learn from, but it isn't open source: there's no license that lets you copy, modify or redistribute it.[^license]

[^license]: Most of this repository is content, not code: the articles, the speaker photos, screenshots and other images, the logos and the design of isitobservable.io. An open source license would apply to all of it, and some of it isn't ours to license, for example photos of speakers. Splitting the code and the content into two licenses isn't worth it for a site this size. So the repo is public for transparency and as a reference, but no license is granted. The tutorial code lives in the episode repos linked above, and each of those repos has its own terms.
