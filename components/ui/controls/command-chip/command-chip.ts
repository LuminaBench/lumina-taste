import { on, type Cleanup } from '../../_shared/dom';

const ICON = (d: string) => `<svg class="lt-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const COPY = ICON('<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5v-2a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/>');
const DONE = ICON('<path d="m5 12.5 4.5 4.5L19 7.5"/>');

/** Command chip: the button copies the command (without the $ prompt) and confirms with a tick and a status message. */
export function enhance(root: HTMLElement): Cleanup {
  const btn = root.querySelector<HTMLButtonElement>('[data-part="copy"]');
  const msg = root.querySelector<HTMLElement>('[data-part="msg"]');
  if (!btn) return () => {};
  let t = 0;
  const off = on(btn, 'click', () => {
    void navigator.clipboard?.writeText(root.querySelector('code')?.textContent?.trim() ?? '').catch(() => {});
    btn.setAttribute('data-done', ''); btn.innerHTML = DONE;
    if (msg) msg.textContent = 'Command copied.';
    clearTimeout(t);
    t = window.setTimeout(() => { btn.removeAttribute('data-done'); btn.innerHTML = COPY; if (msg) msg.textContent = ''; }, 1800);
  });
  return () => { off(); clearTimeout(t); };
}
