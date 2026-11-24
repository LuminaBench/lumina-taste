import { combine, emit, on, part, type Cleanup } from '../../_shared/dom';

/**
 * Undo instead of "Are you sure?": the item disappears at once, a snackbar offers Undo for six
 * seconds (paused while hovered or focused), then the delete is committed.
 */
export function enhance(root: HTMLElement, ms = 6000): Cleanup {
  const bar = part(root, 'bar')!;
  const text = part(root, 'text')!;
  const undo = part<HTMLButtonElement>(root, 'undo')!;
  const timer = part(root, 'timer')!;
  let pending: { li: HTMLElement; name: string } | null = null;
  let t = 0, left = ms, started = 0;
  const commit = () => { if (!pending) return; emit(root, { deleted: pending.name }); pending.li.remove(); pending = null; bar.hidden = true; };
  const run = () => { started = Date.now(); t = window.setTimeout(commit, left); };
  const pause = () => { clearTimeout(t); left -= Date.now() - started; };
  return combine(
    on(root, 'click', (e) => {
      const b = (e.target as Element).closest<HTMLElement>('[data-part="delete"]');
      if (!b) return;
      commit();
      const li = b.closest('li') as HTMLElement;
      pending = { li, name: li.querySelector('span')?.textContent ?? 'Item' };
      li.setAttribute('data-gone', '');
      text.textContent = `Deleted “${pending.name}”.`;
      bar.hidden = false;
      timer.style.animation = 'none'; void timer.offsetWidth; timer.style.animation = '';
      root.style.setProperty('--undo-ms', `${ms}ms`);
      left = ms; clearTimeout(t); run();
    }),
    on(undo, 'click', () => {
      if (!pending) return;
      clearTimeout(t);
      pending.li.removeAttribute('data-gone');
      (pending.li.querySelector('button') as HTMLElement)?.focus();
      emit(root, { restored: pending.name });
      pending = null; bar.hidden = true;
    }),
    on(bar, 'pointerenter', pause), on(bar, 'pointerleave', () => pending && run()),
    on(bar, 'focusin', pause), on(bar, 'focusout', () => pending && run()),
    () => clearTimeout(t),
  );
}
