import { combine, on, type Cleanup } from '../../_shared/dom';

/** Breadcrumbs that collapse their middle into a "…" button when they do not fit. The button expands them. */
export function enhance(root: HTMLElement): Cleanup {
  const ol = root.querySelector('ol')!;
  const items = [...ol.querySelectorAll<HTMLLIElement>(':scope > li')];
  const moreLi = document.createElement('li');
  moreLi.innerHTML = '<button type="button" data-part="more" aria-label="Show hidden breadcrumb levels">…</button>';
  let expanded = false;
  const fit = () => {
    moreLi.remove();
    items.forEach((li) => li.removeAttribute('data-collapsed'));
    if (expanded || items.length <= 3) return;
    // Hide from the second item onward until the trail fits, keeping first + last two.
    let hidden = 0;
    while (ol.scrollWidth > root.clientWidth + 1 && hidden < items.length - 3) {
      items[1 + hidden].setAttribute('data-collapsed', '');
      hidden++;
      if (!moreLi.isConnected) items[0].after(moreLi);
    }
  };
  const ro = new ResizeObserver(fit);
  ro.observe(root);
  fit();
  return combine(
    on(moreLi, 'click', () => { expanded = true; fit(); ol.style.flexWrap = 'wrap'; items[1].querySelector('a')?.focus(); }),
    () => ro.disconnect(),
  );
}
