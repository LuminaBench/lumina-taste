import { emit, on, reducedMotion, type Cleanup } from '../../_shared/dom';

type Mode = 'light' | 'dark';
type VTDocument = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };

/** The element whose data-mode this switch controls: data-target selector, nearest taste root, or <html>. */
function targetOf(root: HTMLElement) {
  const sel = root.dataset.target;
  return (sel && document.querySelector<HTMLElement>(sel)) || root.closest<HTMLElement>('[data-palette]') || document.documentElement;
}

/** Light/dark switch (WAI-ARIA Switch) with a circular View Transition reveal and persisted choice. */
export function enhance(root: HTMLElement): Cleanup {
  const sync = () => root.setAttribute('aria-checked', String(targetOf(root).dataset.mode === 'dark'));
  sync();
  const obs = new MutationObserver(sync);
  obs.observe(targetOf(root), { attributes: true, attributeFilter: ['data-mode'] });
  const off = on(root, 'click', () => {
    const target = targetOf(root);
    const next: Mode = target.dataset.mode === 'dark' ? 'light' : 'dark';
    const apply = () => {
      target.dataset.mode = next;
      sync();
    };
    try { localStorage.setItem('lt-mode', next); } catch { /* storage unavailable */ }
    const doc = document as VTDocument;
    if (doc.startViewTransition && !reducedMotion() && target === document.documentElement) {
      const r = root.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const html = document.documentElement;
      html.style.setProperty('--lt-vt-x', `${x}px`);
      html.style.setProperty('--lt-vt-y', `${y}px`);
      html.style.setProperty('--lt-vt-r', `${Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))}px`);
      html.classList.add('lt-theme-transition');
      doc.startViewTransition(apply).finished.finally(() => html.classList.remove('lt-theme-transition'));
    } else apply();
    emit(root, { mode: next });
  });
  return () => { off(); obs.disconnect(); };
}
