import { combine, emit, on, type Cleanup } from '../../_shared/dom';

/**
 * Hold to confirm: the action fires only after the button is held for data-ms (1100). Works with a pointer
 * and with Space or Enter held down; letting go early cancels. For destructive actions that are too
 * frequent for a dialog. Emits lt-change { confirmed: true } once. data-done-label sets the final label.
 */
export function enhance(root: HTMLElement): Cleanup {
  const btn = root.querySelector<HTMLButtonElement>('button');
  if (!btn) return () => {};
  const label = root.querySelector<HTMLElement>('[data-part="label"]');
  const msg = root.querySelector<HTMLElement>('[data-part="msg"]');
  const ms = Number(root.dataset.ms ?? 1100);
  root.style.setProperty('--hold-ms', `${ms}ms`);
  let t = 0;
  const start = () => {
    if (root.hasAttribute('data-done') || root.hasAttribute('data-holding')) return;
    root.setAttribute('data-holding', '');
    t = window.setTimeout(() => {
      root.removeAttribute('data-holding'); root.setAttribute('data-done', '');
      btn.setAttribute('aria-disabled', 'true');
      const done = root.dataset.doneLabel ?? 'Deleted';
      if (label) label.textContent = done;
      if (msg) msg.textContent = `${done}.`;
      emit(root, { confirmed: true });
    }, ms);
  };
  const cancel = () => { clearTimeout(t); root.removeAttribute('data-holding'); };
  const key = (e: KeyboardEvent) => (e.key === ' ' || e.key === 'Enter');
  return combine(
    on(btn, 'pointerdown', (e) => { if (e.button === 0) start(); }),
    on(btn, 'pointerup', cancel), on(btn, 'pointerleave', cancel), on(btn, 'pointercancel', cancel), on(btn, 'blur', cancel),
    on(btn, 'keydown', (e) => { if (key(e)) { e.preventDefault(); if (!e.repeat) start(); } }),
    on(btn, 'keyup', (e) => { if (key(e)) cancel(); }),
    on(btn, 'contextmenu', (e) => e.preventDefault()),
    () => clearTimeout(t),
  );
}
