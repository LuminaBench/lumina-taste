// Gallery core: theme state, web fonts, preview fitting and small helpers shared by every view.
import { PALETTES, TYPOGRAPHY } from '../engine/profiles/options.mjs';

export type Axis = 'palette' | 'mode' | 'type' | 'density' | 'radius' | 'motion' | 'style';
export const AXES: Axis[] = ['palette', 'mode', 'type', 'density', 'radius', 'motion', 'style'];
export const html = document.documentElement;

export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
export const announce = (msg: string) => {
  const a = document.querySelector<HTMLElement>('.g-announcer')!;
  a.textContent = '';
  requestAnimationFrame(() => (a.textContent = msg));
};

// ------------------------------------------------------------------ theme state
const listeners = new Set<() => void>();
export const onTheme = (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn); };
export const theme = () => Object.fromEntries(AXES.map((k) => [k, html.dataset[k]!])) as Record<Axis, string>;

export function setTheme(patch: Partial<Record<Axis, string>>) {
  for (const [k, v] of Object.entries(patch)) if (v) html.dataset[k] = v;
  try { localStorage.setItem('lt-gallery', JSON.stringify(theme())); } catch { /* private mode */ }
  ensureFont(html.dataset.type!);
  syncRoots();
  listeners.forEach((f) => f());
}

/** Preview boxes are their own theme roots so a demo can flip its own mode without touching the page. */
export function syncRoots(scope: ParentNode = document) {
  const t = theme();
  scope.querySelectorAll<HTMLElement>('[data-theme-root]').forEach((el) => {
    for (const k of AXES) if (!(el.dataset.lock ?? '').split(' ').includes(k)) el.dataset[k] = t[k];
  });
  document.querySelectorAll<HTMLIFrameElement>('iframe[data-blueprint]').forEach((f) => {
    const d = f.contentDocument?.documentElement;
    if (d) for (const k of AXES) d.dataset[k] = t[k];
  });
}
export const themeAttrs = () => AXES.map((k) => `data-${k}="${esc(theme()[k])}"`).join(' ');

// ------------------------------------------------------------------ web fonts (loaded on demand, nothing stored in the repo)
const loaded = new Set<string>();
export function ensureFont(typeId: string) {
  const t = TYPOGRAPHY.find((x) => x.id === typeId);
  if (!t?.webfont || loaded.has(t.webfont)) return;
  loaded.add(t.webfont);
  const l = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: t.webfont });
  document.head.append(l);
}
export const paletteName = (id: string) => PALETTES.find((p) => p.id === id)?.name ?? id;

// ------------------------------------------------------------------ preview fitting
/**
 * Scale a demo down (never up) so everything it draws (including open menus and popovers that hang
 * outside its own box) fits the preview, and centre that drawing. Uses a transform, so hit-testing,
 * focus rings and anchored overlays stay correct.
 */
// Every preview due in a frame is fitted together: all resets, then all measurements, then all writes. Fitting
// them one by one alternated writes and reads, a full layout per preview; with 211 on the index Safari spent
// ten seconds doing that before it answered a click.
type FitJob = { reset: () => void; measure: () => Partial<CSSStyleDeclaration>; apply: (v: Partial<CSSStyleDeclaration>) => void };
const fitQueue = new Set<FitJob>();
let fitFrame = 0;
function scheduleFit(job: FitJob) {
  fitQueue.add(job);
  fitFrame ||= requestAnimationFrame(() => {
    fitFrame = 0;
    const jobs = [...fitQueue]; fitQueue.clear();
    jobs.forEach((j) => j.reset());
    const values = jobs.map((j) => j.measure());
    jobs.forEach((j, i) => j.apply(values[i]));
  });
}

export function fit(box: HTMLElement, inner: HTMLElement, pad = 24) {
  const base = inner.getAttribute('style') ?? '';
  // The control the visitor just pressed, and where it was in the box at that moment.
  let held: { el: Element; x: number; y: number } | null = null;
  const reset = () => { inner.setAttribute('style', base); inner.style.transform = 'none'; };
  // Reads only: what to write once every preview due this frame has been measured.
  const measure = (): Partial<CSSStyleDeclaration> => {
    // An open dialog lays itself out against the box. Turn the inner wrapper into a virtual screen
    // (at least 600px wide) scaled to the box, so the dialog has real room in small cards too.
    if (inner.querySelector('[data-contained-open]')) {
      const b = box.getBoundingClientRect();
      const s = Math.min(1, b.width / Math.max(600, parseFloat(inner.style.width) || 0), b.height / 380);
      return { position: 'absolute', left: '0', top: '0', width: `${b.width / s}px`, height: `${b.height / s}px`, maxWidth: 'none', transformOrigin: '0 0', transform: `scale(${s.toFixed(3)})` };
    }
    const b = box.getBoundingClientRect();
    const r = inner.getBoundingClientRect();
    let L = r.left, T = r.top, R = r.right, B = r.bottom;
    for (const el of inner.children) {
      const q = el.getBoundingClientRect();
      if (q.width < 1 || q.height < 1) continue;
      L = Math.min(L, q.left); T = Math.min(T, q.top); R = Math.max(R, q.right); B = Math.max(B, q.bottom);
    }
    for (const el of inner.querySelectorAll<HTMLElement>('*')) {
      const q = el.getBoundingClientRect();
      if (q.width < 1 || q.height < 1) continue;
      const cs = getComputedStyle(el);
      if (cs.position !== 'absolute' && cs.position !== 'fixed') continue;
      if (cs.visibility === 'hidden') continue;
      // A part inside a scroller (a rail, a list) only counts as far as the scroller shows it.
      let qL = q.left, qT = q.top, qR = q.right, qB = q.bottom;
      for (let p = el.parentElement; p && p !== inner; p = p.parentElement) {
        const pc = getComputedStyle(p);
        if (pc.overflowX !== 'visible' || pc.overflowY !== 'visible') { const c = p.getBoundingClientRect(); qL = Math.max(qL, c.left); qT = Math.max(qT, c.top); qR = Math.min(qR, c.right); qB = Math.min(qB, c.bottom); }
      }
      if (qR - qL < 1 || qB - qT < 1) continue;
      L = Math.min(L, qL); T = Math.min(T, qT); R = Math.max(R, qR); B = Math.max(B, qB);
    }
    const w = R - L, h = B - T;
    const s = Math.max(0.3, Math.min(1, (b.width - pad * 2) / Math.max(1, w), (b.height - pad * 2) / Math.max(1, h)));
    // Move the drawing's centre to the box centre, scaling around the drawing's centre.
    const cx = (L + R) / 2, cy = (T + B) / 2;
    let tx = b.left + b.width / 2 - cx, ty = b.top + b.height / 2 - cy;
    // The control just used stays where it was (a disclosure opens beneath it, a list closing above it does not
    // pull it up): the drawing moves only as far as it must to stay inside the box.
    if (held && held.el.isConnected) {
      const q = held.el.getBoundingClientRect();
      if (q.width > 0 && q.height > 0) {
        // Scaled around (cx, cy): a point p lands at cx + (p - cx) * s + tx. Put the held control's corner back where
        // it was, then keep the whole drawing inside the box (it already fits at this scale).
        const fx = b.left + held.x - cx - (q.left - cx) * s, fy = b.top + held.y - cy - (q.top - cy) * s;
        const minX = b.left + pad - (cx + (L - cx) * s), maxX = b.right - pad - (cx + (R - cx) * s);
        const minY = b.top + pad - (cy + (T - cy) * s), maxY = b.bottom - pad - (cy + (B - cy) * s);
        tx = minX <= maxX ? Math.min(Math.max(fx, minX), maxX) : tx;
        ty = minY <= maxY ? Math.min(Math.max(fy, minY), maxY) : ty;
      }
    }
    return { transformOrigin: `${cx - r.left}px ${cy - r.top}px`, transform: `translate(${Math.round(tx)}px, ${Math.round(ty)}px) scale(${s.toFixed(3)})` };
  };
  const job: FitJob = { reset, measure, apply: (v) => Object.assign(inner.style, v) };
  const run = () => { reset(); job.apply(measure()); };
  const later = () => scheduleFit(job);
  later();
  const timers = [150, 700].map((ms) => setTimeout(later, ms));
  const ro = new ResizeObserver(later);
  ro.observe(box);
  const hold = (el: Element | null) => {
    if (!el) { held = null; return; }
    const q = el.getBoundingClientRect(), b = box.getBoundingClientRect();
    held = { el, x: q.left - b.left, y: q.top - b.top };
  };
  return Object.assign(() => { ro.disconnect(); timers.forEach(clearTimeout); fitQueue.delete(job); }, { refit: run, hold });
}

// ------------------------------------------------------------------ copy to clipboard (no downloads anywhere in the gallery)
export async function copyText(text: string, btn?: HTMLElement) {
  try { await navigator.clipboard.writeText(text); } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.append(ta); ta.select(); document.execCommand?.('copy'); ta.remove();
  }
  if (btn) {
    const label = btn.querySelector('span') ?? btn;
    const before = label.textContent;
    btn.setAttribute('data-copied', '');
    label.textContent = 'Copied';
    setTimeout(() => { btn.removeAttribute('data-copied'); label.textContent = before; }, 1400);
  }
  announce('Copied to clipboard');
}

export const ICON = {
  copy: '<svg class="lt-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/></svg>',
  arrow: '<svg class="lt-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  back: '<svg class="lt-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>',
  sun: '<svg class="lt-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></svg>',
  moon: '<svg class="lt-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/></svg>',
  pins: '<svg class="lt-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 8v4l2.5 2.5"/></svg>',
  reset: '<svg class="lt-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.6L20 8.5M20 4v4.5h-4.5"/></svg>',
  shuffle: '<svg class="lt-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h3.5c2 0 3.2 1 4.2 2.6l.6 1M4 17h3.5c2 0 3.2-1 4.2-2.6l2.6-4.8c1-1.6 2.2-2.6 4.2-2.6H20M17 4l3 3-3 3M17 14l3 3-3 3M14.6 14.6c.9 1.6 2.1 2.4 3.9 2.4H20"/></svg>',
  external: '<svg class="lt-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/></svg>',
};
