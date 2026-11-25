import { combine, on, type Cleanup } from '../../_shared/dom';

const NS = 'http://www.w3.org/2000/svg';
const ICON = {
  pause: '<svg class="lt-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M9 5v14M15 5v14"/></svg>',
  play: '<svg class="lt-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 5.5v13l10-6.5Z"/></svg>',
};

/**
 * Circuit traces: a few accent lines that run along the page grid, with a small pulse travelling each one.
 * They route around the host's text and frames, so nothing crosses the headline. The same seed and the same
 * layout draw the same traces every time.
 * Options: data-cell (grid pitch, 56: match --backdrop-size), data-seed (7), data-traces (6).
 * Motion stops under prefers-reduced-motion, and the pause button satisfies WCAG 2.2.2.
 */
export function enhance(root: HTMLElement): Cleanup {
  const btn = root.querySelector<HTMLButtonElement>('[data-part="pause"]');
  let svg: SVGSVGElement | null = null;
  const draw = () => {
    svg?.remove();
    const W = root.clientWidth, H = root.clientHeight;
    if (W < 40 || H < 40) return;
    const cell = Math.max(24, Number(root.dataset.cell ?? 56));
    let s = Number(root.dataset.seed ?? 7) >>> 0;
    const rnd = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const el = (name: string, attrs: Record<string, string | number>) => { const e = document.createElementNS(NS, name); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v)); return e; };
    svg = el('svg', { viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true', focusable: 'false' }) as SVGSVGElement;
    // The grid is centred like the CSS grid backdrop, so traces sit exactly on its lines.
    const x0 = (W / 2) % cell, cols = Math.floor((W - x0) / cell), rows = Math.floor(H / cell);
    // Keep clear of the content. Text and frames in the host are measured, grown by a margin and merged into
    // blocks; traces and lit cells only use what is left (the gutters and the edges).
    const host = root.parentElement, box = root.getBoundingClientRect(), pad = 28;
    type Box = [number, number, number, number];
    let blocks: Box[] = host ? [...host.querySelectorAll<HTMLElement>('h1, h2, h3, p, li, a, button, form, figure, pre, img, input, [data-part="frame"], [data-part="visual"], [data-part="shot"]')]
      .filter((n) => !root.contains(n)).map((n) => n.getBoundingClientRect()).filter((b) => b.width > 0 && b.height > 0)
      .map((b): Box => [b.left - box.left - pad, b.top - box.top - pad, b.right - box.left + pad, b.bottom - box.top + pad]) : [];
    for (let merged = true; merged;) {
      merged = false;
      outer: for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length; j++) {
        const p = blocks[i], q = blocks[j];
        if (p[0] < q[2] && q[0] < p[2] && p[1] < q[3] && q[1] < p[3]) { blocks[i] = [Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[2], q[2]), Math.max(p[3], q[3])]; blocks.splice(j, 1); merged = true; break outer; }
      }
    }
    // With nothing to measure, fall back to side zones: the middle 44% (never less than 600px) stays empty.
    if (!blocks.length) { const zone = Math.max(0, Math.min(W * 0.28, (W - 600) / 2)); blocks = [[zone, -1, W - zone, H + 1]]; }
    const px = (c: number) => x0 + c * cell, py = (r: number) => r * cell;
    const clear = (ax: number, ay: number, bx: number, by: number) => { const l = Math.min(ax, bx), t = Math.min(ay, by), r = Math.max(ax, bx), b = Math.max(ay, by); return blocks.every((k) => r < k[0] || l > k[2] || b < k[1] || t > k[3]); };
    const free: Array<[number, number]> = [];
    for (let c = 0; c <= cols; c++) for (let r = 1; r < rows; r++) if (clear(px(c), py(r), px(c), py(r))) free.push([c, r]);
    const g = el('g', {});
    const count = Math.max(2, Number(root.dataset.traces ?? 6));
    let drawn = 0;
    for (let i = 0; i < count * 3 && drawn < count && free.length; i++) {
      let [c, r] = free[Math.floor(rnd() * free.length)];
      const pts: Array<[number, number]> = [[c, r]];
      let dir = Math.floor(rnd() * 4);
      for (let k = 0, steps = 3 + Math.floor(rnd() * 4); k < steps; k++) {
        const turn = rnd(); if (turn < 0.5) dir = (dir + (turn < 0.25 ? 1 : 3)) % 4;
        const len = 1 + Math.floor(rnd() * 2);
        const nc = c + [1, 0, -1, 0][dir] * len, nr = r + [0, 1, 0, -1][dir] * len;
        if (nc < 0 || nc > cols || nr < 0 || nr > rows || !clear(px(c), py(r), px(nc), py(nr))) continue;
        c = nc; r = nr; pts.push([c, r]);
      }
      if (pts.length < 2) continue;
      drawn++;
      const d = pts.map(([pc, pr], j) => `${j ? 'L' : 'M'}${px(pc)} ${py(pr)}`).join('');
      g.append(el('path', { 'data-part': 'trace', d }));
      const pulse = el('path', { 'data-part': 'pulse', d, pathLength: 100 });
      (pulse as SVGElement).style.animationDelay = `${(-rnd() * 7).toFixed(2)}s`;
      g.append(pulse);
      for (const [pc, pr] of [pts[0], pts[pts.length - 1]]) g.append(el('circle', { 'data-part': 'node', cx: px(pc), cy: py(pr), r: 2.25 }));
    }
    // No room beside the content (a phone, a full-width frame): leave the plain grid and hide the pause button.
    root.toggleAttribute('data-empty', drawn === 0);
    if (!drawn) return;
    for (let i = 0, n = Math.round(free.length / 10); i < n; i++) {
      const [c, r] = free[Math.floor(rnd() * free.length)];
      if (c < cols && clear(px(c) + 1, py(r) + 1, px(c + 1) - 1, py(r + 1) - 1)) g.prepend(el('rect', { 'data-part': 'cell', x: px(c), y: py(r), width: cell, height: cell }));
    }
    svg.append(g);
    root.prepend(svg);
  };
  draw();
  let raf = 0;
  const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); });
  ro.observe(root);
  const toggle = () => {
    const paused = !root.hasAttribute('data-paused');
    root.toggleAttribute('data-paused', paused);
    if (btn) { btn.setAttribute('aria-pressed', String(paused)); btn.setAttribute('aria-label', paused ? 'Play background animation' : 'Pause background animation'); btn.innerHTML = paused ? ICON.play : ICON.pause; }
  };
  return combine(btn ? on(btn, 'click', toggle) : () => {}, () => { ro.disconnect(); cancelAnimationFrame(raf); svg?.remove(); });
}
