// Subline Markdown → HTML for /api/blog.json. Plain TS (no astro: imports) so scripts/import-craft.ts can use it too.
import { createMarkdownProcessor } from '@astrojs/markdown-remark';

const processor = createMarkdownProcessor({ smartypants: false, syntaxHighlight: false });

/** "Learn about **k6**" → "<p>Learn about <strong>k6</strong></p>" */
export const sublineToHtml = async (markdown: string) => (await (await processor).render(markdown)).code.trim();
