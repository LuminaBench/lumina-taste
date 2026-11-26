import { reducedMotion, type Cleanup } from '../../_shared/dom';

type VTDoc = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };

/**
 * Run a DOM update inside a View Transition when supported (and motion is allowed); otherwise apply it instantly.
 * Give moving elements a unique `view-transition-name` and they morph between layouts.
 */
export function withViewTransition(update: () => void): Promise<void> {
  const doc = document as VTDoc;
  if (!doc.startViewTransition || reducedMotion()) { update(); return Promise.resolve(); }
  return doc.startViewTransition(update).finished.catch(() => {});
}

/**
 * Copy every data-vt-name under root (and on root) to view-transition-name, for browsers without typed attr().
 * The same name on two pages makes that element morph between them when <html data-vt> opts the site in to
 * smooth page changes (tokens/scroll.css). Names must be unique on a page: a duplicate is skipped.
 */
export function nameTransitions(root: ParentNode = document): Cleanup {
  const seen = new Set<string>();
  document.querySelectorAll<HTMLElement>('[style*="view-transition-name"]').forEach((el) => seen.add(el.style.viewTransitionName));
  const els = [...(root instanceof HTMLElement && root.matches('[data-vt-name]') ? [root] : []), ...root.querySelectorAll<HTMLElement>('[data-vt-name]')];
  const named: HTMLElement[] = [];
  for (const el of els) {
    const n = (el.dataset.vtName ?? '').trim();
    if (!/^[a-z][a-z0-9-]*$/i.test(n) || seen.has(n) || el.closest('[hidden]')) continue;
    seen.add(n);
    el.style.viewTransitionName = n;
    named.push(el);
  }
  return () => named.forEach((el) => (el.style.viewTransitionName = ''));
}

/** The gallery sample: a list of pictures; choosing one morphs its picture into the detail view, and back. */
export function enhance(root: HTMLElement): Cleanup {
  const offNames = nameTransitions(root);
  const list = root.querySelector<HTMLElement>('[data-part="list"]');
  const detail = root.querySelector<HTMLElement>('[data-part="detail"]');
  if (!list || !detail) return offNames;
  const hero = detail.querySelector<HTMLElement>('[data-part="hero"]')!;
  const title = detail.querySelector<HTMLElement>('[data-part="title"]')!;
  const price = detail.querySelector<HTMLElement>('[data-part="price"]')!;
  const back = detail.querySelector<HTMLButtonElement>('[data-part="back"]')!;
  let from: HTMLButtonElement | null = null;
  const open = (btn: HTMLButtonElement) => {
    const fig = btn.querySelector<HTMLElement>('figure')!;
    from = btn;
    withViewTransition(() => {
      const copy = fig.cloneNode(true) as HTMLElement;
      copy.style.viewTransitionName = fig.style.viewTransitionName || fig.dataset.vtName || '';
      fig.style.viewTransitionName = '';
      hero.replaceChildren(copy);
      title.textContent = btn.querySelector('[data-part="meta"] b')?.textContent ?? '';
      price.textContent = btn.querySelector('[data-part="meta"] span')?.textContent ?? '';
      list.hidden = true;
      detail.hidden = false;
    }).then(() => back.focus({ preventScroll: true }));
  };
  const close = () => {
    const fig = from?.querySelector<HTMLElement>('figure');
    withViewTransition(() => {
      hero.replaceChildren();
      if (fig) fig.style.viewTransitionName = fig.dataset.vtName ?? '';
      detail.hidden = true;
      list.hidden = false;
    }).then(() => from?.focus({ preventScroll: true }));
  };
  const onClick = (e: Event) => {
    const btn = (e.target as Element).closest<HTMLButtonElement>('[data-vt-open]');
    if (btn && list.contains(btn)) { e.stopPropagation(); open(btn); }
  };
  list.addEventListener('click', onClick);
  back.addEventListener('click', close);
  return () => { offNames(); list.removeEventListener('click', onClick); back.removeEventListener('click', close); };
}
