#!/usr/bin/env node
// Realistic, seeded sample data for demos and blueprints: uneven amounts, varied names, seasonality,
// weekend dips. Same seed, same data, so screenshots and tests stay stable.
//
//   node scripts/sample-data.mjs users --rows 12
//   node scripts/sample-data.mjs invoices --rows 20 --currency £ --format csv
//   node scripts/sample-data.mjs series --points 24 --period month --base 18000 --growth 0.04
//   node scripts/sample-data.mjs revenue | funnel | cohort | orders | events   [--seed 7] [--format json|csv]
//
// All companies and people are fictional (Halyard, Larkspur, Kestrel, Juniper, Moss and friends).
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i < 0 ? def : args[i + 1]; };
const kind = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--'))) ?? 'help';
const rows = +opt('rows', '12');
const seed = +opt('seed', '7');
const format = opt('format', 'json');
const cur = opt('currency', '£');

// mulberry32: tiny, fast, deterministic.
let s = seed >>> 0;
const rnd = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const between = (a, b) => a + rnd() * (b - a);
const int = (a, b) => Math.floor(between(a, b + 1));
const money = (n) => Math.round(n * 100) / 100;
const fmt = (n) => `${cur}${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const FIRST = ['Ana', 'Kai', 'Lee', 'Riya', 'Tom', 'Sara', 'Marco', 'Nia', 'Jon', 'Priya', 'Femi', 'Ines', 'Yuki', 'Omar', 'Elif', 'Mateo', 'Hana', 'Theo', 'Amara', 'Lukas', 'Zoe', 'Ravi', 'Freya', 'Diego', 'Mei', 'Kofi', 'Sofia', 'Arjun', 'Leah', 'Ivan'];
const LAST = ['López', 'Moreno', 'Park', 'Mehta', 'Becker', 'Ito', 'Bianchi', 'Okafor', 'Svensson', 'Raman', 'Adeyemi', 'Costa', 'Tanaka', 'Haddad', 'Yılmaz', 'Silva', 'Kim', 'Novak', 'Mensah', 'Weber', 'Laurent', 'Iyer', 'Nilsen', 'Ortega', 'Chen', 'Boateng', 'Rossi', 'Kapoor', 'Cohen', 'Petrov'];
const COMPANIES = [['Halyard', 'halyard.dev'], ['Larkspur', 'larkspur.ai'], ['Kestrel Labs', 'kestrel.io'], ['Juniper & Co', 'juniper.co'], ['Moss Studio', 'moss.studio'], ['Harbour Freight', 'harbourfreight.uk'], ['Northgate Dental', 'northgatedental.uk'], ['Pinecrest Books', 'pinecrest.pub'], ['Oriel Architects', 'oriel.archi'], ['Fernhill Farm', 'fernhill.farm'], ['Tidewater Media', 'tidewater.media'], ['Copperleaf', 'copperleaf.io']];
const ascii = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').toLowerCase();
const person = () => { const f = pick(FIRST), l = pick(LAST), [co, dom] = pick(COMPANIES); return { name: `${f} ${l}`, email: `${ascii(f)}.${ascii(l)}@${dom}`, company: co }; };
const day = (offset) => { const d = new Date(Date.UTC(2026, 10, 24) - offset * 864e5); return d.toISOString().slice(0, 10); };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ago = (mins) => mins < 60 ? `${mins} min ago` : mins < 1440 ? `${Math.round(mins / 60)} hours ago` : mins < 2880 ? 'Yesterday' : `${Math.round(mins / 1440)} days ago`;

const gen = {
  users: () => Array.from({ length: rows }, (_, i) => {
    const p = person();
    const status = i === 0 ? 'Active' : pick(['Active', 'Active', 'Active', 'Active', 'Invited', 'Deactivated']);
    return { ...p, role: i === 0 ? 'Owner' : pick(['Admin', 'Editor', 'Editor', 'Viewer', 'Viewer']), status, lastActive: status === 'Invited' ? 'Invite sent' : ago(int(2, 20000)), joined: day(int(20, 700)) };
  }),
  invoices: () => Array.from({ length: rows }, (_, i) => {
    const [co] = pick(COMPANIES); const amount = money(pick([between(180, 900), between(900, 4200), between(40, 180)]));
    const age = int(1, 90); const status = age > 45 ? pick(['Paid', 'Paid', 'Overdue']) : age > 14 ? pick(['Paid', 'Sent']) : pick(['Sent', 'Draft']);
    return { id: `INV-${2041 - i}`, customer: co, amount, display: fmt(amount), issued: day(age), due: day(age - 30), status };
  }),
  orders: () => Array.from({ length: rows }, (_, i) => {
    const p = person(); const items = int(1, 4); const total = money(Array.from({ length: items }, () => pick([18.5, 24, 38, 46, 120, 64.99, 12.75])).reduce((a, b) => a + b, 0) + pick([0, 4.95, 9.95]));
    return { id: `#${10482 - i}`, customer: p.name, email: p.email, items, total, display: fmt(total), placed: day(int(0, 30)), status: pick(['Paid', 'Paid', 'Shipped', 'Shipped', 'Delivered', 'Refunded']) };
  }),
  series: () => {
    const n = +opt('points', '24'), base = +opt('base', '18000'), growth = +opt('growth', '0.04'), period = opt('period', 'month');
    let v = base;
    return Array.from({ length: n }, (_, i) => {
      const season = period === 'month' ? 1 + 0.06 * Math.sin(((i % 12) / 12) * Math.PI * 2 - 1) : period === 'day' ? ([0, 6].includes(new Date(Date.UTC(2026, 0, 1 + i)).getUTCDay()) ? 0.72 : 1) : 1;
      v = v * (1 + growth * between(0.2, 1.8));
      const label = period === 'month' ? `${MON[i % 12]} ${String(25 + Math.floor(i / 12)).padStart(2, '0')}` : period === 'week' ? `W${(i % 52) + 1}` : new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
      return { x: label, value: Math.round(v * season * between(0.97, 1.03)) };
    });
  },
  revenue: () => {
    const plans = [['Starter', 2400, 0.01], ['Team', 9800, 0.045], ['Scale', 6200, 0.03]];
    return Array.from({ length: 12 }, (_, i) => ({ month: MON[i], ...Object.fromEntries(plans.map(([p, b, g]) => [p, Math.round(b * (1 + g) ** i * between(0.97, 1.04))])) }));
  },
  funnel: () => { let n = int(18000, 26000); return ['Visited pricing', 'Started sign-up', 'Verified email', 'Connected data', 'Invited a teammate', 'Paid'].map((step, i) => { if (i) n = Math.round(n * [0, 0.31, 0.82, 0.54, 0.47, 0.38][i] * between(0.94, 1.06)); return { step, people: n }; }); },
  cohort: () => Array.from({ length: Math.min(rows, 12) }, (_, i) => {
    const size = int(380, 920); let r = 1;
    const weeks = Array.from({ length: 12 - i }, (_, w) => { if (w) r *= w === 1 ? between(0.52, 0.62) : between(0.9, 0.97); return Math.round(r * 1000) / 10; });
    return { cohort: (() => { const d = new Date(Date.UTC(2026, 8, 1 + i * 7)); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]}`; })(), size, retention: weeks };
  }),
  events: () => Array.from({ length: rows }, (_, i) => {
    const level = pick(['info', 'info', 'info', 'info', 'warn', 'error']);
    const svc = pick(['api', 'ingest', 'alerts', 'exports', 'auth']);
    const msg = { info: [`GET /v1/reports/${int(1000, 9999)} 200 in ${int(18, 240)} ms`, `Processed batch of ${int(200, 5000)} events`, `Sent digest to ${int(3, 40)} people`], warn: [`Slow query: ${int(800, 2400)} ms on events_daily`, `Retrying webhook to ${pick(COMPANIES)[1]} (attempt ${int(2, 4)})`], error: [`Webhook to ${pick(COMPANIES)[1]} failed: 503`, `Export ${int(100, 999)} timed out after 30 s`] }[level];
    return { time: new Date(Date.UTC(2026, 10, 24, 14, 5) - i * int(4, 90) * 1000).toISOString(), level, service: svc, message: pick(msg) };
  }),
};

if (!gen[kind]) {
  console.error('Usage: node scripts/sample-data.mjs <users|invoices|orders|series|revenue|funnel|cohort|events> [--rows n] [--seed n] [--format json|csv] [--currency £]');
  process.exit(kind === 'help' ? 0 : 2);
}
const data = gen[kind]();
if (format === 'csv') {
  const flat = data.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Array.isArray(v) ? v.join(' ') : v])));
  const cols = Object.keys(flat[0]);
  const esc = (v) => { const t = String(v); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  console.log([cols.join(','), ...flat.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n'));
} else console.log(JSON.stringify(data, null, 2));
