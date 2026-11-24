// Leaderboard-style drawers: ranked columns with group colours and hatched gaps, leaderboard rows
// with inline bars and heat cells, and range bars (p5–p95 with a median dot).
import { chart, gutter, tipHtml, yGrid, xGrid, type ChartInstance, type ChartOptions, type Mark } from './frame';
import { formatNumber, type NumberFormat } from './format';
import { band, linear, niceDomain } from './scale';
import { el, r, textWidth } from './svg';
import { groupColors, hatch, legend, monogram, mute, wrap } from './kit';
import { readableOn } from './contrast';

export interface RankedItem { label: string; value: number | null; group?: string; note?: string }
export interface RankedOptions extends ChartOptions {
  /** Sort direction. 'desc' puts the best first when higher is better (default). */
  sort?: 'desc' | 'asc' | 'none';
  /** Emphasise these labels; the rest are drawn muted. */
  highlight?: string | string[];
  /** Show monogram chips for the group under each column (default true when groups exist). */
  chips?: boolean;
  /** Fixed group order so colours stay put across charts on one page. */
  groups?: string[];
}

const hi = (o: { highlight?: string | string[] }, label: string) => !o.highlight || (Array.isArray(o.highlight) ? o.highlight.includes(label) : o.highlight === label);
const order = <T extends { value: number | null }>(d: T[], s: 'desc' | 'asc' | 'none' = 'desc') => {
  if (s === 'none') return d;
  const known = d.filter((i) => i.value != null).sort((a, b) => (s === 'desc' ? b.value! - a.value! : a.value! - b.value!));
  return [...known, ...d.filter((i) => i.value == null)];
};
const topRound = (x: number, y: number, w: number, h: number, rad = 4) => {
  const rr = Math.max(0, Math.min(rad, w / 2, h));
  return `M${r(x)},${r(y + h)}V${r(y + rr)}Q${r(x)},${r(y)} ${r(x + rr)},${r(y)}H${r(x + w - rr)}Q${r(x + w)},${r(y)} ${r(x + w)},${r(y + rr)}V${r(y + h)}Z`;
};

/** Ranked columns: one bar per item, sorted, value on top, group colour, hatched when unavailable. */
export function rankedColumns(host: HTMLElement, data: RankedItem[], opts: RankedOptions = {}): ChartInstance<RankedItem[]> {
  return chart(host, data, { height: (w: number) => (w < 520 ? 300 : 340), ...opts }, (ctx, raw, o) => {
    const { svg, width, height, fmt } = ctx;
    const d = order(raw, o.sort);
    const gc = groupColors(d.map((i) => i.group), o.groups);
    const hid = hatch(svg);
    const hasMissing = d.some((i) => i.value == null);
    const lh = gc.names.length > 1 || hasMissing
      ? legend(svg, [...gc.names.map((n) => ({ name: n, color: gc.color(n) })), ...(hasMissing ? [{ name: 'Not available', color: '', shape: 'hatch' as const }] : [])], width, 0, hid)
      : 0;
    const chips = (o.chips ?? gc.names.length > 1);
    const vals = d.map((i) => i.value).filter((v): v is number => v != null);
    const y0 = lh + 22;
    const xTmp = band(d.map((i) => i.label), [0, width], 0.22, 0.06);
    const labelLines = xTmp.bandwidth >= 34 ? 2 : 0;
    const bottom = (chips ? 22 : 6) + labelLines * 13 + 6;
    const y = linear(niceDomain(0, Math.max(...vals, 0), 4, true), [height - bottom, y0]);
    const gl = gutter(y, fmt, 4);
    const x = band(d.map((i) => i.label), [gl + 4, width], 0.22, 0.06);
    yGrid(svg, y, gl, width, fmt, 4);
    const marks: Mark[] = [];
    const g = el('g');
    const valFont = x.bandwidth < 30 ? 9.5 : 11;
    d.forEach((it) => {
      const px = x(it.label), c = gc.color(it.group), on = hi(o, it.label);
      const fill = on ? c : mute(c);
      if (it.value == null) {
        const h = (y(0) - y0) * 0.22;
        g.append(el('path', { d: topRound(px, y(0) - h, x.bandwidth, h), class: 'lt-mark', style: `fill: url(#${hid}); stroke: var(--border-strong); stroke-width: 1` }));
        g.append(el('text', { x: r(px + x.bandwidth / 2), y: r(y(0) - h - 6), 'text-anchor': 'middle', class: 'lt-value', style: `font-size: ${valFont}px; fill: var(--text-muted)` }, ['n/a']));
      } else {
        const top = y(it.value), h = y(0) - top;
        g.append(el('path', { d: topRound(px, top, x.bandwidth, h), class: 'lt-mark', style: `fill: ${fill}` }));
        if (textWidth(fmt(it.value), `${valFont}px system-ui`) <= x.bandwidth + 8) {
          g.append(el('text', { x: r(px + x.bandwidth / 2), y: r(top - 6), 'text-anchor': 'middle', style: `fill: ${on ? 'var(--text-primary)' : 'var(--text-muted)'}; font-size: ${valFont}px; font-weight: 650` }, [fmt(it.value)]));
        }
      }
      const cx = px + x.bandwidth / 2;
      let ly = y(0) + 6;
      if (chips && it.group) { monogram(g, cx, ly + 8, it.group, c, Math.min(16, x.bandwidth)); ly += 20; }
      if (labelLines) wrap(it.label, x.step - 4, '10.5px system-ui', labelLines).forEach((line, li) => {
        g.append(el('text', { x: r(cx), y: r(ly + 10 + li * 13), 'text-anchor': 'middle', style: `fill: ${on ? 'var(--text-primary)' : 'var(--text-secondary)'}; font-size: 10.5px` }, [line]));
      });
      const rows = [{ color: it.value == null ? undefined : c, label: it.group ?? 'Value', value: it.value == null ? 'Not available' : fmt(it.value) }];
      if (it.note) rows.push({ color: undefined, label: 'Note', value: it.note });
      marks.push({ x: cx, y: it.value == null ? y(0) : y(it.value), hit: { x: px - (x.step - x.bandwidth) / 2, y: y0, w: x.step, h: height - y0 }, html: tipHtml(it.label, rows), text: `${it.label}${it.group ? ` (${it.group})` : ''}: ${it.value == null ? 'not available' : fmt(it.value)}` });
    });
    svg.append(g);
    ctx.interact({ mode: 'nearest', marks });
    const best = d.find((i) => i.value != null);
    return {
      summary: `Ranked column chart of ${d.length} items. Highest: ${best?.label} at ${fmt(best?.value ?? 0)}.${hasMissing ? ` ${d.filter((i) => i.value == null).length} not available.` : ''}`,
      table: { head: ['Item', 'Group', 'Value'], rows: d.map((i) => [i.label, i.group ?? '', i.value == null ? 'n/a' : fmt(i.value)]) },
    };
  });
}

// ---------------------------------------------------------------- leaderboard rows
export interface LeaderRow { label: string; group?: string; values: Array<number | null> }
export interface LeaderColumn { name: string; format?: NumberFormat; better?: 'high' | 'low' }
export interface LeaderData { columns: LeaderColumn[]; rows: LeaderRow[] }
export interface LeaderOptions extends ChartOptions { groups?: string[]; highlight?: string | string[] }

/** Leaderboard: rank, name with chip, an inline bar for the first metric and heat cells for the rest. */
export function leaderboard(host: HTMLElement, data: LeaderData, opts: LeaderOptions = {}): ChartInstance<LeaderData> {
  const rowH = 34;
  return chart(host, data, { height: () => (data.rows.length + 1) * rowH + 6, ...opts }, (ctx, d, o) => {
    const { svg, width } = ctx;
    const [main, ...rest] = d.columns;
    const fmtC = (ci: number, v: number | null) => (v == null ? 'n/a' : formatNumber(v, d.columns[ci].format));
    const rows = [...d.rows].sort((a, b) => {
      const av = a.values[0], bv = b.values[0];
      if (av == null) return 1; if (bv == null) return -1;
      return main.better === 'low' ? av - bv : bv - av;
    });
    const gc = groupColors(rows.map((x) => x.group), o.groups);
    const hid = hatch(svg);
    const cellW = width < 560 ? 0 : Math.min(84, Math.max(64, ...rest.map((c) => textWidth(c.name, '600 11px system-ui') + 16)));
    const restCols = cellW ? rest : [];
    const nameW = Math.min(220, Math.max(120, width * 0.3));
    const barX0 = 30 + nameW, barX1 = width - restCols.length * (cellW + 4) - 8;
    const mainVals = rows.map((x) => x.values[0]).filter((v): v is number => v != null);
    const xb = linear([0, Math.max(...mainVals)], [barX0, barX1 - textWidth(fmtC(0, Math.max(...mainVals)), '600 11px system-ui') - 10]);
    const g = el('g');
    // Header
    g.append(el('text', { x: 0, y: 20, class: 'lt-tick' }, ['#']));
    g.append(el('text', { x: 30, y: 20, class: 'lt-tick' }, ['Name']));
    g.append(el('text', { x: barX0, y: 20, class: 'lt-tick', style: 'font-weight: 600' }, [`${main.name}${main.better === 'low' ? ' (lower is better)' : ''}`]));
    restCols.forEach((c, ci) => g.append(el('text', { x: r(barX1 + 4 + ci * (cellW + 4) + cellW / 2), y: 20, 'text-anchor': 'middle', class: 'lt-tick' }, [c.name])));
    g.append(el('line', { x1: 0, x2: width, y1: rowH - 4, y2: rowH - 4, class: 'lt-baseline' }));
    // Per-column ranges for heat cells (direction-aware).
    const ranges = restCols.map((_, k) => { const vs = rows.map((x) => x.values[k + 1]).filter((v): v is number => v != null); return [Math.min(...vs), Math.max(...vs)]; });
    const marks: Mark[] = [];
    rows.forEach((row, i) => {
      const top = (i + 1) * rowH, cy = top + rowH / 2 - 2;
      const on = hi(o, row.label), c = gc.color(row.group);
      if (i % 2 === 1) g.append(el('rect', { x: 0, y: top - 2, width, height: rowH, rx: 4, style: 'fill: var(--bg-surface-2); opacity: 0.55' }));
      g.append(el('text', { x: 0, y: r(cy + 4), style: 'fill: var(--text-muted); font-size: 11px; font-variant-numeric: tabular-nums' }, [String(i + 1)]));
      if (row.group) monogram(g, 38, cy, row.group, c, 16);
      const nm = wrap(row.label, nameW - 30, '600 12px system-ui', 1)[0];
      g.append(el('text', { x: 52, y: r(cy + (row.group && width > 420 ? 0 : 4)), style: `fill: var(--text-primary); font-size: 12px; font-weight: ${on ? 650 : 500}` }, [nm]));
      if (row.group && width > 420) g.append(el('text', { x: 52, y: r(cy + 12), style: 'fill: var(--text-muted); font-size: 10px' }, [row.group]));
      const v = row.values[0];
      if (v == null) {
        g.append(el('rect', { x: barX0, y: r(cy - 6), width: 40, height: 12, rx: 3, style: `fill: url(#${hid}); stroke: var(--border-strong)` }));
        g.append(el('text', { x: barX0 + 48, y: r(cy + 4), class: 'lt-value' }, ['n/a']));
      } else {
        g.append(el('rect', { x: barX0, y: r(cy - 6), width: r(Math.max(2, xb(v) - barX0)), height: 12, rx: 3, class: 'lt-mark', style: `fill: ${on ? c : mute(c)}` }));
        g.append(el('text', { x: r(xb(v) + 8), y: r(cy + 4), style: 'fill: var(--text-primary); font-size: 11px; font-weight: 650' }, [fmtC(0, v)]));
      }
      restCols.forEach((col, k) => {
        const cv = row.values[k + 1];
        const x0 = barX1 + 4 + k * (cellW + 4);
        if (cv == null) {
          g.append(el('rect', { x: r(x0), y: top + 3, width: cellW, height: rowH - 10, rx: 4, style: `fill: url(#${hid}); opacity: 0.6` }));
          g.append(el('text', { x: r(x0 + cellW / 2), y: r(cy + 4), 'text-anchor': 'middle', class: 'lt-tick' }, ['n/a']));
          return;
        }
        const [lo, hiV] = ranges[k];
        let t = hiV === lo ? 1 : (cv - lo) / (hiV - lo);
        if (col.better === 'low') t = 1 - t;
        const fill = `color-mix(in oklab, var(--accent-solid) ${Math.round(6 + t * 46)}%, var(--bg-surface-1))`;
        const ink = readableOn(fill, host).color;
        g.append(el('rect', { x: r(x0), y: top + 3, width: cellW, height: rowH - 10, rx: 4, style: `fill: ${fill}` }));
        g.append(el('text', { x: r(x0 + cellW / 2), y: r(cy + 4), 'text-anchor': 'middle', style: `fill: ${ink}; font-size: 11px; font-weight: 600; font-variant-numeric: tabular-nums` }, [fmtC(k + 1, cv)]));
      });
      marks.push({ x: barX0, y: cy, hit: { x: 0, y: top - 2, w: width, h: rowH }, html: tipHtml(`${i + 1}. ${row.label}`, d.columns.map((col, ci) => ({ label: col.name, value: fmtC(ci, row.values[ci]) }))), text: `Rank ${i + 1}, ${row.label}: ${d.columns.map((col, ci) => `${col.name} ${fmtC(ci, row.values[ci])}`).join(', ')}` });
    });
    svg.append(g);
    ctx.interact({ mode: 'nearest', marks });
    return {
      summary: `Leaderboard of ${rows.length} rows ranked by ${main.name}. First: ${rows[0]?.label}.`,
      table: { head: ['Name', ...d.columns.map((c) => c.name)], rows: rows.map((x) => [x.label, ...x.values.map((v, ci) => fmtC(ci, v))]) },
    };
  });
}

// ---------------------------------------------------------------- range bars
export interface RangeItem { label: string; lo: number; mid: number; hi: number; group?: string }
export interface RangeOptions extends RankedOptions { loName?: string; midName?: string; hiName?: string }

/** Range bars: a capsule from low to high with a dot at the median, sorted by the median. */
export function rangeBars(host: HTMLElement, data: RangeItem[], opts: RangeOptions = {}): ChartInstance<RangeItem[]> {
  const rowH = 28;
  return chart(host, data, { height: () => data.length * rowH + 52, ...opts }, (ctx, raw, o) => {
    const { svg, width, height, fmt } = ctx;
    const d = [...raw].sort((a, b) => (o.sort === 'desc' ? b.mid - a.mid : o.sort === 'none' ? 0 : a.mid - b.mid));
    const gc = groupColors(d.map((i) => i.group), o.groups);
    const lh = gc.names.length > 1 ? legend(svg, gc.names.map((n) => ({ name: n, color: gc.color(n) })), width) : 0;
    const labelW = Math.min(width * 0.34, Math.max(...d.map((i) => textWidth(i.label, '12px system-ui'))) + 14);
    const x = linear(niceDomain(0, Math.max(...d.map((i) => i.hi)), 5, true), [labelW, width - 8]);
    const y = band(d.map((i) => i.label), [lh + 4, height - 26], 0.35, 0.1);
    xGrid(svg, x, lh, height - 26, fmt, Math.max(3, Math.floor(width / 110)));
    const g = el('g');
    const marks: Mark[] = [];
    d.forEach((it) => {
      const cy = y(it.label) + y.bandwidth / 2, c = gc.color(it.group), on = hi(o, it.label);
      g.append(el('text', { x: labelW - 10, y: r(cy + 4), 'text-anchor': 'end', style: 'fill: var(--text-primary); font-size: 12px' }, [it.label]));
      g.append(el('line', { x1: r(x(it.lo)), x2: r(x(it.hi)), y1: r(cy), y2: r(cy), class: 'lt-mark', style: `stroke: color-mix(in oklab, ${c} ${on ? 45 : 20}%, transparent); stroke-width: 8; stroke-linecap: round` }));
      g.append(el('circle', { cx: r(x(it.mid)), cy: r(cy), r: 5, class: 'lt-mark', style: `fill: ${on ? c : mute(c, 60)}; stroke: var(--bg-surface-1); stroke-width: 2` }));
      marks.push({ x: x(it.mid), y: cy, hit: { x: 0, y: y(it.label) - 4, w: width, h: y.bandwidth + 8 }, html: tipHtml(it.label, [{ label: o.loName ?? 'Low', value: fmt(it.lo) }, { color: c, label: o.midName ?? 'Median', value: fmt(it.mid) }, { label: o.hiName ?? 'High', value: fmt(it.hi) }]), text: `${it.label}: ${o.midName ?? 'median'} ${fmt(it.mid)}, range ${fmt(it.lo)} to ${fmt(it.hi)}` });
    });
    svg.append(g);
    ctx.interact({ mode: 'nearest', marks });
    return { summary: `Range chart of ${d.length} items, sorted by ${o.midName ?? 'median'}. Lowest: ${d[0]?.label} at ${fmt(d[0]?.mid ?? 0)}.`, table: { head: ['Item', o.loName ?? 'Low', o.midName ?? 'Median', o.hiName ?? 'High'], rows: d.map((i) => [i.label, fmt(i.lo), fmt(i.mid), fmt(i.hi)]) } };
  });
}
