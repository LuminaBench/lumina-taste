// Smart unit formatting: £24.4k, 60.1 fps, 12.5%, Nov 24. Always pair output with tabular-nums.
export interface NumberFormat { prefix?: string; suffix?: string; decimals?: number; compact?: boolean; percent?: boolean; sign?: boolean }

const MINUS = '−'; // U+2212, same width as + in most faces

export function formatNumber(v: number, f: NumberFormat = {}): string {
  if (!Number.isFinite(v)) return '–';
  const { prefix = '', suffix = '', compact = false, percent = false, sign = false } = f;
  let n = percent ? v * 100 : v;
  let unit = '';
  if (compact) {
    const a = Math.abs(n);
    if (a >= 1e9) { n /= 1e9; unit = 'bn'; } else if (a >= 1e6) { n /= 1e6; unit = 'm'; } else if (a >= 1e3) { n /= 1e3; unit = 'k'; }
  }
  const decimals = f.decimals ?? (compact && unit ? (Math.abs(n) >= 100 ? 0 : 1) : Math.abs(n) < 10 && n % 1 !== 0 ? 1 : 0);
  let s = Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  if (compact && unit) s = s.replace(/\.0$/, '');
  const neg = n < 0 && +s.replace(/,/g, '') !== 0;
  const signStr = neg ? MINUS : sign && n > 0 ? '+' : '';
  return `${signStr}${prefix}${s}${unit}${percent ? '%' : ''}${suffix}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const toDate = (x: Date | string | number) => (x instanceof Date ? x : new Date(typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) ? `${x}T12:00:00` : x));

/** Date label sized to the span of the axis: "Nov 24", "Nov 2026", "2026". */
export function formatDate(x: Date | string | number, spanDays = 30): string {
  const d = toDate(x);
  if (spanDays > 3 * 365) return String(d.getFullYear());
  if (spanDays > 120) return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
export const monthName = (m: number) => MONTHS[m];

/** Label anything that can sit on an x axis. */
export function formatX(x: unknown, all: unknown[]): string {
  if (x instanceof Date || (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}/.test(x))) {
    const first = toDate(all[0] as string), last = toDate(all[all.length - 1] as string);
    return formatDate(x as string, Math.abs(+last - +first) / 864e5);
  }
  return typeof x === 'number' ? formatNumber(x) : String(x);
}

/** Full label for tooltips: "Nov 24, 2026" for dates, the raw value otherwise. */
export function formatXFull(x: unknown): string {
  if (x instanceof Date || (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}/.test(x))) {
    const d = toDate(x as string);
    return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }
  return typeof x === 'number' ? formatNumber(x) : String(x);
}
