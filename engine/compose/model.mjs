// The page model for pages that are not a marketing story: what the product keeps lists of (bookings,
// orders, jobs), the fields people scan in those lists, the statuses a record moves through, the plans and
// their prices, the things in a basket, the services on a status page, the releases in a changelog, and the
// flow of an app's screens with the words for its empty, loading and error states. Every name comes from the
// brief; where the brief is silent the model says so (`todo`), and the draft leaves that part out or marks it
// as sample data, never as a fact.
//
// Pure functions, no I/O.
import { listOf, readList } from './words.mjs';

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const words = (s) => String(s ?? '').split(/\s+/).filter(Boolean);
/** "bookings" → "booking", "classes" → "class", "deliveries" → "delivery". */
export function singular(w) {
  const s = String(w);
  if (/(ss|us|is)$/i.test(s)) return s;
  if (/ies$/i.test(s)) return s.replace(/ies$/i, 'y');
  if (/(ches|shes|sses|xes)$/i.test(s)) return s.replace(/es$/i, '');
  return s.replace(/s$/i, '');
}
/** "booking" → "bookings", "class" → "classes", "delivery" → "deliveries". */
export function plural(w) {
  const s = String(w);
  if (/s$/i.test(s) && !/(ss|us)$/i.test(s)) return s;
  if (/[^aeiou]y$/i.test(s)) return s.replace(/y$/i, 'ies');
  if (/(ch|sh|ss|x|z)$/i.test(s)) return `${s}es`;
  return `${s}s`;
}
const ofPhrase = (phrase) => { const ws = words(phrase); const last = ws.pop() ?? ''; return { one: [...ws, singular(last)].join(' '), many: [...ws, plural(last)].join(' ') }; };

/** What a field holds, from its name: money, a date, a status, a count, an email, a reference or a name. */
export function fieldKind(name) {
  const n = ` ${String(name).toLowerCase()} `;
  if (/\b(status|state|stage)\b/.test(n)) return 'status';
  if (/\b(price|amount|total|fee|fees|cost|revenue|value|balance|paid|spend|rate|budget|deposit|charge|mrr)\b/.test(n)) return 'money';
  if (/\b(e-?mail)\b/.test(n)) return 'email';
  if (/\b(phone|mobile|tel)\b/.test(n)) return 'phone';
  if (/\b(id|ref|reference|number|no|code)\b/.test(n)) return 'ref';
  if (/\b(date|day|when|due|created|updated|visit|deadline|start|starts|end|ends|booked|joined|placed|added|sent|opened|next|last|time|slot|arrival|departure|appointment)\b/.test(n)) return 'date';
  if (/\b(qty|quantity|count|seats|items|visits|nights|guests|people|units|stock|hours|minutes|streak|days|size|weight)\b/.test(n)) return 'count';
  return 'name';
}

// Plural nouns the product keeps lists of, read from the kind of product when the brief lists none.
const KIND_NOUN = [[/\bbooking/, 'bookings'], [/\bappointment/, 'appointments'], [/\binvoic/, 'invoices'], [/\bnote-taking|\bnotes?\b/, 'notes'], [/\bhabit/, 'habits'], [/\border/, 'orders'], [/\bschedul/, 'jobs'], [/\bhelpdesk|\bsupport/, 'conversations'], [/\bcrm\b/, 'contacts'], [/\bpayroll/, 'payslips'], [/\bbookkeeping|\baccounting/, 'transactions'], [/\brecruit|\bhiring/, 'candidates'], [/\binventory|\bstock/, 'products'], [/\bproject/, 'projects'], [/\btask/, 'tasks'], [/\bexpense/, 'expenses'], [/\bwebhook/, 'events'], [/\bshop|\bstore|\bfurniture|\bshop/, 'orders'], [/\bclinic|\bdentist|\bphysio/, 'appointments'], [/\bdelivery|\blogistics|\bcourier/, 'deliveries'], [/\bcoding agent|\bagent/, 'sessions']];
const PEOPLE = /\b(clients|customers|members|users|patients|people|contacts|candidates|students|guests|volunteers|staff)$/;
const NOT_RECORDS = /^(?:analytics|metrics|statistics|stats|insights|reports|reporting|page|pages|screen|screens|settings|members?|teams?|people|users?|days?|weeks?|months?|years?|details|options|plans?|prices?|features?|questions?|results?|things|ways|views|tabs|services|steps|notifications?|alerts?|status|statuses|states|stages|columns|fields)$/i;

/**
 * The records the product keeps: [{ one, many, fields: [{ name, kind }], fromBrief }]. The first is the page's
 * main list. Fields come from the brief ("bookings with dog, owner, date and status"); a record with none gets
 * a reference, a date and a status, marked as the draft's guess.
 */
export function recordsFrom(facts, { typeId = null } = {}) {
  const out = [];
  const add = (phrase, fields = null, fromBrief = true) => {
    const p = String(phrase).toLowerCase().replace(/^(?:all|your|their|the|our|new)\s+/, '').trim();
    if (!p || words(p).length > 3 || !/s$/.test(p) || NOT_RECORDS.test(words(p).pop())) return;
    const { one, many } = ofPhrase(p);
    const have = out.find((r) => r.many === many);
    if (have) { if (fields && !have.fields) have.fields = fields; return; }
    out.push({ one, many, fields, fromBrief });
  };
  for (const r of facts.records ?? []) add(r.name, r.fields);
  for (const l of facts.lists ?? []) if (/^(tracks|manages|lists|list of|keeps|stores|records|organises|organizes|handles|schedules|entities|objects|tabs|sections|about)$/.test(l.label)) for (const it of l.items) add(it);
  const b = ` ${String(facts.brief ?? '').toLowerCase()} `;
  for (const m of b.matchAll(/\b(?:list|table|admin|inbox|directory|board|log)\s+(?:of|for)\s+([a-z]+s)\b/g)) add(m[1]);
  // "accounts table with plan, region and status": the columns follow "with".
  for (const m of b.matchAll(/\b([a-z]+s)\s+(?:list|table|admin|board|log|inbox|dashboard)\b/g)) {
    const w = /^\s+with\s+(.+?)(?=,\s*(?:filter|sort|search|export|a|an|the)\b|[.;:]|\s*$)/.exec(b.slice(m.index + m[0].length));
    const cols = w ? readList(w[1], { max: 6 }).filter((c) => c.split(' ').length <= 3) : [];
    add(m[1], cols.length >= 2 ? cols : null);
  }
  // "add a client", "send the invoice": the object of each step is something the product keeps.
  for (const st of facts.steps ?? []) { const m = /^(?:add|create|send|book|log|track|pick|choose|invite|upload|record|enter|import)\s+(?:a|an|the|your|three|two)?\s*([a-z-]+)/i.exec(st); if (m && m[1].length > 3) add(plural(m[1].toLowerCase()), null, true); }
  if (!out.length) {
    const kind = String(facts.kind ?? '').toLowerCase();
    const hit = KIND_NOUN.find(([re]) => re.test(kind) || re.test(b));
    if (hit) add(hit[1], null, false);
  }
  for (const r of out) {
    const given = r.fields?.length >= 2;
    const fields = given ? r.fields : [];
    r.fieldsFromBrief = given;
    r.fields = fields.map((f) => ({ name: f, kind: fieldKind(f) }));
    if (!given) r.fields = [{ name: cap(r.one), kind: 'ref' }, { name: 'Added', kind: 'date' }, { name: 'Status', kind: 'status' }];
    // Every list leads with what identifies the record: a reference, unless the records are people.
    if (r.fields[0].kind !== 'ref' && !(PEOPLE.test(r.many) && r.fields[0].kind === 'name')) r.fields.unshift({ name: cap(r.one), kind: 'ref' });
  }
  return out;
}

/** The statuses a record moves through: the brief's ("status: paid, shipped, delivered"), else ones the record's name implies. */
export function statusesFor(rec, facts) {
  const given = listOf(facts, /^(status|statuses|states|stages)$/);
  if (given.length >= 2) return { list: given.map(cap), fromBrief: true };
  const n = rec?.many ?? '';
  const list = /booking|appointment|session|class|visit|reservation/.test(n) ? ['Booked', 'Done', 'Cancelled']
    : /order|deliver|parcel|shipment/.test(n) ? ['Paid', 'Shipped', 'Delivered']
    : /invoice|bill|payment/.test(n) ? ['Draft', 'Sent', 'Paid', 'Overdue']
    : /job|task|ticket|issue|conversation|request/.test(n) ? ['Open', 'In progress', 'Done']
    : /habit|goal/.test(n) ? ['On track', 'Missed', 'Paused']
    : ['Active', 'Paused', 'Archived'];
  return { list, fromBrief: false };
}
/** The tone of a status badge: done and paid are good, late and failed are bad, the rest neutral. */
export const statusTone = (s) => (/\b(done|paid|delivered|active|on track|operational|working|complete|completed|sent|shipped|booked|resolved|live|approved)\b/i.test(s) ? 'positive' : /\b(overdue|failed|cancel|refund|missed|outage|declined|late|blocked|error|churn)/i.test(s) ? 'negative' : /\b(draft|paused|pending|waiting|degraded|in progress|open|invited|new)\b/i.test(s) ? 'warning' : '');

const MONEY = '[£$€]\\d{1,3}(?:,\\d{3})*(?:\\.\\d{1,2})?';
/**
 * Plans with their prices, as the brief names them: "Free for 10,000 events a month, Pro £29 a month for…".
 * One price and no names is one plan (never three invented tiers); "£8 a month or £80 a year" gives it both.
 */
export function plansFrom(facts, { product = null } = {}) {
  const b = ` ${facts.brief ?? ''} `;
  const SKIP = new Set(['Pricing', 'Page', 'Plans', 'Plan', 'Prices', 'For', 'The', 'A', 'An', 'Monthly', 'Annual', 'Yearly', 'Every', 'Each', 'All', 'Both', 'UK', 'EU', 'US', product ?? '']);
  const named = [];
  const re = new RegExp(`\\b(Free|[A-Z][a-zA-Z]+(?:\\s[A-Z][a-zA-Z]+)?)(?:\\s+(?:plan|tier))?(?:\\s*(?:at|is|costs?|:|—|-))?\\s+(?:(free)\\b|(${MONEY})(?:\\s+(?:a|per)\\s+(month|year|week|seat|user|person)(?:\\s+(?:per|a)\\s+(seat|user|person|month))?)?)`, 'g');
  for (const m of b.matchAll(re)) {
    const name = m[1].trim();
    if (SKIP.has(name) || SKIP.has(name.split(' ')[0])) continue;
    const isFree = /^free$/i.test(name) || !!m[2];
    if (!isFree && !m[3]) continue;
    named.push({ name: /^free$/i.test(name) ? 'Free' : name, price: isFree ? null : m[3], free: isFree, per: m[4] ?? (isFree ? null : null), unit: m[5] ?? null, at: m.index, end: m.index + m[0].length });
  }
  // "per person a month": the person is the unit, the month the period.
  for (const p of named) if (/^(person|seat|user)$/.test(p.per ?? '')) { const u = p.per; p.per = p.unit === 'month' || !p.unit ? 'month' : p.unit; p.unit = u; }
  // "Plus £6 a month or £60 a year": the yearly price belongs to the plan before it.
  for (const p of named) { const y = new RegExp(`^\\s*(?:,\\s*)?or\\s+(${MONEY})\\s+(?:a|per)\\s+year`).exec(b.slice(p.end)); if (y && !p.free) { p.annual = y[1]; p.end += y[0].length; } }
  // "free plan" in lower case, as people write it.
  if (!named.some((p) => p.free)) { const f = /\b(?:a\s+)?free\s+(?:plan|tier)\b/i.exec(b); if (f) named.push({ name: 'Free', price: null, free: true, per: null, unit: null, at: f.index, end: f.index + f[0].length }); }
  // A plan named "Free" alone, with what it includes: "Free for 10,000 events a month".
  if (!named.some((p) => p.free)) { const f = /\b(?:a\s+)?(Free)(?:\s+(?:plan|tier))?\s+(?:for|with|includes?)\s/.exec(b); if (f) named.push({ name: 'Free', price: null, free: true, per: null, unit: null, at: f.index, end: f.index + f[0].indexOf('Free') + 4 }); }
  named.sort((x, y) => x.at - y.at);
  const featuresAfter = (from, to) => {
    const seg = b.slice(from, to);
    const m = /^\s*(?:(?:a|per)\s+\w+\s+)?(?:for|with|includes?|including|and)\s+(.+)$/i.exec(seg);
    return m ? readList(m[1].replace(/,\s*$/, ''), { max: 6 }).filter((x) => !/^(free|pro|scale|team)$/i.test(x)) : [];
  };
  if (named.length >= 2 || (named.length === 1 && !named[0].free)) {
    return named.map((p, k) => ({ ...p, features: featuresAfter(p.end, named[k + 1]?.at ?? b.length) }));
  }
  // One price (or a monthly and a yearly one) and no names: one plan, called by the product's name.
  const month = facts.prices.find((p) => /\s(a|per)\s+month/.test(p.value));
  const year = facts.prices.find((p) => /\s(a|per)\s+year/.test(p.value));
  const one = month ?? year ?? facts.prices.find((p) => !/deliver|shipping|postage/i.test(p.what ?? '')) ?? null;
  if (!one && !named.length) return [];
  const unit = /\bper\s+(person|seat|user)\b/i.exec(b)?.[1] ?? null;
  const features = listOf(facts, /^(includes|features|with|every plan|includes:)$/);
  const plans = [];
  if (named.length === 1) plans.push({ ...named[0], features: featuresAfter(named[0].end, b.length) });
  if (one) plans.push({ name: product ?? 'One plan', price: (month ?? one).value.replace(/\s.*$/, ''), annual: year && month ? year.value.replace(/\s.*$/, '') : null, per: month ? 'month' : year ? 'year' : null, unit, free: false, features });
  return plans;
}

/** The things in a basket: "an oak side table £120, two linen cushion covers at £18.50 each", and the delivery options. */
export function basketFrom(facts) {
  const b = ` ${facts.brief ?? ''} `;
  const NUM = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
  const items = [], delivery = [];
  let freeOver = null;
  for (const m of b.matchAll(new RegExp(`(${MONEY})(\\s+each)?`, 'g'))) {
    const before = b.slice(0, m.index);
    const clause = before.slice(Math.max(before.lastIndexOf(','), before.lastIndexOf(':'), before.lastIndexOf(';')) + 1).trim().replace(/\s+(?:at|for|costs?|is)\s*$/i, '').trim();
    const price = Number(m[1].replace(/[^\d.]/g, ''));
    if (/\bover\s*$/i.test(clause) && /deliver|shipping|postage/i.test(clause)) { freeOver = m[1]; continue; }
    if (/deliver|shipping|postage|courier|next day|collect/i.test(clause)) { delivery.push({ name: cap(clause.replace(/^(?:a|an|the)\s+/i, '')), price, display: m[1] }); continue; }
    const q = /^(\d+|a|an|one|two|three|four|five|six)\s+(.+)$/i.exec(clause);
    const qty = q ? (Number(q[1]) || NUM[q[1].toLowerCase()] || 1) : 1;
    const name = (q ? q[2] : clause).replace(/^(?:of\s+)?/i, '');
    if (!name || words(name).length > 6) continue;
    items.push({ name: cap(qty > 1 ? singularPhrase(name) : name), qty, price, display: m[1] });
  }
  const sym = /[£$€]/.exec(b)?.[0] ?? '£';
  return { items, delivery, freeOver, sym };
}
const singularPhrase = (s) => { const ws = words(s); return [...ws.slice(0, -1), singular(ws[ws.length - 1])].join(' '); };

/** Services a status page reports on: the brief's list, else the records' and claims' nouns. */
export function servicesFrom(facts, { product = null } = {}) {
  const given = listOf(facts, /^(services|systems|components|parts|regions|apis|products)$/);
  if (given.length) return { list: given.map(cap), fromBrief: true };
  // "status page: API, dashboard, webhooks and email services": the list before the word "services".
  const before = /(?::|\bfor)\s*([^:;]+?)\s+(?:services|systems|components)\b/i.exec(String(facts.brief ?? ''));
  if (before) {
    const items = before[1].split(/,\s*|\s+and\s+/).map((x) => x.trim()).filter((x) => x && x.split(' ').length <= 3);
    if (items.length >= 2) return { list: items.map((x) => (/^[a-z]+$/.test(x) && x.length <= 4 ? x.toUpperCase() : cap(x))), fromBrief: true };
  }
  return { list: [product ?? 'The service'], fromBrief: false };
}

/** Releases written in the brief: "v2.4 added shared folders, v2.3 fixed slow search". */
export function releasesFrom(facts) {
  const b = ` ${facts.brief ?? ''} `;
  const out = [];
  for (const m of b.matchAll(/\b(v?\d+\.\d+(?:\.\d+)?)\s*(?:\(([^)]+)\))?\s+(added|adds|brings|brought|fixed|fixes|improved|improves|made|makes|changed|changes|removed|removes)\s+([^,;.]+)/gi)) {
    const verb = m[3].toLowerCase();
    const tag = /^fix/.test(verb) ? 'fixed' : /^(improv|made|make|chang)/.test(verb) ? 'improved' : /^remov/.test(verb) ? 'improved' : 'new';
    out.push({ version: m[1].startsWith('v') ? m[1] : `v${m[1]}`, date: m[2] ?? null, tag, title: cap(m[4].trim()), verb });
  }
  return out;
}

/** The product's features as the brief lists them ("includes …", "features: …"), else its claims. */
export function featuresFrom(facts) {
  const given = listOf(facts, /^(includes|features|with)$/);
  if (given.length) return given.map(cap);
  return [...facts.claims.map(cap), ...facts.offers.map(cap)];
}

/** Options a buyer chooses: "glazes: sea green, oat and slate", "sizes: S, M and L". */
export function optionsFrom(facts) {
  return (facts.lists ?? []).filter((l) => /^(options?|sizes?|colou?rs?|glazes?|finish(es)?|flavou?rs?|grinds?|materials?|fits?|lengths?|weights?|styles?)$/.test(l.label) && l.items.length >= 2).map((l) => ({ label: cap(singular(l.label)), values: l.items.map(cap) }));
}

/**
 * The model behind a page that is not a marketing story. `todo` lists what the brief left out.
 * @param {any} facts from extractFacts
 * @param {{ product?: string|null, typeId: string }} opts
 */
export function pageModel(facts, { product = null, typeId }) {
  const records = recordsFrom(facts, { typeId });
  // An inbox keeps conversations, whatever they are about.
  if (typeId === 'inbox' && !records.some((r) => r.many === 'conversations')) records.unshift({ one: 'conversation', many: 'conversations', fields: [{ name: 'Conversation', kind: 'ref' }, { name: 'Added', kind: 'date' }, { name: 'Status', kind: 'status' }], fromBrief: false, fieldsFromBrief: false });
  const main = records[0] ?? { one: 'record', many: 'records', fields: [{ name: 'Record', kind: 'ref' }, { name: 'Added', kind: 'date' }, { name: 'Status', kind: 'status' }], fromBrief: false, fieldsFromBrief: false };
  const status = statusesFor(main, facts);
  const sym = /[£$€]/.exec(facts.brief ?? '')?.[0] ?? '£';
  const todo = [];
  const app = ['dashboard', 'admin-table', 'settings', 'inbox', 'mobile-app', 'app-phone', 'workspace', 'ai-chat', 'agent-app', 'directory'].includes(typeId);
  if (app && !records.length) todo.push('what the product keeps a list of (bookings, orders, jobs…), in its own word');
  if (app && !main.fieldsFromBrief && ['dashboard', 'admin-table', 'workspace', 'mobile-app', 'app-phone'].includes(typeId)) todo.push(`the columns people scan in the ${main.many} list (for example: "${main.many} with name, date, amount and status")`);
  if (app && !status.fromBrief && typeId !== 'inbox' && main.fields.some((f) => f.kind === 'status')) todo.push(`the statuses a ${main.one} moves through (the draft uses ${status.list.join(', ')})`);
  return { product, records, main, status, sym, todo, features: featuresFrom(facts) };
}

/**
 * An app planned as a flow: the screens from the first run to settings, the words for the empty, loading
 * and error states, and which screens the draft builds. App page types only.
 */
export function appFlow(m, facts, { typeId, product = null }) {
  const { main } = m;
  const name = product ?? 'the app';
  const Many = cap(main.many), One = cap(main.one);
  const first = facts.steps[0] ? cap(facts.steps[0]) : `Add your first ${main.one}`;
  const newOne = facts.steps[0] && /^(add|create|book|log|new|send|invite)\b/i.test(facts.steps[0]) ? cap(facts.steps[0].replace(/\b(?:your\s+)?first\s+/i, '')) : `New ${main.one}`;
  const phone = ['mobile-app', 'app-phone'].includes(typeId);
  const screens = [
    { id: 'start', name: phone ? 'Welcome' : 'First run', what: `${first}: one choice per screen, no tour. ${name} is useful after this one step.`, build: phone || typeId === 'workspace' },
    { id: 'home', name: phone ? (facts.days ? 'Today' : Many) : Many, what: `The first useful screen: the ${main.many} list${main.fieldsFromBrief ? ` with ${main.fields.slice(1, 4).map((f) => f.name).join(', ')}` : ''}, newest or soonest first, and ${newOne} as the one action.`, build: true },
    { id: 'detail', name: `One ${main.one}`, what: `Everything about one ${main.one}: ${main.fields.map((f) => f.name.toLowerCase()).join(', ')}, and what can be done to it next${m.status.list.length ? ` (${m.status.list.join(' → ')})` : ''}.`, build: phone || ['admin-table', 'workspace', 'dashboard', 'inbox'].includes(typeId) },
    { id: 'settings', name: 'Settings', what: `What ${name} tells you about (new and changed ${main.many}), your details, and leaving.`, build: phone || typeId === 'settings' },
  ];
  const states = {
    empty: { title: `No ${main.many} yet`, body: facts.steps[0] ? `${cap(facts.steps[0])} and it shows here.` : `${Many} you add show here, newest first.`, action: newOne },
    loading: { label: `Loading ${main.many}`, how: `A skeleton of the ${main.many} list in the same layout, never a spinner on a blank page.` },
    error: { title: `${Many} could not load`, body: `${product ?? 'We'} could not reach your ${main.many}. Nothing you typed is lost.`, action: 'Try again' },
  };
  return { screens, states, newOne, first };
}
