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
  const cleanups: Cleanup[] = root === document ? [keepFloor()] : [];
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

/**
 * A button whose words change ("Customise" → "Save choices") is as wide as its longest wording from the start, so
 * pressing it never nudges what sits beside it. Measured once it is on screen, and again when web fonts arrive.
 * The visible words and the accessible name stay exactly as they are. Plain-text buttons only.
 */
export function reserveWidth(btn: HTMLElement, labels: string[], label: HTMLElement = btn): Cleanup {
  let done = false;
  const measure = () => {
    if (!btn.isConnected || btn.getBoundingClientRect().width < 1) return;
    const now = label.textContent;
    btn.style.minWidth = '';
    let max = 0;
    for (const l of labels) { label.textContent = l; max = Math.max(max, btn.getBoundingClientRect().width); }
    label.textContent = now;
    btn.style.minWidth = `${Math.ceil(max)}px`;
    done = true;
  };
  const ro = new ResizeObserver(() => { if (!done) measure(); });
  ro.observe(btn);
  document.fonts?.ready.then(() => { done = false; measure(); });
  measure();
  return () => { ro.disconnect(); btn.style.minWidth = ''; };
}

/**
 * Keep `el` where it is on screen while the layout around it settles (an item above it closing, a panel growing):
 * the page, or the nearest scrolling box, scrolls by however far it would have moved, frame by frame for `ms`.
 */
export function holdInView(el: HTMLElement, ms = 450): void {
  const top0 = el.getBoundingClientRect().top;
  let box: Element | null = el.parentElement;
  while (box && box !== document.body) { const o = getComputedStyle(box).overflowY; if ((o === 'auto' || o === 'scroll') && box.scrollHeight > box.clientHeight) break; box = box.parentElement; }
  const scroller: { scrollBy: (o: ScrollToOptions) => void } = box && box !== document.body ? box : window;
  const end = performance.now() + ms;
  const tick = () => {
    if (!el.isConnected) return;
    const d = el.getBoundingClientRect().top - top0;
    if (Math.abs(d) >= 1) scroller.scrollBy({ top: d, behavior: 'instant' as ScrollBehavior });
    if (performance.now() < end) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/**
 * Near the end of a page, closing something (an answer, a panel, a filtered list) makes the page shorter, the browser
 * pulls the page down to fit and the button just pressed slides away under the pointer. keepFloor() keeps the page
 * where it was instead: it adds the missing height as blank space after the last section, then gives that space
 * back as the reader scrolls up, out of sight. autoEnhance(document) turns it on; it returns its own cleanup.
 */
export function keepFloor(): Cleanup {
  let spacer: HTMLElement | null = null, size = 0, base = 0;
  const doc = document.documentElement;
  const set = (n: number) => {
    size = Math.max(0, Math.round(n));
    if (!size) { spacer?.remove(); spacer = null; return; }
    if (!spacer) { spacer = document.createElement('div'); spacer.setAttribute('aria-hidden', 'true'); spacer.dataset.ltFloor = ''; spacer.style.cssText = 'display:block;width:1px;pointer-events:none;visibility:hidden;margin:0;padding:0;'; }
    if (!spacer.isConnected) document.body.append(spacer);
    spacer.style.height = `${size}px`;
  };
  const onScroll = () => { if (!spacer) return; if (scrollY < base) set(size - (base - scrollY)); base = scrollY; };
  const press = (e: Event) => {
    const t = (e.target as Element | null)?.closest?.('summary, [aria-expanded], [aria-controls], [role="tab"], [role="radio"], button');
    if (!t || t.closest('dialog, [popover], [data-contained]')) return;
    const y0 = scrollY, end = performance.now() + 600;
    const tick = () => {
      const max = doc.scrollHeight - innerHeight;
      if (scrollY < y0 - 0.5 && max <= scrollY + 1) { set(size + (y0 - scrollY)); window.scrollTo({ top: y0, behavior: 'instant' as ScrollBehavior }); base = scrollY; }
      if (performance.now() < end) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') press(e); };
  document.addEventListener('pointerdown', press, true);
  document.addEventListener('keydown', onKey, true);
  addEventListener('scroll', onScroll, { passive: true });
  return () => { document.removeEventListener('pointerdown', press, true); document.removeEventListener('keydown', onKey, true); removeEventListener('scroll', onScroll); set(0); };
}
