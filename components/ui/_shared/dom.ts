// Tiny DOM helpers shared by every vanilla enhancer. No dependencies.
export type Cleanup = () => void;
export type Enhancer = (root: HTMLElement) => Cleanup;

export const $ = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => root.querySelector<T>(sel);
export const $$ = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => [...root.querySelectorAll<T>(sel)];
export const part = <T extends Element = HTMLElement>(root: ParentNode, name: string) => root.querySelector<T>(`[data-part="${name}"]`);
export const parts = <T extends Element = HTMLElement>(root: ParentNode, name: string) => [...root.querySelectorAll<T>(`[data-part="${name}"]`)];

/** addEventListener that returns its own remover. */
export function on<K extends keyof HTMLElementEventMap>(
  el: EventTarget,
  type: K | (string & {}),
  fn: (e: HTMLElementEventMap[K]) => void,
  opts?: AddEventListenerOptions,
): Cleanup {
  el.addEventListener(type, fn as EventListener, opts);
  return () => el.removeEventListener(type, fn as EventListener, opts);
}

export function combine(...fns: Cleanup[]): Cleanup {
  return () => fns.forEach((f) => f());
}

/** Fire the kit-wide change event. React wrappers listen for it. */
export function emit<T>(root: HTMLElement, detail: T, type = 'lt-change') {
  root.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
}

let n = 0;
export const uid = (prefix = 'lt') => `${prefix}-${(++n).toString(36)}`;

export const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Roving tabindex across a list of items with arrow keys, Home and End. */
export function roving(
  container: HTMLElement,
  items: () => HTMLElement[],
  { orientation = 'both', loop = true, onMove }: { orientation?: 'horizontal' | 'vertical' | 'both'; loop?: boolean; onMove?: (el: HTMLElement) => void } = {},
): Cleanup {
  const keys = {
    horizontal: { next: ['ArrowRight'], prev: ['ArrowLeft'] },
    vertical: { next: ['ArrowDown'], prev: ['ArrowUp'] },
    both: { next: ['ArrowRight', 'ArrowDown'], prev: ['ArrowLeft', 'ArrowUp'] },
  }[orientation];
  return on(container, 'keydown', (e: KeyboardEvent) => {
    const list = items().filter((i) => !i.hasAttribute('disabled') && i.getAttribute('aria-disabled') !== 'true');
    const idx = list.indexOf(document.activeElement as HTMLElement);
    if (idx < 0) return;
    let next = -1;
    if (keys.next.includes(e.key)) next = loop ? (idx + 1) % list.length : Math.min(idx + 1, list.length - 1);
    else if (keys.prev.includes(e.key)) next = loop ? (idx - 1 + list.length) % list.length : Math.max(idx - 1, 0);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = list.length - 1;
    if (next < 0) return;
    e.preventDefault();
    list.forEach((el, i) => (el.tabIndex = i === next ? 0 : -1));
    list[next].focus();
    onMove?.(list[next]);
  });
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
export const focusables = (root: ParentNode) =>
  $$<HTMLElement>(root, FOCUSABLE).filter((el) => el.offsetParent !== null || el === document.activeElement);

/** Keep Tab inside `root` (for non-<dialog> overlays such as drawers rendered inline). */
export function trapFocus(root: HTMLElement): Cleanup {
  return on(root, 'keydown', (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const f = focusables(root);
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}

/** Close on outside pointerdown and Escape. */
export function dismissable(el: HTMLElement, close: () => void, ignore: Element[] = []): Cleanup {
  return combine(
    on(document, 'pointerdown', (e: PointerEvent) => {
      const t = e.target as Node;
      if (!el.contains(t) && !ignore.some((i) => i.contains(t))) close();
    }),
    on(document, 'keydown', (e: KeyboardEvent) => { if (e.key === 'Escape') close(); }),
  );
}

/** Enhance every [data-lt="name"] under root with the matching enhancer. */
export function autoEnhance(root: ParentNode, registry: Record<string, Enhancer>): Cleanup {
  const cleanups: Cleanup[] = [];
  for (const el of $$<HTMLElement>(root, '[data-lt]')) {
    const fn = registry[el.dataset.lt!];
    if (fn && !el.dataset.ltReady) { el.dataset.ltReady = ''; cleanups.push(fn(el)); }
  }
  return combine(...cleanups);
}
