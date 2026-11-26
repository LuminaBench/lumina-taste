import { combine, dismissable, emit, on, part, type Cleanup } from '../../_shared/dom';

/** Simple navbar: links inline on wide screens, a menu button with a panel on narrow ones. */
export function enhance(root: HTMLElement): Cleanup {
  const toggle = part<HTMLButtonElement>(root, 'toggle')!;
  const panel = part(root, 'panel')!;
  let undismiss: Cleanup | null = null;
  const set = (open: boolean) => {
    panel.hidden = !open; toggle.setAttribute('aria-expanded', String(open)); toggle.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
    undismiss?.(); undismiss = open ? dismissable(root, () => set(false)) : null;
    emit(root, { open });
  };
  return combine(on(toggle, 'click', () => set(panel.hidden !== false)), on(panel, 'click', (e) => { if ((e.target as Element).closest('a')) set(false); }), () => undismiss?.());
}
