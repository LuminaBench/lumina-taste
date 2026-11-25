import { type Cleanup } from '../../_shared/dom';

// 4×4 Bayer matrix: the classic ordered dither.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/**
 * Pixel dither backdrop: an accent-coloured field that breaks into single pixels as it fades.
 * Put <div class="lt-dither" data-lt="backdrop-dither" aria-hidden="true"><canvas></canvas></div> first inside a
 * host with data-backdrop="dither". Options: data-cell (pixel size, 5), data-from (top | bottom | left | right),
 * data-reach (how far the field runs, 0.5 of the box), data-peak (density at the edge, 0.8; 1 is solid). Static: nothing moves, so there is nothing to pause.
 */
export function enhance(root: HTMLElement): Cleanup {
  const host = root.parentElement;
  const canvas = root.querySelector('canvas') ?? root.appendChild(document.createElement('canvas'));
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const draw = () => {
    const cell = Math.max(2, Number(root.dataset.cell ?? 5));
    const reach = Math.min(1, Math.max(0.2, Number(root.dataset.reach ?? 0.5)));
    const from = root.dataset.from ?? 'top';
    const peak = Math.min(1, Math.max(0.3, Number(root.dataset.peak ?? 0.8)));
    const w = Math.max(1, Math.ceil(root.clientWidth / cell)), h = Math.max(1, Math.ceil(root.clientHeight / cell));
    canvas.width = w; canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    // The pixels are the accent pulled halfway to the canvas, so the field reads as texture, not as a banner.
    root.style.color = 'var(--dither-color, color-mix(in oklab, var(--accent-solid) 46%, var(--bg-canvas)))';
    ctx.fillStyle = getComputedStyle(root).color;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const nx = x / w, ny = y / h;
      const along = from === 'bottom' ? 1 - ny : from === 'left' ? nx : from === 'right' ? 1 - nx : ny;
      const across = from === 'left' || from === 'right' ? ny : nx;
      // Full at the edge, gone by `reach`; a slow swell across the width keeps the boundary from being a ruler line.
      // Never quite solid, even at the edge: a filled band would read as a banner, not as texture.
      const v = Math.min(peak, 1 - along / reach + 0.1 * Math.cos((across - 0.5) * Math.PI * 2) - 0.04);
      if (v > (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16) ctx.fillRect(x, y, 1, 1);
    }
    host?.setAttribute('data-backdrop-ready', '');
  };
  draw();
  const ro = new ResizeObserver(draw);
  ro.observe(root);
  // Redraw when the theme changes, so the pixels take the new accent.
  const mo = new MutationObserver(draw);
  for (let e: HTMLElement | null = root; e; e = e.parentElement) mo.observe(e, { attributes: true, attributeFilter: ['data-palette', 'data-mode', 'data-style'] });
  return () => { ro.disconnect(); mo.disconnect(); host?.removeAttribute('data-backdrop-ready'); };
}
