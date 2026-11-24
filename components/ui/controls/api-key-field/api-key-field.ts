import { combine, emit, on, part, type Cleanup } from '../../_shared/dom';

/** API key: masked by default, reveal toggles, copy copies the full key, Roll asks once, then rotates. */
export function enhance(root: HTMLElement): Cleanup {
  const key = part(root, 'key')!;
  const reveal = part<HTMLButtonElement>(root, 'reveal')!;
  const copy = part<HTMLButtonElement>(root, 'copy')!;
  const roll = part<HTMLButtonElement>(root, 'roll')!;
  const msg = part(root, 'msg')!;
  let armed = false, t = 0;
  return combine(
    on(reveal, 'click', () => {
      const show = reveal.getAttribute('aria-pressed') !== 'true';
      reveal.setAttribute('aria-pressed', String(show)); reveal.setAttribute('aria-label', show ? 'Hide key' : 'Show key');
      key.textContent = show ? key.dataset.full! : key.dataset.masked!;
    }),
    on(copy, 'click', async () => {
      try { await navigator.clipboard.writeText(key.dataset.full!); } catch { /* clipboard blocked: message still explains */ }
      copy.setAttribute('data-done', ''); msg.textContent = 'Copied. Keep it out of client-side code.';
      clearTimeout(t); t = window.setTimeout(() => { copy.removeAttribute('data-done'); msg.textContent = ''; }, 2200);
    }),
    on(roll, 'click', () => {
      if (!armed) { armed = true; roll.textContent = 'Click again to roll'; roll.dataset.tone = 'danger'; roll.dataset.variant = 'primary'; msg.textContent = 'The old key stops working in 24 hours.'; return; }
      armed = false; roll.textContent = 'Roll key…'; roll.dataset.variant = 'secondary'; delete roll.dataset.tone;
      const tail = Math.random().toString(36).slice(2, 6);
      key.dataset.full = `hy_live_${Math.random().toString(36).slice(2, 14)}${tail}`; key.dataset.masked = `hy_live_••••••••••••••••${tail}`;
      key.textContent = reveal.getAttribute('aria-pressed') === 'true' ? key.dataset.full : key.dataset.masked;
      msg.textContent = 'New key created. The old one stops working in 24 hours.';
      emit(root, { rolled: true });
    }),
    () => clearTimeout(t),
  );
}
