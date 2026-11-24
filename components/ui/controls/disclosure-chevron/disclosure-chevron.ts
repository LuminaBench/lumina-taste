import { emit, on, part, type Cleanup } from '../../_shared/dom';

/** Rotating-chevron disclosure (WAI-ARIA Disclosure pattern). */
export function enhance(root: HTMLElement): Cleanup {
  const trigger = part<HTMLButtonElement>(root, 'trigger')!;
  const panel = part(root, 'panel')!;
  const set = (open: boolean) => {
    trigger.setAttribute('aria-expanded', String(open));
    panel.dataset.state = open ? 'open' : 'closed';
    emit(root, { open });
  };
  return on(trigger, 'click', () => set(trigger.getAttribute('aria-expanded') !== 'true'));
}
