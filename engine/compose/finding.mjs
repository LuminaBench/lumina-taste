// A chart's title says what it shows ("Monthly revenue up 9% in 12 weeks"), and its subtitle says what it is
// ("Monthly revenue per week, last 12 weeks"). Written from the numbers themselves, so it stays true when the
// sample data is swapped for the real thing and the draft is regenerated.

const pct = (x) => `${Math.round(Math.abs(x) * 100)}%`;
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

/**
 * The finding in a series over time.
 * @param {string} label   what is measured, as a reader says it ("Monthly revenue", "Accounts")
 * @param {number[]} values in time order
 * @param {{ period?: string, rate?: boolean }} opts  rate: the values are already a share (churn, retention), so
 *   a change is said in points, not per cent of itself
 */
export function trendFinding(label, values, { period = 'week', rate = false } = {}) {
  const v = values.filter((x) => Number.isFinite(x));
  if (v.length < 3) return label;
  const first = v[0], last = v.at(-1), n = v.length;
  const peakAt = v.indexOf(Math.max(...v)), lowAt = v.indexOf(Math.min(...v));
  const span = plural(n, period);
  if (rate) {
    const pts = (last - first) * 100;
    if (Math.abs(pts) < 0.3) return `${label} held steady over ${span}`;
    return `${label} ${pts > 0 ? 'up' : 'down'} ${Math.abs(pts).toFixed(1)} points in ${span}`;
  }
  const change = first ? (last - first) / Math.abs(first) : 0;
  // A clear peak well before the end is the story, not the net change.
  if (peakAt > 0 && peakAt < n - 2 && v[peakAt] > last * 1.08) return `${label} peaked in ${period} ${peakAt + 1}, then eased`;
  if (lowAt > 0 && lowAt < n - 2 && v[lowAt] < first * 0.92 && last > v[lowAt] * 1.08) return `${label} recovered after a dip in ${period} ${lowAt + 1}`;
  if (Math.abs(change) < 0.03) return `${label} held steady over ${span}`;
  return `${label} ${change > 0 ? 'up' : 'down'} ${pct(change)} in ${span}`;
}

/**
 * The finding in a breakdown: which part leads, and by how much.
 * @param {string} many   what is counted, plural ("accounts")
 * @param {Array<{ label: string, value: number }>} parts
 */
export function shareFinding(many, parts) {
  const p = parts.filter((x) => Number.isFinite(x.value) && x.value > 0);
  if (p.length < 2) return null;
  const total = p.reduce((a, x) => a + x.value, 0);
  const [top, next] = [...p].sort((a, b) => b.value - a.value);
  const share = top.value / total;
  if (share > 0.5) return `Most ${many} are ${String(top.label).toLowerCase()} (${top.value} of ${total})`;
  if (top.value >= next.value * 1.5) return `${top.label} leads: ${pct(share)} of ${many}`;
  return `${top.label} and ${String(next.label).toLowerCase()} lead, close together`;
}
