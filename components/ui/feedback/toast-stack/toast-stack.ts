import { combine, on, type Cleanup } from '../../_shared/dom';

type Tone = 'positive' | 'negative' | 'info' | 'warning';
const ICON: Record<Tone, string> = {
  positive: '<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.3 2.4 2.4 4.6-4.9"/>',
  negative: '<circle cx="12" cy="12" r="8.5"/><path d="m9.2 9.2 5.6 5.6M14.8 9.2l-5.6 5.6"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
  warning: '<path d="M10.3 4.3 2.9 17.2A2 2 0 0 0 4.6 20h14.8a2 2 0 0 0 1.7-2.8L13.7 4.3a2 2 0 0 0-3.4 0Z"/><path d="M12 9.5v4M12 17h.01"/>',
};
const svg = (inner: string, s = 18) => `<svg class="lt-icon" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

/**
 * Show a toast in a .lt-toasts region. Stacks (newest in front), expands on hover/focus,
 * pauses its timer while hovered or focused, swipes sideways to dismiss, Esc dismisses the newest.
 */
export function toast(region: HTMLElement, { title, body = '', tone = 'info', duration = 5000 }: { title: string; body?: string; tone?: Tone; duration?: number }) {
  const li = document.createElement('li');
  li.dataset.part = 'toast';
  li.dataset.tone = tone;
  li.setAttribute('role', tone === 'negative' ? 'alert' : 'status');
  li.innerHTML = `<span data-part="icon">${svg(ICON[tone])}</span><strong></strong><p></p><button type="button" aria-label="Dismiss notification">${svg('<path d="M6 6l12 12M18 6 6 18"/>', 14)}</button>`;
  li.querySelector('strong')!.textContent = title;
  li.querySelector('p')!.textContent = body;
  region.prepend(li);
  layout(region);
  let remaining = duration;
  let started = Date.now();
  let timer = window.setTimeout(() => dismiss(li), remaining);
  const pause = () => { clearTimeout(timer); remaining -= Date.now() - started; };
  const resume = () => { started = Date.now(); clearTimeout(timer); timer = window.setTimeout(() => dismiss(li), Math.max(1200, remaining)); };
  region.addEventListener('pointerenter', pause);
  region.addEventListener('pointerleave', resume);
  li.addEventListener('focusin', pause);
  li.addEventListener('focusout', resume);
  li.querySelector('button')!.addEventListener('click', () => dismiss(li));
  // Swipe to dismiss.
  let x0 = 0;
  li.addEventListener('pointerdown', (e) => { if ((e.target as Element).closest('button')) return; x0 = e.clientX; li.setPointerCapture(e.pointerId); li.setAttribute('data-dragging', ''); });
  li.addEventListener('pointermove', (e) => { if (li.hasAttribute('data-dragging')) li.style.setProperty('--dx', `${Math.max(0, e.clientX - x0)}px`); });
  li.addEventListener('pointerup', (e) => {
    li.removeAttribute('data-dragging');
    if (e.clientX - x0 > 80) dismiss(li); else li.style.removeProperty('--dx');
  });
  return li;
}

function dismiss(li: HTMLElement) {
  if (li.hasAttribute('data-leaving')) return;
  const region = li.parentElement as HTMLElement;
  li.setAttribute('data-leaving', '');
  setTimeout(() => { li.remove(); if (region) layout(region); }, 180);
}

function layout(region: HTMLElement) {
  const items = [...region.querySelectorAll<HTMLElement>('[data-part="toast"]:not([data-leaving])')];
  let y = 0;
  items.forEach((t, i) => {
    t.style.setProperty('--i', String(Math.min(i, 3)));
    t.dataset.i = String(Math.min(i, 3));
    t.style.setProperty('--y', `${y}px`);
    t.style.zIndex = String(10 - i);
    y += t.offsetHeight + 8;
  });
}

export function enhance(root: HTMLElement): Cleanup {
  const region = root.querySelector<HTMLElement>('[data-part="region"]') ?? root;
  return combine(
    on(root, 'click', (e: MouseEvent) => {
      const b = (e.target as Element).closest<HTMLElement>('[data-toast]');
      if (b) toast(region, { title: b.dataset.title!, body: b.dataset.body, tone: b.dataset.toast as Tone });
    }),
    on(document, 'keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') { const first = region.querySelector<HTMLElement>('[data-part="toast"]:not([data-leaving])'); if (first) dismiss(first); }
    }),
  );
}
