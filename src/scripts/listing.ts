// Category/search listing: category + topic filter, 12 cards per page, and on /search the Pagefind query from ?q=.
// Filter rule: (no category chosen or card's category chosen) and (no topic chosen or card has a chosen topic).
const PER_PAGE = 12;

const root = document.querySelector<HTMLElement>('[data-listing]')!;
const cards = [...document.querySelectorAll<HTMLElement>('[data-card]')];
const grid = document.querySelector<HTMLElement>('[data-listing-grid]')!;
const pages = document.querySelector<HTMLElement>('[data-listing-pages]')!;
const empty = document.querySelector<HTMLElement>('[data-listing-empty]')!;
const reset = root.querySelector<HTMLButtonElement>('[data-filter-reset]')!;
const boxes = [...root.querySelectorAll<HTMLInputElement>('input[type=checkbox]')];
const isSearch = root.hasAttribute('data-search');

let matches: HTMLElement[] = cards; // search results in score order, or all cards
let page = 1;

const render = () => {
  const categories = boxes.filter((b) => b.name === 'category' && b.checked).map((b) => b.value);
  const topics = boxes.filter((b) => b.name === 'topic' && b.checked).map((b) => b.value);
  const visible = matches.filter((card) =>
    (!categories.length || categories.includes(card.dataset.category!)) &&
    (!topics.length || card.dataset.topics!.split(',').some((t) => topics.includes(t))));
  const total = Math.max(1, Math.ceil(visible.length / PER_PAGE));
  page = Math.min(page, total);

  for (const card of cards) card.hidden = true;
  visible.forEach((card, i) => {
    grid.append(card); // keeps search score order
    card.hidden = i < (page - 1) * PER_PAGE || i >= page * PER_PAGE;
  });
  empty.hidden = visible.length > 0;
  reset.hidden = !categories.length && !topics.length;

  pages.replaceChildren(...(total > 1 ? Array.from({ length: total }, (_, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = String(i + 1);
    if (i + 1 === page) button.setAttribute('aria-current', 'page');
    button.addEventListener('click', () => { page = i + 1; render(); grid.scrollIntoView({ behavior: 'smooth' }); });
    return button;
  }) : []));
};

for (const box of boxes) box.addEventListener('change', () => { page = 1; render(); });
reset.addEventListener('click', () => { for (const box of boxes) box.checked = false; page = 1; render(); });

// Close an open dropdown when clicking elsewhere (desktop).
document.addEventListener('click', (event) => {
  for (const details of root.querySelectorAll('details[open]')) if (!details.contains(event.target as Node)) details.removeAttribute('open');
});

const toggle = root.querySelector<HTMLButtonElement>('[data-filter-toggle]')!;
toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Close filter' : 'Open filter');
  root.querySelector('[data-filters]')!.classList.toggle('is-open', open);
});

if (isSearch) {
  const query = new URLSearchParams(location.search).get('q')?.trim() ?? '';
  const title = root.querySelector<HTMLElement>('[data-listing-title]')!;
  if (query) {
    // Pagefind is generated after the build (postbuild), so it is imported at runtime, not bundled.
    const pagefindUrl = '/pagefind/pagefind.js';
    const pagefind = await import(/* @vite-ignore */ pagefindUrl);
    const search = await pagefind.search(query);
    // Pagefind reports file URLs (/about.html); cards carry the page URL (/about)
    const urls: string[] = (await Promise.all(search.results.map((r: { data: () => Promise<{ url: string }> }) => r.data()))).map((d) => d.url.replace(/(\/index)?\.html$/, ''));
    const byUrl = new Map(cards.map((card) => [card.dataset.url!, card]));
    matches = urls.map((url) => byUrl.get(url)).filter((card): card is HTMLElement => !!card);
  }
  title.textContent = `${matches.length} results found for ${query}`;
  const input = document.querySelector<HTMLInputElement>('[data-search] input');
  if (input) input.value = query;
}

render();

export {}; // module: allows the top-level await above
