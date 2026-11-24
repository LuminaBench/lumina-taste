import { $$, combine, emit, on, part, type Cleanup } from '../../_shared/dom';

/** Setup checklist: round checkboxes, a progress ring and a live "2 of 5 done" count. */
export function enhance(root: HTMLElement): Cleanup {
  const steps = $$<HTMLElement>(root, '[data-part="step"]');
  const count = part(root, 'count');
  const sync = (fire = true) => {
    const done = steps.filter((s) => s.querySelector('[aria-checked="true"]')).length;
    steps.forEach((s) => s.toggleAttribute('data-done', s.querySelector('[aria-checked="true"]') !== null));
    root.style.setProperty('--p', String(Math.round((done / steps.length) * 100)));
    if (count) count.textContent = done === steps.length ? 'All done. Nice work.' : `${done} of ${steps.length} done`;
    if (fire) emit(root, { done, total: steps.length });
  };
  sync(false);
  return combine(on(root, 'click', (e) => {
    const t = (e.target as Element).closest<HTMLElement>('[data-part="tick"]');
    if (!t) return;
    t.setAttribute('aria-checked', String(t.getAttribute('aria-checked') !== 'true'));
    sync();
  }));
}
