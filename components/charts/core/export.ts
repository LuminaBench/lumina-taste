// One-click export. CSS custom properties do not survive outside the page, so every colour,
// stroke and font is resolved from computed style into the exported copy.
import type { ChartOptions } from './frame';

const PROPS = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'fill-opacity', 'stroke-opacity', 'font-family', 'font-size', 'font-weight', 'font-variant-numeric', 'letter-spacing'];
const NS = 'http://www.w3.org/2000/svg';

export function standalone(svg: SVGSVGElement, opts: ChartOptions = {}) {
  const w = svg.width.baseVal.value, h = svg.height.baseVal.value;
  const head = opts.title ? (opts.subtitle ? 52 : 34) : 0;
  const foot = opts.source ? 26 : 0;
  const pad = 16;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const src = [svg, ...svg.querySelectorAll('*')];
  const dst = [clone, ...clone.querySelectorAll('*')];
  src.forEach((node, i) => {
    const cs = getComputedStyle(node as Element);
    const d = dst[i] as SVGElement;
    d.removeAttribute('class');
    d.setAttribute('style', PROPS.map((p) => `${p}:${cs.getPropertyValue(p)}`).join(';'));
  });
  clone.querySelector('.lt-hover')?.remove();
  const root = svg.closest('.lt-chart') ?? svg;
  const rs = getComputedStyle(root);
  const out = document.createElementNS(NS, 'svg');
  const W = w + pad * 2, H = h + head + foot + pad * 2;
  out.setAttribute('xmlns', NS);
  out.setAttribute('width', String(W));
  out.setAttribute('height', String(H));
  out.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const bg = document.createElementNS(NS, 'rect');
  bg.setAttribute('width', String(W));
  bg.setAttribute('height', String(H));
  bg.setAttribute('fill', rs.getPropertyValue('--bg-surface-1').trim() || '#fff');
  out.append(bg);
  const font = rs.getPropertyValue('--font-body') || 'system-ui';
  const text = (y: number, s: string, size: number, weight: number, color: string) => {
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('x', String(pad));
    t.setAttribute('y', String(y));
    t.setAttribute('style', `font-family:${font};font-size:${size}px;font-weight:${weight};fill:${color}`);
    t.textContent = s;
    out.append(t);
  };
  const ink = getComputedStyle(root).color;
  const muted = rs.getPropertyValue('--text-secondary').trim() || ink;
  if (opts.title) text(pad + 16, opts.title, 16, 650, ink);
  if (opts.subtitle) text(pad + 36, opts.subtitle, 12.5, 400, muted);
  clone.setAttribute('x', String(pad));
  clone.setAttribute('y', String(pad + head));
  clone.removeAttribute('tabindex');
  out.append(clone);
  if (opts.source) text(H - pad + 2, opts.source, 11, 400, muted);
  return { markup: new XMLSerializer().serializeToString(out), width: W, height: H };
}

function download(blob: Blob, name: string) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function exportSVG(svg: SVGSVGElement, name: string, opts?: ChartOptions) {
  const { markup } = standalone(svg, opts);
  download(new Blob([markup], { type: 'image/svg+xml' }), `${name}.svg`);
}

export async function exportPNG(svg: SVGSVGElement, name: string, opts?: ChartOptions, scale = 2) {
  const { markup, width, height } = standalone(svg, opts);
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  if (blob) download(blob, `${name}.png`);
}
