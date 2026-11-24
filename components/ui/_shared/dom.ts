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

/**
 * Input modality on <html data-modality="pointer|keyboard">. Components move focus with script
 * (opening a dialog focuses its first button, closing a menu returns focus to its trigger). Browsers
 * may show a ring for script focus even after a mouse click; base.css hides non-text rings while the
 * last input was a pointer, so rings mean "keyboard user here" and nothing else.
 */
export function trackModality(doc: Document = document) {
  const html = doc.documentElement;
  if (html.dataset.modality) return;
  html.dataset.modality = 'pointer';
  const set = (m: 'pointer' | 'keyboard') => () => { if (html.dataset.modality !== m) html.dataset.modality = m; };
  doc.addEventListener('pointerdown', set('pointer'), true);
  doc.addEventListener('keydown', (e) => { if (!e.metaKey && !e.ctrlKey && e.key !== 'Meta' && e.key !== 'Control') set('keyboard')(); }, true);
}
if (typeof document !== 'undefined') trackModality();

/**
 * Focus an element in response to a pointer action without showing the keyboard ring.
 * Browsers treat script focus after preventDefault() on pointerdown as keyboard-like; this marks
 * the element so its ring stays hidden until the next key press.
 */
export function focusQuietly(el: HTMLElement) {
  el.setAttribute('data-quiet-focus', '');
  el.focus({ preventScroll: true });
  const clear = () => { el.removeAttribute('data-quiet-focus'); el.removeEventListener('keydown', clear); el.removeEventListener('blur', clear); };
  el.addEventListener('keydown', clear);
  el.addEventListener('blur', clear);
}

/**
 * Bring an item into view inside its own scrolling list only. Unlike scrollIntoView(), this never
 * scrolls the page, so a highlighted option in a menu cannot yank the reader somewhere else.
 */
export function revealInList(el: HTMLElement) {
  let box = el.parentElement;
  while (box && box !== document.body) {
    const o = getComputedStyle(box).overflowY;
    if ((o === 'auto' || o === 'scroll') && box.scrollHeight > box.clientHeight) break;
    box = box.parentElement;
  }
  if (!box || box === document.body) return;
  const r = el.getBoundingClientRect(), b = box.getBoundingClientRect();
  if (r.top < b.top) box.scrollTop -= b.top - r.top + 4;
  else if (r.bottom > b.bottom) box.scrollTop += r.bottom - b.bottom + 4;
}

/** Move focus as a result of `e`: quietly when a pointer caused it, with a ring when a key did. */
export function focusFor(e: Event | null | undefined, el: HTMLElement | null | undefined) {
  if (!el) return;
  const pointer = e instanceof MouseEvent && e.detail > 0;
  if (pointer) focusQuietly(el); else el.focus({ preventScroll: true });
}

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

/**
 * Contained mode. Inside an element with [data-contained] (a preview box, an embedded widget),
 * overlays open inside that box instead of taking over the page: dialogs open non-modally and are
 * positioned in the box, focus is trapped, Esc and outside clicks close them.
 */
export const containerOf = (el: Element) => el.closest<HTMLElement>('[data-contained]');

export function openDialog(dialog: HTMLDialogElement): Cleanup {
  const box = containerOf(dialog);
  if (!box) { dialog.showModal(); return () => {}; }
  dialog.show();
  dialog.setAttribute('data-contained-open', '');
  const first = dialog.querySelector<HTMLElement>('[autofocus]') ?? focusables(dialog)[0];
  first?.focus();
  const offs = [
    trapFocus(dialog),
    on(dialog, 'keydown', (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); dialog.close('cancel'); } }),
    on(box, 'pointerdown', (e: PointerEvent) => { if (!dialog.contains(e.target as Node)) dialog.close('cancel'); }),
  ];
  const done = () => { dialog.removeAttribute('data-contained-open'); offs.forEach((f) => f()); dialog.removeEventListener('close', done); };
  dialog.addEventListener('close', done);
  return done;
}

/** Offset of the containing block that position: fixed children resolve against (viewport or a contained box). */
export function fixedOrigin(el: HTMLElement) {
  const prev = { l: el.style.left, t: el.style.top, p: el.style.position };
  el.style.position = 'fixed'; el.style.left = '0px'; el.style.top = '0px';
  const r = el.getBoundingClientRect();
  Object.assign(el.style, { left: prev.l, top: prev.t, position: prev.p });
  return { x: r.left, y: r.top };
}
