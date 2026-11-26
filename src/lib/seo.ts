import { SITE_NAME } from './site';
import { sublineToHtml } from './subline';

/** Cut to `length` incl. "…", never inside a word (search results show ~70 / ~155 characters). */
export const truncate = (text: string, length: number) => {
  if (text.length <= length) return text;
  const cut = text.slice(0, length - 1);
  const lastSpace = text[length - 1] === ' ' ? cut.length : cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
};

/** <title>: max. 70 characters including " | Is It Observable". og:title and twitter:title stay complete. */
export const pageTitle = (title: string, siteNameFirst = false) => {
  const short = truncate(title, 70 - ` | ${SITE_NAME}`.length);
  return siteNameFirst ? `${SITE_NAME} | ${short}` : `${short} | ${SITE_NAME}`;
};

const htmlToText = (html: string) => html
  .replace(/<br\s*\/?>/g, ' ')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;|&#x26;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/\s+/g, ' ').trim();

/** Meta description: explicit `seo.description` or the subline as plain text, max. 155 characters. */
export const metaDescription = async (data: { seo?: { description?: string }; subline?: string }) => {
  const text = data.seo?.description ?? (data.subline ? htmlToText(await sublineToHtml(data.subline)) : undefined);
  return text ? truncate(text, 155) : undefined;
};
