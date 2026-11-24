// Anchor placement. Uses CSS Anchor Positioning when the browser supports it (styles live in each
// component's CSS); otherwise falls back to measuring and placing the floating element in JS.
export type Side = 'top' | 'bottom' | 'left' | 'right';

export const supportsAnchor = () => typeof CSS !== 'undefined' && CSS.supports?.('anchor-name: --a') === true;

let anchorSeq = 0;
/** Link a floating element to its anchor through unique anchor names (CSS path). */
export function linkAnchor(anchor: HTMLElement, floating: HTMLElement) {
  const name = anchor.style.getPropertyValue('anchor-name') || `--lt-a${++anchorSeq}`;
  anchor.style.setProperty('anchor-name', name);
  floating.style.setProperty('position-anchor', name);
}

/** JS fallback: place a fixed/top-layer element next to an anchor rect, flipping to stay on screen. */
export function place(floating: HTMLElement, anchor: DOMRect | HTMLElement, side: Side = 'top', gap = 8) {
  if (supportsAnchor() && anchor instanceof HTMLElement) return;
  const a = anchor instanceof HTMLElement ? anchor.getBoundingClientRect() : anchor;
  const f = floating.getBoundingClientRect();
  const vw = innerWidth, vh = innerHeight, m = 8;
  let s = side;
  if (s === 'top' && a.top - f.height - gap < m) s = 'bottom';
  else if (s === 'bottom' && a.bottom + f.height + gap > vh - m) s = 'top';
  let x = s === 'left' ? a.left - f.width - gap : s === 'right' ? a.right + gap : a.left + a.width / 2 - f.width / 2;
  let y = s === 'top' ? a.top - f.height - gap : s === 'bottom' ? a.bottom + gap : a.top + a.height / 2 - f.height / 2;
  x = Math.min(Math.max(m, x), vw - f.width - m);
  y = Math.min(Math.max(m, y), vh - f.height - m);
  Object.assign(floating.style, { position: 'fixed', inset: 'auto', margin: '0', left: `${x}px`, top: `${y}px` });
  floating.dataset.side = s;
}
