// Small markup helpers for drafts of pages that are not a marketing story: icons, sample rows labelled with
// the brief's own nouns, page states, and the sidebar every app screen shares. They write the kit's own
// markup (the same classes and data-parts the blueprints use), so components and page styles apply as is.
//
// Pure functions, no I/O.
import { esc } from './draft.mjs';
import { statusTone, singular, plansFrom } from './model.mjs';

export const cap = (s) => (s ? String(s)[0].toUpperCase() + String(s).slice(1) : s);
export { esc };

const P = {
  play: '<path d="M8 5.5v13l10.5-6.5Z"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  next: '<path d="m9 6 6 6-6 6"/>',
  back: '<path d="m15 6-6 6 6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  doc: '<path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-10Z"/><path d="M14 3.5v5h5"/>',
  alert: '<path d="M10.3 4.3 2.9 17.2A2 2 0 0 0 4.6 20h14.8a2 2 0 0 0 1.7-2.8L13.7 4.3a2 2 0 0 0-3.4 0Z"/><path d="M12 9.5v4M12 17h.01"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.6L20 8.5M20 4v4.5h-4.5"/>',
  bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15ZM10 20.5a2 2 0 0 0 4 0"/>',
  folder: '<path d="M3.5 7a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z"/>',
  more: '<circle cx="5.5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="18.5" cy="12" r="1"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/>',
  lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  users: '<circle cx="9" cy="8" r="3.25"/><path d="M3 20a6 6 0 0 1 12 0M16 4.8a3.25 3.25 0 0 1 0 6.4M17.5 14.2A6 6 0 0 1 21 20"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  card: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h3"/>',
  layers: '<path d="m12 4 8.5 4.5L12 13 3.5 8.5Z"/><path d="m3.5 12.5 8.5 4.5 8.5-4.5M3.5 16.5 12 21l8.5-4.5"/>',
  home: '<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1Z"/>',
  chart: '<path d="M4 20V4M4 20h16M8.5 16v-5M13 16V8M17.5 16v-3"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>',
  inbox: '<path d="M3.5 13.5 6 5.5h12l2.5 8V18a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z"/><path d="M3.5 13.5H8l1.5 2.5h5l1.5-2.5h4.5"/>',
  trash: '<path d="M4.5 7h15M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 1.8h6a2 2 0 0 0 2-1.8L18 7M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19h14"/>',
  send: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  ok: '<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.3 2.4 2.4 4.6-4.9"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
  chat: '<path d="M5 18.5V6.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8Z"/>',
  terminal: '<rect x="3" y="4.5" width="18" height="15" rx="2"/><path d="m7 9.5 3 2.5-3 2.5M12.5 15H17"/>',
  book: '<path d="M4.5 5.5A2 2 0 0 1 6.5 3.5H19.5v15H6.5a2 2 0 0 0-2 2Z"/><path d="M4.5 20.5a2 2 0 0 1 2-2h13v2Z"/>',
  filter: '<path d="M4 5h16l-6 7.5V19l-4 1.5v-8Z"/>',
  minus: '<path d="M5 12h14"/>',
  out: '<path d="M9 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3M16 16l4-4-4-4M20 12H9"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/>',
};
/** The kit's line icon: 24px grid, 1.5 stroke, hidden from screen readers. */
export const icon = (name, size = 16) => `<svg class="lt-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] ?? P.doc}</svg>`;
/** An icon for a record by its name: people, money, dates, messages, documents. */
export const iconFor = (noun) => { const n = String(noun).toLowerCase(); return /client|customer|owner|member|user|patient|people|contact|candidate|staff|team|groomer|cleaner/.test(n) ? 'users' : /payment|invoice|bill|transaction|expense|order|sale|payslip/.test(n) ? 'card' : /booking|appointment|job|shift|schedule|event|session|class|visit/.test(n) ? 'calendar' : /conversation|message|ticket|chat/.test(n) ? 'chat' : /habit|goal|streak/.test(n) ? 'ok' : /report|overview|dashboard/.test(n) ? 'chart' : 'doc'; };

export const badge = (s, { dot = true } = {}) => { const t = statusTone(s); return `<span class="lt-badge"${t ? ` data-tone="${t}"` : ''}${dot ? ' data-dot' : ''}>${esc(s)}</span>`; };
const pad = (n) => String(n).padStart(2, '0');
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const shortDate = (iso) => { const d = new Date(`${iso}T12:00:00Z`); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]}`; };
export const money = (sym, n) => `${sym}${Number(n).toLocaleString('en-GB', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const STAFF = /\b(groomer|cleaner|staff|assignee|agent|stylist|therapist|tutor|teacher|driver|lead|partner|vet|dentist|nurse|coach|trainer|engineer|owner of)\b/i;

/**
 * Sample rows for a record, labelled with the brief's own nouns: "Client 01", "Booking #1040". Figures and
 * dates come from the kit's seeded sample data (scripts/sample-data.mjs); nothing is a real customer.
 * @returns {Array<{ cells: Array<{ text: string, kind: string, v: number|string }>, status: string|null, search: string, title: string }>}
 */
// Made-up names for a work app's sample rows, so a list reads like a day's work: animals by a pet's name, people
// by a person's. None is a real customer, none is any blueprint's; the rows are still marked data-sample.
const PETS = ['Juno', 'Mabel', 'Otis', 'Pickle', 'Rolo', 'Sully', 'Tilly', 'Waffle', 'Clover', 'Dexter', 'Fudge', 'Ginger', 'Hazel', 'Nutmeg', 'Gus', 'Esme'];
const FOLK = ['Hattie Moran', 'Idris Penn', 'Joan Ashby', 'Lena Voss', 'Marek Novak', 'Ottilie Shaw', 'Ravi Bassi', 'Sian Lloyd', 'Theo Grant', 'Una Bell', 'Viv Carter', 'Will Dacre', 'Esme Fenwick', 'Gus Halloran', 'Ada Penrose', 'Cal Whitby'];
const PET = /\b(dog|dogs|cat|cats|pet|pets|puppy|puppies|horse|horses|animal|animals)\b/i;
const FOLKS = /\b(owner|owners|client|clients|customer|customers|patient|patients|member|members|guest|guests|tenant|tenants|student|students|parent|parents|contact|contacts)\b/i;

/** opts.named: animals and people get made-up names instead of "Dog 01" (a work app, read like a real day). */
export function sampleRows(rec, n, ctx, { named = false } = {}) {
  const inv = ctx.sample('invoices', { rows: n }) ?? [];
  const ord = ctx.sample('orders', { rows: n }) ?? [];
  const statuses = ctx.m.status.list;
  const base = ctx.facts.prices.map((p) => Number(String(p.value).replace(/[^\d.]/g, ''))).find((x) => x > 0) ?? null;
  const people = ctx.facts.people.map((p) => p.name);
  const rows = [];
  for (let i = 0; i < n; i++) {
    const r = inv[i % (inv.length || 1)] ?? {};
    const o = ord[i % (ord.length || 1)] ?? {};
    // Statuses spread like real lists: most rows in the first two, a few in the rest.
    const st = statuses[[0, 0, 1, 0, 1, 0, 2, 0, 1, 3, 0, 1][i % 12] % statuses.length];
    const cells = rec.fields.map((f, k) => {
      const nm = f.name;
      if (f.kind === 'ref') { const v = 1040 - i; return { text: `${cap(rec.one)} #${v}`, kind: f.kind, v }; }
      if (f.kind === 'status') return { text: st, kind: f.kind, v: st };
      if (f.kind === 'money') { const amt = base ? Math.round(base * (0.7 + ((r.amount ?? 100) % 97) / 160) * 100) / 100 : /order|sale|basket/.test(rec.many) ? o.total ?? 0 : Math.round((20 + ((r.amount ?? 100) % 180)) * 100) / 100; return { text: money(ctx.m.sym, amt), kind: f.kind, v: amt }; }
      if (f.kind === 'date') { const iso = /time|slot|start|ends?/i.test(nm) && !/date/i.test(nm) ? null : (r.issued ?? '2026-11-24'); if (!iso) { const h = 8 + ((i * 5) % 10), mm = (i * 15) % 60; return { text: `${pad(h)}:${pad(mm)}`, kind: 'time', v: h * 60 + mm }; } return { text: shortDate(iso), kind: f.kind, v: iso }; }
      if (f.kind === 'count') { const v = o.items ?? ((i % 4) + 1); return { text: String(v), kind: f.kind, v }; }
      if (f.kind === 'email' || f.kind === 'phone') return { text: '—', kind: f.kind, v: '' };
      // Common columns with a handful of believable values: a plan, a region, a country, a city, a channel, a size.
      const pool = /^plans?$|\btier\b/i.test(nm) ? (() => { const ps = plansFrom(ctx.facts, { product: ctx.product }).map((p) => p.name).filter((x) => x && x !== ctx.product); return ps.length >= 2 ? ps : ['Starter', 'Team', 'Scale']; })()
        : /\bregions?\b/i.test(nm) ? ['UK', 'Europe', 'North America', 'Asia Pacific']
        : /\bcountr(y|ies)\b/i.test(nm) ? ['United Kingdom', 'Ireland', 'Germany', 'Netherlands', 'France']
        : /\bcit(y|ies)\b/i.test(nm) ? ['Leeds', 'Bristol', 'Glasgow', 'Cardiff', 'York']
        : /\b(channel|source)\b/i.test(nm) ? ['Search', 'Referral', 'Direct', 'Email']
        : /\bsize\b/i.test(nm) ? ['Small', 'Medium', 'Large'] : null;
      if (pool) { const v = pool[[0, 1, 0, 2, 1, 0, 3, 1, 0, 2][i % 10] % pool.length]; return { text: v, kind: 'name', v }; }
      // A name field: the brief's own people for a staff role, else the field's noun and a number.
      if (STAFF.test(nm) && people.length) { const p = people[i % people.length]; return { text: p, kind: 'name', v: p }; }
      if (named && PET.test(nm)) { const p = PETS[(i * 5 + k) % PETS.length]; return { text: p, kind: 'name', v: p }; }
      if (named && FOLKS.test(nm)) { const p = FOLK[(i * 7 + k) % FOLK.length]; return { text: p, kind: 'name', v: p }; }
      return { text: `${cap(singular(nm))} ${pad(i + 1)}`, kind: 'name', v: i };
    });
    const title = cells[0].text;
    rows.push({ cells, status: cells.find((c) => c.kind === 'status')?.text ?? null, title, search: cells.map((c) => c.text).join(' ').toLowerCase() });
  }
  return rows;
}
/** A table cell for a sample value. */
export const cellHtml = (c) => (c.kind === 'status' ? `<td data-k="status">${badge(c.text)}</td>` : ['money', 'count'].includes(c.kind) ? `<td data-num data-v="${esc(c.v)}">${esc(c.text)}</td>` : `<td${c.kind === 'date' || c.kind === 'time' ? ' class="lt-num"' : ''}>${esc(c.text)}</td>`);
/** The fields of a row, for its detail drawer. */
export const detailJson = (rec, row) => esc(JSON.stringify({ title: row.title, fields: rec.fields.map((f, k) => [cap(f.name), row.cells[k].text]).slice(1) }));

/** The three states every list screen ships, in the brief's words. */
export function statesHtml(flow, { cls = '', headingTag = 'h2', id = 'st', skeleton = '' } = {}) {
  const { empty, loading, error } = flow.states;
  return `<div class="${cls}" data-view="loading" aria-busy="true" aria-label="${esc(loading.label)}" hidden>${skeleton || Array.from({ length: 6 }, (_, i) => `<span class="lt-skeleton" style="height: 18px; width: ${[92, 78, 86, 64, 90, 72][i]}%"></span>`).join('')}</div>
      <section class="lt-empty ${cls}" data-view="empty" aria-labelledby="${id}-empty-h" hidden>
        <span data-part="icon" aria-hidden="true">${icon('folder', 24)}</span>
        <${headingTag} id="${id}-empty-h">${esc(empty.title)}</${headingTag}>
        <p>${esc(empty.body)}</p>
        <div data-part="actions"><button type="button" class="lt-btn" data-variant="secondary" data-set-state="ready">${icon('plus')}<span data-part="label">${esc(empty.action)}</span></button></div>
      </section>
      <section class="lt-empty ${cls}" data-view="error" aria-labelledby="${id}-error-h" hidden>
        <span data-part="icon" aria-hidden="true">${icon('alert', 24)}</span>
        <${headingTag} id="${id}-error-h">${esc(error.title)}</${headingTag}>
        <p>${esc(error.body)}</p>
        <div data-part="actions"><button type="button" class="lt-btn" data-variant="secondary" data-set-state="ready">${icon('refresh')}<span data-part="label">${esc(error.action)}</span></button></div>
      </section>`;
}

/** The app sidebar: the product's name and its records as the main destinations. */
export function sidebar(ctx, { current = 0, extra = [] } = {}) {
  const name = ctx.product ?? cap(ctx.facts.kind ?? 'Workspace');
  const recs = ctx.m.records.length ? ctx.m.records : [ctx.m.main];
  const items = [{ label: 'Overview', icon: 'home', href: '#main' }, ...recs.slice(0, 4).map((r) => ({ label: cap(r.many), icon: iconFor(r.many), href: '#main' })), ...extra];
  return `<aside class="lt-sidebar" data-lt="app-sidebar" aria-label="${esc(name)}">
      <div data-part="head"><span data-part="ws" aria-hidden="true">${esc(name[0].toUpperCase())}</span><span data-part="ws-name">${esc(name)}</span><button type="button" data-part="collapse" aria-expanded="true" aria-label="Collapse sidebar">${icon('back')}</button></div>
      <nav aria-label="Primary">
        <ul>
          ${items.map((it, k) => `<li><a href="${it.href}"${k === current ? ' aria-current="page"' : ''}>${icon(it.icon, 18)}<span>${esc(it.label)}</span></a></li>`).join('\n          ')}
        </ul>
        <ul>
          <li><a href="#main">${icon('gear', 18)}<span>Settings</span></a></li>
        </ul>
      </nav>
    </aside>`;
}

/** A text field in the kit's floating-label style. */
export const field = ({ id, label, type = 'text', required = true, value = '', auto = 'off', help = '', mode = '', extra = '' }) => `<div class="lt-field"><input id="${id}" type="${type}"${required ? ' required' : ''} placeholder=" "${value ? ` value="${esc(value)}"` : ''} autocomplete="${auto}" aria-describedby="${id}-m"${mode ? ` inputmode="${mode}"` : ''}${extra}><label for="${id}">${esc(label)}</label><span data-part="valid" aria-hidden="true">${icon('check')}</span><p id="${id}-m" data-part="message" data-help="${esc(help)}">${esc(help)}</p></div>`;
/** A switch row with a label and one line under it. */
export const switchRow = (name, label, sub, checked = true) => `<label class="lt-switch"><input type="checkbox" role="switch"${checked ? ' checked' : ''} name="${esc(name)}"><span data-part="track" aria-hidden="true"><span data-part="thumb"></span></span><span data-part="label">${esc(label)}${sub ? ` <small>${esc(sub)}</small>` : ''}</span></label>`;
/** A segmented control. */
export const segmented = (label, options, { id = '', attrs = '' } = {}) => `<div class="lt-segmented" data-lt="segmented-control" role="radiogroup" aria-label="${esc(label)}"${id ? ` id="${id}"` : ''}${attrs}><span data-part="indicator" aria-hidden="true"></span>${options.map((o, k) => `<button type="button" role="radio" aria-checked="${k === 0}" tabindex="${k === 0 ? 0 : -1}" data-value="${esc(o.value)}">${esc(o.label)}</button>`).join('')}</div>`;
