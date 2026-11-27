// Guards the one coupling astro build can't see: every category color referenced by the taxonomy
// (src/content/taxonomy.ts) must be a real `--cat-*` token in src/styles/global.css. Keeps the
// "single source of truth" promise honest — a renamed/removed token fails here instead of silently
// rendering a transparent tile. Run: node scripts/check-taxonomy.mjs
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('..', import.meta.url);
const taxonomy = readFileSync(new URL('src/content/taxonomy.ts', root), 'utf8');
const css = readFileSync(new URL('src/styles/global.css', root), 'utf8');

const referenced = [...taxonomy.matchAll(/colorVar:\s*'(--cat-[\w-]+)'/g)].map((m) => m[1]);
assert.ok(referenced.length >= 5, `expected ≥5 category colors, found ${referenced.length}`);

const defined = new Set([...css.matchAll(/(--cat-[\w-]+)\s*:/g)].map((m) => m[1]));
const missing = referenced.filter((v) => !defined.has(v));
assert.deepEqual(missing, [], `taxonomy references undefined CSS tokens: ${missing.join(', ')}`);

console.log(`✓ taxonomy: ${referenced.length} category colors all defined in global.css`);
