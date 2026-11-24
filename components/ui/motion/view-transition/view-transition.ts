import { reducedMotion, type Cleanup } from '../../_shared/dom';
import { enhance as segmented } from '../../controls/segmented-control/segmented-control';

type VTDoc = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } };

/**
 * Run a DOM update inside a View Transition when supported (and motion is allowed); otherwise apply it instantly.
 * Give moving elements a unique `view-transition-name` and they morph between layouts.
 */
export function withViewTransition(update: () => void): Promise<void> {
  const doc = document as VTDoc;
  if (!doc.startViewTransition || reducedMotion()) { update(); return Promise.resolve(); }
  return doc.startViewTransition(update).finished;
}

export function enhance(root: HTMLElement): Cleanup {
  const seg = root.querySelector<HTMLElement>('[data-part="layout"]')!;
  const items = root.querySelector<HTMLElement>('[data-part="items"]')!;
  const off = segmented(seg);
  const onChange = (e: Event) => { e.stopPropagation(); const v = (e as CustomEvent).detail.value; withViewTransition(() => (items.dataset.layout = v)); };
  seg.addEventListener('lt-change', onChange);
  return () => { off(); seg.removeEventListener('lt-change', onChange); };
}
