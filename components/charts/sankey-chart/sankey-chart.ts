import { chart, seriesColor, tipHtml, type ChartOptions, type Mark } from '../core/frame';
import { el, r, textWidth } from '../core/svg';
import '../core/charts.css';

export interface SankeyData { nodes: Array<{ id: string; label: string }>; links: Array<{ source: string; target: string; value: number }> }

/** Layered Sankey: columns by longest path from a source, node height ∝ throughput, links as smooth bands. */
export function render(host: HTMLElement, data: SankeyData, opts: ChartOptions = {}) {
  return chart(host, data, { height: (w: number) => Math.round(Math.min(380, Math.max(260, w * 0.5))), ...opts }, (ctx, d, _o) => {
    const { svg, width, height, fmt } = ctx;
    const ids = d.nodes.map((n) => n.id);
    const inL = (id: string) => d.links.filter((l) => l.target === id);
    const outL = (id: string) => d.links.filter((l) => l.source === id);
    const col = new Map<string, number>();
    const depth = (id: string, seen = new Set<string>()): number => {
      if (col.has(id)) return col.get(id)!;
      if (seen.has(id)) return 0;
      seen.add(id);
      const v = inL(id).length ? 1 + Math.max(...inL(id).map((l) => depth(l.source, seen))) : 0;
      col.set(id, v);
      return v;
    };
    ids.forEach((id) => depth(id));
    const cols = Math.max(...col.values()) + 1;
    const through = (id: string) => Math.max(inL(id).reduce((a, l) => a + l.value, 0), outL(id).reduce((a, l) => a + l.value, 0));
    const nodeW = 10, gap = 14, top = 8, bottom = height - 8;
    const leftPad = Math.max(...d.nodes.filter((n) => col.get(n.id) === 0).map((n) => textWidth(n.label, '600 12px system-ui'))) + 12;
    const rightPad = Math.max(...d.nodes.filter((n) => col.get(n.id) === cols - 1).map((n) => textWidth(n.label, '600 12px system-ui'))) + 12;
    const colX = (c: number) => leftPad + (c * (width - leftPad - rightPad - nodeW)) / Math.max(1, cols - 1);
    const byCol = Array.from({ length: cols }, (_, c) => d.nodes.filter((n) => col.get(n.id) === c));
    const scale = Math.min(...byCol.map((ns) => (bottom - top - gap * (ns.length - 1)) / ns.reduce((a, n) => a + through(n.id), 0)));
    const pos = new Map<string, { x: number; y: number; h: number; inY: number; outY: number }>();
    byCol.forEach((ns, c) => {
      const total = ns.reduce((a, n) => a + through(n.id) * scale, 0) + gap * (ns.length - 1);
      let y = top + (bottom - top - total) / 2;
      ns.forEach((n) => { const h = through(n.id) * scale; pos.set(n.id, { x: colX(c), y, h, inY: y, outY: y }); y += h + gap; });
    });
    const colorOf = new Map(byCol[0].map((n, i) => [n.id, seriesColor(i)]));
    const rootOf = (id: string): string => (inL(id).length ? rootOf([...inL(id)].sort((a, b) => b.value - a.value)[0].source) : id);
    const g = el('g');
    const marks: Mark[] = [];
    for (const l of [...d.links].sort((a, b) => (pos.get(a.source)!.y - pos.get(b.source)!.y) || (pos.get(a.target)!.y - pos.get(b.target)!.y))) {
      const s = pos.get(l.source)!, t = pos.get(l.target)!;
      const h = l.value * scale;
      const x0 = s.x + nodeW, x1 = t.x, mx = (x0 + x1) / 2;
      const y0 = s.outY, y1 = t.inY;
      s.outY += h; t.inY += h;
      const c = colorOf.get(rootOf(l.source)) ?? 'var(--chart-1)';
      g.append(el('path', { d: `M${r(x0)},${r(y0)}C${r(mx)},${r(y0)} ${r(mx)},${r(y1)} ${r(x1)},${r(y1)}L${r(x1)},${r(y1 + h)}C${r(mx)},${r(y1 + h)} ${r(mx)},${r(y0 + h)} ${r(x0)},${r(y0 + h)}Z`, class: 'lt-mark', style: `fill: color-mix(in oklab, ${c} 30%, transparent)` }));
      const sl = d.nodes.find((n) => n.id === l.source)!.label, tl = d.nodes.find((n) => n.id === l.target)!.label;
      marks.push({ x: mx, y: (y0 + y1) / 2 + h / 2, html: tipHtml(`${sl} → ${tl}`, [{ color: c, label: 'Flow', value: fmt(l.value) }]), text: `${sl} to ${tl}: ${fmt(l.value)}` });
    }
    d.nodes.forEach((n) => {
      const p = pos.get(n.id)!;
      const c = col.get(n.id)!;
      g.append(el('rect', { x: r(p.x), y: r(p.y), width: nodeW, height: r(Math.max(2, p.h)), rx: 2, style: `fill: ${colorOf.get(rootOf(n.id)) ?? 'var(--text-secondary)'}` }));
      const right = c < cols - 1 && c > 0 ? true : c === 0 ? false : false;
      const anchorLeft = c === 0;
      const tx = anchorLeft ? p.x - 6 : c === cols - 1 ? p.x + nodeW + 6 : p.x + nodeW + 6;
      g.append(el('text', { x: r(tx), y: r(p.y + p.h / 2 - 1), 'text-anchor': anchorLeft ? 'end' : 'start', style: 'font-size: 12px; font-weight: 600; fill: var(--text-primary)' }, [n.label]));
      g.append(el('text', { x: r(tx), y: r(p.y + p.h / 2 + 13), 'text-anchor': anchorLeft ? 'end' : 'start', class: 'lt-tick' }, [fmt(through(n.id))]));
      void right;
    });
    svg.append(g);
    ctx.interact({ mode: 'nearest', marks, radius: 60 });
    return { summary: `Sankey diagram of ${d.links.length} flows across ${cols} stages.`, table: { head: ['From', 'To', 'Value'], rows: d.links.map((l) => [d.nodes.find((n) => n.id === l.source)!.label, d.nodes.find((n) => n.id === l.target)!.label, fmt(l.value)]) } };
  });
}

export function demo(host: HTMLElement) {
  return render(host, {
    nodes: [
      { id: 'search', label: 'Search' }, { id: 'social', label: 'Social' }, { id: 'direct', label: 'Direct' },
      { id: 'pricing', label: 'Pricing' }, { id: 'docs', label: 'Docs' },
      { id: 'trial', label: 'Trial' }, { id: 'left', label: 'Left' },
    ],
    links: [
      { source: 'search', target: 'pricing', value: 4200 }, { source: 'search', target: 'docs', value: 3100 },
      { source: 'social', target: 'pricing', value: 1800 }, { source: 'social', target: 'docs', value: 600 },
      { source: 'direct', target: 'pricing', value: 2600 }, { source: 'direct', target: 'docs', value: 900 },
      { source: 'pricing', target: 'trial', value: 3300 }, { source: 'pricing', target: 'left', value: 5300 },
      { source: 'docs', target: 'trial', value: 1700 }, { source: 'docs', target: 'left', value: 2900 },
    ],
  }, { title: 'Where visitors go', subtitle: 'Weekly sessions, source → page → outcome', format: { compact: true }, source: 'Source: synthetic web analytics' });
}
