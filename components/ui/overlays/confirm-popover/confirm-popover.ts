import { combine, dismissable, emit, focusFor, on, part, type Cleanup } from '../../_shared/dom';

/**
 * Inline confirm: a small popover next to the button that asks once, with Cancel focused first.
 * Lighter than a modal for row-level destructive actions.
 */
export function enhance(root: HTMLElement): Cleanup {
  const trigger = part<HTMLButtonElement>(root, 'trigger')!;
  const panel = part(root, 'panel')!;
  const result = part(root, 'result');
  let undismiss: Cleanup | null = null;
  const set = (open: boolean, e?: Event) => {
    panel.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
    undismiss?.(); undismiss = null;
    if (open) { undismiss = dismissable(part(root, 'anchor-wrap') ?? root, () => set(false)); focusFor(e, part<HTMLElement>(panel, 'cancel')); }
  };
  return combine(
    on(trigger, 'click', (e) => set(panel.hidden, e)),
    on(part(panel, 'cancel')!, 'click', () => { set(false); trigger.focus(); }),
    on(part(panel, 'confirm')!, 'click', () => { set(false); trigger.disabled = true; trigger.textContent = 'Revoked'; if (result) result.textContent = 'Key revoked. Create a new one in Settings.'; emit(root, { confirmed: true }); }),
    on(panel, 'keydown', (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); set(false); trigger.focus(); } }),
    () => undismiss?.(),
  );
}
