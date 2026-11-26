// Arrow buttons for card rows: scroll by one card, disable at the ends.
for (const row of document.querySelectorAll<HTMLElement>('[data-row]')) {
  const scroller = row.querySelector<HTMLElement>('[data-row-scroller]')!;
  const prev = row.querySelector<HTMLButtonElement>('[data-row-prev]')!;
  const next = row.querySelector<HTMLButtonElement>('[data-row-next]')!;
  const step = () => (scroller.firstElementChild as HTMLElement).offsetWidth + parseFloat(getComputedStyle(scroller).columnGap);
  const update = () => {
    prev.disabled = scroller.scrollLeft <= 1;
    next.disabled = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 1;
  };
  prev.addEventListener('click', () => scroller.scrollBy({ left: -step(), behavior: 'smooth' }));
  next.addEventListener('click', () => scroller.scrollBy({ left: step(), behavior: 'smooth' }));
  scroller.addEventListener('scroll', update, { passive: true });
  update();
}
