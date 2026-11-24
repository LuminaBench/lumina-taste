import { combine, on, type Cleanup } from '../../_shared/dom';

const STRIP = Array.from({ length: 10 }, (_, i) => `<span>${i}</span>`).join('');

/** Rolling odometer. Each digit is a 0–9 strip that slides; separators stay put. Use setOdometer() to update. */
export function setOdometer(root: HTMLElement, value: number) {
  const text = Math.round(value).toLocaleString(root.dataset.locale ?? 'en-GB');
  const chars = [...text];
  // Rebuild only when the shape (digit count / separators) changes, so existing strips can roll.
  const shape = chars.map((c) => (/\d/.test(c) ? 'd' : c)).join('');
  if (root.dataset.shape !== shape) {
    root.innerHTML = chars.map((c) => (/\d/.test(c) ? `<span data-part="digit" aria-hidden="true"><span data-part="strip">${STRIP}</span></span>` : `<span data-part="sep" aria-hidden="true">${c}</span>`)).join('');
    root.dataset.shape = shape;
    root.getBoundingClientRect(); // commit start position before rolling
  }
  const strips = [...root.querySelectorAll<HTMLElement>('[data-part="strip"]')];
  chars.filter((c) => /\d/.test(c)).forEach((d, i) => strips[i].style.setProperty('--n', d));
  root.dataset.value = String(value);
  root.setAttribute('aria-label', text);
}

export function enhance(root: HTMLElement): Cleanup {
  const odo = root.matches('.lt-odometer') ? root : root.querySelector<HTMLElement>('.lt-odometer')!;
  const start = +(odo.dataset.value ?? 0);
  setOdometer(odo, 0);
  requestAnimationFrame(() => setOdometer(odo, start));
  const bump = root.closest('.lt-odo-demo')?.querySelector<HTMLElement>('[data-part="bump"]');
  return combine(bump ? on(bump, 'click', () => setOdometer(odo, +odo.dataset.value! + 37 + Math.floor(Math.random() * 400))) : () => {});
}
