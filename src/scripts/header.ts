// Header: dropdowns (open on click), mobile menu, expanding search field (Enter goes to /search?q=).
const header = document.querySelector<HTMLElement>('[data-header]')!;

const dropdowns = [...header.querySelectorAll<HTMLButtonElement>('[data-dropdown]')];
const setOpen = (button: HTMLButtonElement, open: boolean) => {
  button.setAttribute('aria-expanded', String(open));
  (button.nextElementSibling as HTMLElement).hidden = !open;
};
for (const button of dropdowns) {
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = button.getAttribute('aria-expanded') !== 'true';
    for (const other of dropdowns) if (other !== button && !header.querySelector('[data-mobile-nav]')!.contains(other)) setOpen(other, false);
    setOpen(button, open);
  });
}

const burger = header.querySelector<HTMLButtonElement>('[data-burger]')!;
const mobileNav = header.querySelector<HTMLElement>('[data-mobile-nav]')!;
burger.addEventListener('click', () => {
  const open = burger.getAttribute('aria-expanded') !== 'true';
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  mobileNav.hidden = !open;
  document.documentElement.classList.toggle('is-locked', open);
});

const search = header.querySelector<HTMLFormElement>('[data-search]')!;
const input = search.querySelector('input')!;
const openSearch = () => { search.classList.add('is-open'); input.focus(); };
const closeSearch = () => search.classList.remove('is-open');
search.querySelector('[data-search-open]')!.addEventListener('click', (event) => {
  event.stopPropagation();
  if (search.classList.contains('is-open') && input.value) search.requestSubmit(); else openSearch();
});
search.querySelector('[data-search-close]')!.addEventListener('click', closeSearch);

document.addEventListener('click', (event) => {
  if (!search.contains(event.target as Node)) closeSearch();
  for (const button of dropdowns) if (!mobileNav.contains(button) && !button.parentElement!.contains(event.target as Node)) setOpen(button, false);
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  closeSearch();
  for (const button of dropdowns) if (!mobileNav.contains(button)) setOpen(button, false);
});
