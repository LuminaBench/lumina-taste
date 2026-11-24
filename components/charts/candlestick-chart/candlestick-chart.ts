import { chart, gutter, tipHtml, xLabels, yGrid, type ChartOptions, type Mark } from '../core/frame';
import { formatNumber, formatX, formatXFull } from '../core/format';
import { band, extent, linear, niceDomain, rng, tickIndices } from '../core/scale';
import { el, r } from '../core/svg';
import '../core/charts.css';

export interface Candle { t: string; open: number; high: number; low: number; close: number; volume?: number }
export interface CandleOptions extends ChartOptions { volume?: boolean; style?: 'candle' | 'ohlc' }

/** Financial candlestick or OHLC chart with an optional volume subplot sharing the x axis. */
export function render(host: HTMLElement, data: Candle[], opts: CandleOptions = {}) {
  return chart(host, data, { height: (w: number) => Math.round(Math.min(380, Math.max(260, w * 0.5))), ...opts }, (ctx, d, o) => {
    const { svg, width, height, fmt } = ctx;
    const showVol = (o.volume ?? true) && d.some((c) => c.volume != null);
    const volH = showVol ? Math.round(height * 0.2) : 0;
    const m = { t: 18, b: 26, r: 56 };
    const priceBottom = height - m.b - volH - (showVol ? 10 : 0);
    const y = linear(niceDomain(...extent(d.flatMap((c) => [c.low, c.high])), 5), [priceBottom, m.t]);
    m.r = gutter(y, fmt) + 4;
    const x = band(d.map((c) => c.t), [0, width - m.r], 0.3, 0.2);
    yGrid(svg, y, 0, width - m.r + 4, fmt, 5, 'right');
    const up = 'var(--status-positive)', down = 'var(--status-negative)';
    const g = el('g');
    const marks: Mark[] = [];
    let vy: ((v: number) => number) | null = null;
    if (showVol) {
      const vmax = Math.max(...d.map((c) => c.volume ?? 0));
      vy = linear([0, vmax], [height - m.b, height - m.b - volH]);
      svg.append(el('text', { x: 0, y: height - m.b - volH - 2, class: 'lt-tick' }, ['Volume']));
    }
    d.forEach((c) => {
      const cx = x(c.t) + x.bandwidth / 2;
      const col = c.close >= c.open ? up : down;
      const bodyTop = y(Math.max(c.open, c.close)), bodyH = Math.max(1, Math.abs(y(c.open) - y(c.close)));
      if (o.style === 'ohlc') {
        g.append(el('line', { x1: r(cx), x2: r(cx), y1: r(y(c.high)), y2: r(y(c.low)), style: `stroke: ${col}; stroke-width: 1.5` }));
        g.append(el('line', { x1: r(x(c.t)), x2: r(cx), y1: r(y(c.open)), y2: r(y(c.open)), style: `stroke: ${col}; stroke-width: 1.5` }));
        g.append(el('line', { x1: r(cx), x2: r(x(c.t) + x.bandwidth), y1: r(y(c.close)), y2: r(y(c.close)), style: `stroke: ${col}; stroke-width: 1.5` }));
      } else {
        g.append(el('line', { x1: r(cx), x2: r(cx), y1: r(y(c.high)), y2: r(y(c.low)), style: `stroke: ${col}; stroke-width: 1` }));
        g.append(el('rect', { x: r(x(c.t)), y: r(bodyTop), width: r(x.bandwidth), height: r(bodyH), rx: 1, class: 'lt-mark', style: c.close >= c.open ? `fill: var(--bg-surface-1); stroke: ${col}; stroke-width: 1.25` : `fill: ${col}` }));
      }
      if (vy && c.volume != null) g.append(el('rect', { x: r(x(c.t)), y: r(vy(c.volume)), width: r(x.bandwidth), height: r(height - m.b - vy(c.volume)), style: `fill: color-mix(in oklab, ${col} 35%, var(--bg-surface-2))` }));
      const chg = (c.close - c.open) / c.open;
      marks.push({ x: cx, y: y(c.high), hit: { x: x(c.t) - x.step * 0.15, y: m.t, w: x.step, h: height - m.b - m.t }, html: tipHtml(formatXFull(c.t), [{ label: 'Open', value: fmt(c.open) }, { label: 'High', value: fmt(c.high) }, { label: 'Low', value: fmt(c.low) }, { color: col, label: 'Close', value: `${fmt(c.close)} (${formatNumber(chg, { percent: true, sign: true, decimals: 1 })})` }, ...(c.volume != null ? [{ label: 'Volume', value: formatNumber(c.volume, { compact: true }) }] : [])]), text: `${formatXFull(c.t)}: open ${fmt(c.open)}, high ${fmt(c.high)}, low ${fmt(c.low)}, close ${fmt(c.close)}` });
    });
    svg.append(g);
    xLabels(svg, tickIndices(d.length, Math.floor((width - m.r) / 80)).map((i) => ({ x: x(d[i].t) + x.bandwidth / 2, text: formatX(d[i].t, d.map((c) => c.t)) })), height - 6, width - m.r);
    ctx.interact({ mode: 'nearest', marks });
    const last = d[d.length - 1], firstC = d[0];
    return { summary: `${o.style === 'ohlc' ? 'OHLC' : 'Candlestick'} chart of ${d.length} periods, from ${fmt(firstC.open)} to ${fmt(last.close)}.`, table: { head: ['Date', 'Open', 'High', 'Low', 'Close', 'Volume'], rows: d.map((c) => [c.t, fmt(c.open), fmt(c.high), fmt(c.low), fmt(c.close), c.volume != null ? formatNumber(c.volume, { compact: true }) : '–']) } };
  });
}

export function demo(host: HTMLElement) {
  const rand = rng(19);
  let p = 182;
  const start = new Date('2026-09-01T12:00:00');
  const bars: Candle[] = [];
  for (let i = 0; bars.length < 60; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const open = p, close = Math.max(50, open + (rand() - 0.47) * 6);
    const high = Math.max(open, close) + rand() * 3, low = Math.min(open, close) - rand() * 3;
    bars.push({ t: d.toISOString().slice(0, 10), open: +open.toFixed(2), high: +high.toFixed(2), low: +low.toFixed(2), close: +close.toFixed(2), volume: Math.round(2e6 + rand() * 4e6 + Math.abs(close - open) * 6e5) });
    p = close;
  }
  return render(host, bars, { title: 'HLYD daily price', subtitle: 'Last 60 sessions, with volume', format: { prefix: '$', decimals: 2 }, source: 'Source: synthetic market data' });
}
