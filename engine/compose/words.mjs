// Words from the subject. Reads a one-line brief for the specific things a page should be built from:
// the kind of business, the place and street, prices, times, days, durations, counts and the claims the
// brief makes ("sends an invoice in 30 seconds"). The composer writes draft headlines and captions from
// these instead of sample filler; when the brief has none, it writes a marked TODO that asks for them.
// Nothing here invents a figure: every value returned is a substring of the brief.
//
// Pure functions, no I/O.

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY = `(?:${DAYS.join('|')})s?`;
const STREET = '(?:Lane|Street|Road|Row|Way|Square|Avenue|Hill|Place|Yard|Walk|Terrace|Parade|Quay|Wharf|Gate|Green|Close|Crescent|Market)';
const UNIT = '(?:second|minute|min|hour|day|week|month|year|night)s?';
const NUM_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12 };
// Words that end a noun phrase when reading forwards or backwards from a figure.
const STOP = new Set(['a', 'an', 'the', 'and', 'or', 'for', 'from', 'in', 'on', 'at', 'of', 'to', 'with', 'that', 'which', 'who', 'is', 'are', 'was', 'open', 'opens', 'gave', 'give', 'gives', 'sends', 'send', 'by', 'it', 'its', 'our', 'their', 'per', 'every', 'each', 'last', 'this', 'than', 'up', 'out', 'about', 'around', 'over', 'under', 'into', 'within', 'after', 'before']);
const VERBS = /^(?:sends?|chases?|builds?|building|makes?|making|sells?|selling|runs?|running|offers?|offering|gives?|gave|giving|helps?|tracks?|books?|keeps?|turns?|lets?|finds?|shows?|writes?|reads?|bakes?|baking|roasts?|roasting|serves?|serving|fixes?|fixing|teaches?|teaching|cuts?|plans?|pays?|pay|files?|repairs?|repairing|installs?|installing|delivers?|delivering|cooks?|brews?|designs?|designing|grows?|ships?|takes?|handles?|checks?|answers?|collects?|stores?|syncs?|feeds?|buys?|covers?|reconciles?|match(?:es)?|matching)$/i;

const clean = (s) => s.replace(/\s+/g, ' ').replace(/^[\s,;:.-]+|[\s,;:.-]+$/g, '').trim();
const words = (s) => s.split(/\s+/).filter(Boolean);

/** A noun phrase read backwards from position `end` in the brief: "loaves" in "loaves from £4.20". */
function nounBefore(brief, end, max = 4) {
  const ws = words(brief.slice(0, end).replace(/[,;:.()]+\s*$/, ''));
  const out = [];
  for (let i = ws.length - 1; i >= 0 && out.length < max; i--) {
    const w = ws[i].replace(/[,;:.()]+$/, '');
    if (/[,;:.()]$/.test(ws[i]) && out.length) break;
    if (STOP.has(w.toLowerCase())) { if (out.length) break; continue; }
    if (/\d/.test(w) || VERBS.test(w) || /^[A-Z]/.test(w) && out.length === 0 && i > 0 && !/^[A-Z][a-z]+$/.test(w)) break;
    out.unshift(w);
    if (/[,;:.()]/.test(ws[i - 1] ?? '')) break;
  }
  return clean(out.join(' '));
}
/** A noun phrase read forwards from `start`: "single-storey extension" in "£40,000 single-storey extension in 12 weeks". */
function nounAfter(brief, start, max = 4) {
  const ws = words(brief.slice(start));
  const out = [];
  for (const raw of ws) {
    const w = raw.replace(/[,;:.()]+$/, '');
    if (!w || STOP.has(w.toLowerCase()) || /^\d/.test(w) || VERBS.test(w) || out.length >= max) break;
    out.push(w);
    if (/[,;:.()]$/.test(raw)) break;
  }
  return clean(out.join(' '));
}
const lowerFirst = (s) => (/^[A-Z][a-z]/.test(s) && !DAYS.some((d) => s.startsWith(d)) ? s[0].toLowerCase() + s.slice(1) : s);

/**
 * Everything specific a brief says, each value exactly as written.
 * @param {string} brief
 * @param {{ product?: string | null }} [opts]
 */
export function extractFacts(brief, { product = null } = {}) {
  const b = ` ${String(brief ?? '').replace(/\s+/g, ' ').trim()} `;
  const facts = { brief: String(brief ?? '').trim(), name: product ?? null, kind: null, place: null, street: null, audience: null, prices: [], times: [], days: null, durations: [], counts: [], claims: [], offers: [], phone: null, email: null, postcode: null, building: null, people: [], steps: [], says: [], lists: [], records: [] };

  // The kind of business: "…, a sourdough bakery on Mill Lane" / "an invoicing tool for freelancers".
  const kindM = /,\s+(?:an?|the)\s+([a-z][\w'’-]*(?:\s+(?:[a-z][\w'’-]*|[A-Z]{2,4}s?)){0,4}?)(?=\s+(?:on|in|at|for|that|which|who|with|near|building|making|selling|run|based|offering|open)\b|[,.;]|\s*$)/.exec(b)
    ?? /\b(?:for|page for|site for|website for)\s+(?:an?|the)\s+([a-z][\w'’-]*(?:\s+[a-z][\w'’-]*){0,4}?)(?=\s+(?:on|in|at|for|that|which|who|with|near|building|making|selling|run|based|offering|open)\b|[,.;]|\s*$)/.exec(b);
  // Anchored on the name: "Kestrel Dental, family dentist on…", "Halyard Ferries: car and foot ferry from…",
  // "Moss Yard climbing and strength gym in…", or a brief that opens with the kind: "Sourdough bakery on…".
  const KSTOP = '(?:on|in|at|for|from|that|which|who|with|near|run|based|open|opening|every)';
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const anchored = (product && new RegExp(`^\\s*${esc(product)}(?:\\s+(?:API|SDK|App))?\\s*[,:]?\\s+([a-z][\\w'’-]*(?:\\s+[a-z][\\w'’-]*){0,4}?)(?=\\s+${KSTOP}\\b|\\s*[,.;:]|\\s*$)`).exec(b))
    || (!product && new RegExp(`^\\s*([A-Z][a-z][\\w'’-]*(?:\\s+[a-z][\\w'’-]*){0,3}?)(?=\\s+${KSTOP}\\b|\\s*[,;:])`).exec(b));
  // Not a kind of business: a verb phrase, a time, or the page itself ("bank app", "status page", "workspace settings").
  const plausible = (k) => k && !/\b(is|are|was|has|have|can|will)\b/.test(k) && !/^(first|week|month|year|day|calendar|thread|plan|training|today|this)\b/i.test(k) && !/\b(app|apps|page|settings|pricing|dashboard|website|site|homepage)$/i.test(k.trim());
  if (anchored && plausible(anchored[1].toLowerCase()) && !new RegExp(`^${KSTOP}\\b`).test(anchored[1])) facts.kind = clean(anchored[1].replace(/^./, (c) => c.toLowerCase()).replace(/^(?:a|an|the)\s+/, ''));
  else if (kindM && plausible(kindM[1])) facts.kind = clean(kindM[1]);
  // A route: "from Ardmore to Kestrel Isle".
  const routeM = /\bfrom\s+([A-Z][\w'’-]*(?:\s+[A-Z][\w'’-]*)*)\s+to\s+([A-Z][\w'’-]*(?:\s+[A-Z][\w'’-]*)*)/.exec(b);
  if (routeM) facts.route = { from: routeM[1], to: routeM[2] };

  const streetM = new RegExp(`\\b(?:on|at)\\s+((?:\\d+\\s+)?[A-Z][\\w'’-]*(?:\\s+[A-Z][\\w'’-]*)*\\s+${STREET})\\b`).exec(b)
    ?? new RegExp(`\\b(\\d+\\s+[A-Z][\\w'’-]*(?:\\s+[A-Z][\\w'’-]*)*\\s+${STREET})\\b`).exec(b);
  if (streetM) facts.street = streetM[1];
  // A numbered street without a street word, before a town and a postcode: "at 21 Gillygate, York YO31 7EA".
  if (!facts.street) { const m = /\bat\s+(\d+\s+[A-Z][\w'’-]*(?:\s+[A-Z][\w'’-]*){0,2}),\s+[A-Z][a-zA-Z'’-]+\s+[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/.exec(b); if (m) facts.street = m[1]; }
  // A place is a capitalised name after "in", that is not a month, a day or the product.
  for (const m of b.matchAll(/\bin\s+([A-Z][a-zA-Z'’-]+(?:\s+(?:upon|on|-on-)?\s*[A-Z][a-zA-Z'’-]+){0,2})/g)) {
    const p = m[1].trim();
    if (DAYS.includes(p) || /^(January|February|March|April|May|June|July|August|September|October|November|December)$/.test(p) || p === product) continue;
    facts.place = p; break;
  }
  const audM = /\bfor\s+((?:small\s+|independent\s+|busy\s+|local\s+)?[a-z]+(?:ers|ists|ants|ents|people|teams|families|parents|owners))\b/.exec(b);
  if (audM && !/^(a|an|the)$/.test(audM[1])) facts.audience = audM[1];

  // Contact details and the address, as written.
  facts.phone = /(?:\+44\s?\d{2,4}|\b0\d{2,4})[\s-]?\d{3,4}[\s-]?\d{3,4}\b/.exec(b)?.[0]?.trim() ?? null;
  facts.email = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/.exec(b)?.[0] ?? null;
  facts.postcode = /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/.exec(b)?.[0] ?? null;
  facts.building = /\bat\s+((?:St\.?\s)?[A-Z][\w'’]*(?:\s+[A-Z][\w'’]*){0,3}),\s+\d+\s+[A-Z]/.exec(b)?.[1] ?? null;
  // The town in the address ("21 Gillygate, York YO31 7EA") is the place, whatever else the brief says is "in"
  // somewhere ("beans roasted in Leeds").
  if (facts.street) { const town = new RegExp(`${facts.street.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')},\\s+([A-Z][a-zA-Z'’-]+)`).exec(b)?.[1] ?? null; if (town) facts.place = town; }
  // People named in the brief: "run by Nell and Owen Hart", "partners Ruth Harrow, Sam Finch and Priya Shah".
  const peopleM = /\b(run by|owned by|founded by|led by|partners(?: are)?|with partners)\s+((?:[A-Z][a-z'’-]+(?:\s[A-Z][a-z'’-]+)?)(?:(?:,\s*|\s+and\s+)[A-Z][a-z'’-]+(?:\s[A-Z][a-z'’-]+)?)*)/.exec(b);
  if (peopleM) {
    const role = /partner/.test(peopleM[1]) ? 'Partner' : /found/.test(peopleM[1]) ? 'Founder' : /led/.test(peopleM[1]) ? 'Lead' : 'Owner';
    let names = peopleM[2].split(/,\s*|\s+and\s+/).map((n) => n.trim()).filter(Boolean);
    // "Nell and Owen Hart": a first name alone shares the last name that follows it.
    const last = names[names.length - 1].split(' ').slice(1).join(' ');
    names = names.map((n) => (n.includes(' ') || !last ? n : `${n} ${last}`));
    facts.people = names.map((name) => ({ name, role }));
  }
  // Steps: "how it works: add a client, send the invoice, get paid" or "first …, then …, then …".
  const stepsM = /\b(?:how it works|the steps|steps|process)\s*:\s*(.+?)(?=\.\s|;|$)/i.exec(b) ?? /\bfirst\s+(.+?,\s*then\s+.+?)(?=\.\s|;|$)/i.exec(b);
  if (stepsM) {
    for (const part of stepsM[1].split(/,\s*(?:and\s+)?(?:then\s+)?|\s+then\s+/)) {
      const st = clean(part);
      if (!st || (/^(phone|call|tel|email)\b/i.test(st) || /^opens?\s+(?:on|from|at|every|daily|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d)/i.test(st)) || /\d{4,}/.test(st)) break;
      facts.steps.push(st);
    }
    if (facts.steps.length < 2) facts.steps = [];
  }
  // Prices: £4.20, £40,000, $12, €9.50, £9 a month, from £450.
  for (const m of b.matchAll(/(\bfrom\s+)?([£$€]\s?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?(?:k|m)?)(\s+(?:a|per)\s+(?:month|year|week|hour|head|person|night|day|session|class))?/g)) {
    const value = m[2].replace(/\s/g, '') + (m[3] ?? '');
    const at = m.index + (m[1]?.length ?? 0);
    // A price after a comma starts its own clause: it belongs to the product, not to the words before it.
    let what = /,\s*$/.test(b.slice(0, m.index)) ? '' : nounBefore(b, m.index);
    const after = nounAfter(b, m.index + m[0].length);
    // "a £40,000 single-storey extension": the noun follows the price.
    if (after && (!what || /\b(?:a|an)\s*$/.test(b.slice(0, at)))) what = after;
    // "£10 feeds a household for a week": a price that says what it does.
    const said = /^\s+((?:feeds?|buys?|covers?|pays for|keeps?|gives?|fills?)\b[^,.;]*)/.exec(b.slice(m.index + m[0].length))?.[1];
    // It is a statement, not a price list entry.
    if (said) { facts.says.push(clean(`${m[2]} ${said}`)); continue; }
    facts.prices.push({ value, from: !!m[1], what: lowerFirst(what) || null, text: clean(m[0]) });
  }
  // Clock times: 7:30, 7.30am, 10am, "10 to 2" after days.
  for (const m of b.matchAll(/\b(?:(open|opens|opening|from|until|till|closes|closing|at)\s+(?:from\s+)?)?(?<![£$€\d.,])((?:[01]?\d|2[0-3])[:.][0-5]\d(?:\s?[ap]m)?|\d{1,2}\s?[ap]m)\b/gi)) {
    facts.times.push({ value: m[2], what: m[1] ? m[1].toLowerCase() : null, text: clean(m[0]) });
  }
  // Days: "Tuesday to Sunday", "Monday and Thursday", "Saturdays", with an optional hour range "10 to 2".
  const dayM = new RegExp(`\\b(${DAY}(?:\\s*(?:,|and|to|-|–)\\s*${DAY})*)(?:\\s+(\\d{1,2}(?:[:.][0-5]\\d)?\\s*(?:[ap]m)?\\s*(?:to|-|–)\\s*\\d{1,2}(?:[:.][0-5]\\d)?\\s*(?:[ap]m)?))?`).exec(b);
  if (dayM) {
    facts.days = clean(dayM[1]);
    if (dayM[2]) facts.times.push({ value: clean(dayM[2]).replace(/\s*(?:to|-|–)\s*/, ' to '), what: 'hours', text: clean(dayM[2]) });
  }
  // A clock time inside an hours range ("7:30" in "7:30 to 3") is that range, not a second time.
  const ranges = facts.times.filter((t) => t.what === 'hours');
  facts.times = facts.times.filter((t) => t.what || !ranges.some((r) => r.text.includes(t.value)));
  // Durations: 30 seconds, 12 weeks, a 20-minute call.
  for (const m of b.matchAll(new RegExp(`\\b(\\d+|${Object.keys(NUM_WORDS).join('|')})[-\\s](${UNIT})\\b`, 'gi'))) {
    const hyphen = b[m.index + m[1].length] === '-';
    const value = `${m[1]} ${m[2].toLowerCase().replace(/^min$/, 'minutes')}${hyphen && !/s$/.test(m[2]) && m[1] !== '1' && m[1] !== 'one' ? 's' : ''}`;
    if (!/\d/.test(m[1]) && !hyphen) continue; // "two weeks" in passing is not a figure; "two-week" is
    const what = hyphen ? lowerFirst(nounAfter(b, m.index + m[0].length)) || null : lowerFirst(nounBefore(b, m.index)) || null;
    // The phrase as written, with an adjective just before it: "free 20-minute first call".
    const pre = /\b(free|fixed|one|a|an)\s+$/i.exec(b.slice(0, m.index))?.[1] ?? '';
    const phrase = hyphen ? clean(`${/^(free|fixed)$/i.test(pre) ? pre + ' ' : ''}${m[0]} ${what ?? ''}`) : null;
    facts.durations.push({ value, what, phrase, text: clean(m[0]) });
  }
  // Counts: "410 food parcels a week", "1,200 members". Not prices, years, times or durations.
  for (const m of b.matchAll(/(?<![£$€\d.,:])\b(\d{1,3}(?:,\d{3})*|\d+)\s+((?:[a-z][a-z'’-]*\s*){1,7})/g)) {
    if (/^(19|20)\d\d$/.test(m[1]) || facts.times.some((t) => t.text.includes(m[1]))) continue;
    const ws = words(m[2]);
    const keep = [];
    for (const w of ws) { if (STOP.has(w) || VERBS.test(w) || new RegExp(`^${UNIT}$`, 'i').test(w) || /^(am|pm)$/.test(w) || keep.length >= 3) break; keep.push(w); }
    if (!keep.length) continue;
    const rest = ws.slice(keep.length).join(' ');
    const per = /^((?:a|per|each|every)\s+(?:week|day|month|year))\b/.exec(rest)?.[1] ?? null;
    // The period a figure is true for: "last winter", "in 2025", "this year".
    const when = /^(?:(?:a|per|each|every)\s+(?:week|day|month|year)\s+)?((?:last|this)\s+(?:winter|summer|spring|autumn|year|month|week)|in\s+20\d\d|since\s+20\d\d)\b/.exec(rest)?.[1] ?? null;
    const what = keep.join(' ');
    facts.counts.push({ value: m[1], what, per, when, text: clean(`${m[1]} ${what}${per ? ` ${per}` : ''}${when ? ` ${when}` : ''}`) });
  }
  // Claims: what the thing does, as the brief says it ("that sends an invoice in 30 seconds and chases late payers").
  const claimM = /\b(?:that|which|who)\s+(.+?)(?=,\s+(?:open|from|with|for|how it works|phone|[£$€])|[.;]|\s+for\s+[£$€]|$)/i.exec(b);
  if (claimM) {
    // Split between verbs ("sends an invoice and chases late payers"), never inside a list of things
    // ("reads your PDFs and spreadsheets"): the word after the comma or "and" has to be a verb.
    const parts = [];
    const bits = claimM[1].split(/(,\s*(?:and\s+)?|\s+and\s+)/);
    for (let k = 0; k < bits.length; k += 2) {
      const piece = bits[k], sep = bits[k - 1] ?? '';
      if (!parts.length || VERBS.test(words(clean(piece))[0] ?? '')) { parts.push(piece); continue; }
      // "PDFs and spreadsheets" belongs to the claim before; after a comma, a thing that is no verb ends the claims.
      if (/^\s+and\s+$/.test(sep)) parts[parts.length - 1] += ` and ${piece}`; else break;
    }
    for (const part of parts) {
      const c = clean(part);
      if (c && words(c).length >= 2 && VERBS.test(words(c)[0])) facts.claims.push(c);
    }
  }
  // "Tally invoicing app: send an invoice from your phone in 30 seconds, chase late payers automatically": what
  // follows a colon, clause by clause, when a clause opens with a plain verb. Stored as "sends…", like the above.
  if (!facts.claims.length && b.includes(':')) {
    const BASE = /^(send|chase|get|track|book|find|plan|pay|see|keep|share|write|add|build|run|ship|query|store|sync|manage|check|watch|read|record|log|learn|compare|save|move|sign|scan|turn|answer|catch|cut|deploy|test|search|ask|schedule|invoice|split|draw|edit|publish|collect|post)$/i;
    for (const part of b.slice(b.indexOf(':') + 1).split(/,\s*|;\s*/)) {
      const ws = words(clean(part));
      if (ws.length < 3 || !BASE.test(ws[0]) || /[£$€]/.test(part)) continue;
      const v = ws[0].toLowerCase();
      facts.claims.push(clean(part).replace(/^\w+/, /(ch|sh|s|x|z)$/.test(v) ? `${v}es` : `${v}s`));
      if (facts.claims.length >= 2) break;
    }
  }
  // Offers: the things made or sold, after building/making/selling/offering.
  const offM = /\b(?:building|builds|making|makes|selling|sells|offering|offers|baking|bakes|serving|serves|repairing|installing|designing|teaching|running|runs)\s+(.+?)(?=,|[.;]|\s+(?:for|in|on|from|with|that)\s|$)/.exec(b);
  if (offM) for (const part of offM[1].split(/\s+and\s+|,\s*/)) { const o = clean(part); if (o && words(o).length <= 4) facts.offers.push(o); }
  Object.assign(facts, listsFrom(b));
  return facts;
}

// ---------------------------------------------------------------- lists the brief spells out
// "services: API, webhooks and the dashboard", "bookings with dog, owner, date and price", "tracks bookings,
// clients and invoices". Pages that are not marketing (a status page, an admin list, a pricing table, a
// checkout) are drawn from these: each item exactly as written, nothing added.
const ITEM_STOP = /^(?:phone|tel|call|email|open|opens|opening|from|how it works|then|plus|each|every|which|that|who|it|they|we|you|our|one tier|one plan)\b/i;
/** The items of a list that starts at `s`: short noun phrases joined by commas, "and" or "or". */
export function readList(s, { prices = false, max = 12 } = {}) {
  const stopAt = s.search(/[.;](?:\s|$)|\s[—–]\s|:\s/);
  const seg = stopAt >= 0 ? s.slice(0, stopAt) : s;
  const out = [];
  // Split on commas (not inside "10,000"), "and", "or" and "/", remembering which joined each item: in
  // "a, b and c, dishwasher safe" the list ends at "c", the item after the "and".
  const parts = seg.split(/(,(?!\d{3})\s*(?:and\s+|or\s+)?|\s+and\s+|\s+or\s+|\s*\/\s*)/);
  for (let i = 0; i < parts.length; i += 2) {
    const t = clean(parts[i]).replace(/^(?:a|an|the|its|their|your)\s+/i, '');
    if (!t || words(t).length > 5 || ITEM_STOP.test(t) || /\s(?:with|for|from|by|that|which)\s|\s(?:in|at|on)\s+[A-Z]/.test(` ${t} `) || /\d{4,}/.test(t) || (!prices && /[£$€]/.test(t)) || /@/.test(t)) break;
    out.push(t);
    if (out.length >= max || /\b(and|or)\b/.test(parts[i - 1] ?? '')) break;
  }
  return out;
}
const LIST_VERBS = 'about|tracks|track|tracking|manages|manage|managing|lists|list of|keeps|stores|records|covers|shows|showing|includes|include|including|organises|organizes|handles|schedules';
function listsFrom(b) {
  const lists = [], records = [];
  // Labelled lists: "services: API, webhooks", "columns: dog, owner, date".
  for (const m of b.matchAll(/\b([a-z][a-z-]*(?:\s+[a-z][a-z-]*)?)\s*:\s+/gi)) {
    const label = m[1].toLowerCase().split(/\s+/).pop();
    if (/^(works|steps|process|phone|tel|email|note|at)$/.test(label)) continue;
    const items = readList(b.slice(m.index + m[0].length), { prices: /^(plans?|tiers?|items?|prices?|options?)$/.test(label) });
    if (items.length >= 1) lists.push({ label, items, at: m.index });
  }
  // Lists after a verb: "tracks bookings, clients and invoices".
  for (const m of b.matchAll(new RegExp(`\\b(${LIST_VERBS})\\s+(?!a\\s|an\\s|up\\s|to\\s)`, 'gi'))) {
    const items = readList(b.slice(m.index + m[0].length));
    if (items.length >= 2) lists.push({ label: m[1].toLowerCase().replace(/^(track|tracking)$/, 'tracks').replace(/^(manage|managing)$/, 'manages').replace(/^(include|including)$/, 'includes'), items, at: m.index });
  }
  // A record and its fields: "bookings with dog, owner, groomer, date and status".
  for (const m of b.matchAll(/\b([a-z]+(?:\s+[a-z]+)?s)\s+(?:with|showing|by)\s+(?:their\s+|the\s+|columns?\s+|fields?\s+)?/gi)) {
    const name = m[1].toLowerCase().split(/\s+/).filter((w) => !STOP.has(w) && !VERBS.test(w)).join(' ');
    const fields = readList(b.slice(m.index + m[0].length));
    if (name && fields.length >= 2) records.push({ name, fields, at: m.index });
  }
  return { lists, records };
}
/** The items of the first list whose label matches. */
export const listOf = (facts, re) => facts.lists?.find((l) => re.test(l.label))?.items ?? [];

/** Every figure in the facts, most specific first, as { value, label } pairs for a figures row. */
export function figuresFrom(facts) {
  const out = [];
  for (const c of facts.counts) out.push({ value: c.value, label: `${c.what}${c.per ? ` ${c.per}` : ''}${c.when ? `, ${c.when}` : ''}` });
  for (const p of facts.prices) out.push({ value: p.value.replace(/\s+(a|per)\s+.*/, ''), label: [p.from ? 'from, for' : null, p.what, /\s(a|per)\s/.test(p.value) ? p.value.replace(/^\S+\s+/, '') : null].filter(Boolean).join(' ').replace(/^from, for (.*)$/, '$1, from') || 'price' });
  for (const d of facts.durations) {
    // "sends an invoice in 30 seconds" labels its figure "to send an invoice".
    const claim = facts.claims.find((c) => c.includes(d.text));
    const label = facts.prices.some((p) => p.what && p.what === d.what) ? 'start to finish' : claim ? `to ${imperative(claim.replace(new RegExp(`\\s*(?:in|within|under)?\\s*${d.text}\\b`), '')).replace(/^./, (x) => x.toLowerCase())}` : d.phrase ?? d.what ?? 'time';
    out.push({ value: d.value, label });
  }
  const hasRange = facts.times.some((t) => t.what === 'hours');
  for (const t of facts.times.filter((x) => !(hasRange && !x.what))) out.push({ value: t.value, label: t.what === 'hours' ? `open ${facts.days ?? ''}`.trim() : t.what ? `${t.what}${facts.days ? `, ${facts.days}` : ''}` : 'time' });
  const seen = new Set();
  return out.filter((f) => { const k = f.value; if (seen.has(k)) return false; seen.add(k); return true; });
}

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
/** "sends an invoice in 30 seconds" → "Send an invoice in 30 seconds". */
export const imperative = (claim) => cap(claim.replace(/^(\w+?)(es|s)\b/, (m, stem, suf) => (suf === 'es' && /(ch|sh|ss|x|z)$/.test(stem) ? stem : suf === 'es' ? `${stem}e` : stem)));

/**
 * Draft copy for the first screen, built only from the facts. Missing pieces come back as a TODO that
 * names what to ask for, never as a made-up sentence.
 */
export function heroCopy(facts, { typeId, product }) {
  const name = product ?? facts.name ?? null;
  const kind = facts.kind ? cap(facts.kind) : null;
  const where = facts.street ? `${facts.street}${facts.place ? `, ${facts.place}` : ''}` : facts.place;
  const price = facts.prices.find((p) => p.what) ?? facts.prices[0] ?? null;
  const time = facts.times.find((t) => /open|from/.test(t.what ?? '')) ?? facts.times.find((t) => t.what === 'hours') ?? facts.times[0] ?? null;
  const count = facts.counts[0] ?? null;
  const dur = facts.durations.find((d) => d.what) ?? facts.durations[0] ?? null;
  const claim = facts.claims[0] ?? null;
  const eyebrow = kind && facts.place ? `${kind} · ${facts.place}` : kind ?? facts.place ?? null;
  let headline = null;
  // A place, a practice, a studio or a maker: say what it is and where, plainly ("Family dentist on Harrogate
  // Road", "Car and foot ferry from Ardmore to Kestrel Isle"). The price goes to the picture, not the headline.
  const where2 = facts.route ? ` from ${facts.route.from} to ${facts.route.to}` : facts.street ? ` on ${facts.street.replace(/^\d+\s+/, '')}${facts.place ? `, ${facts.place}` : ''}` : facts.place && !facts.kind?.includes(facts.place) ? ` in ${facts.place}` : '';
  // A service with a price and how long it takes keeps that ("Single-storey extensions in 12 weeks"): it is the better line.
  const timed = typeId === 'service-landing' && price?.what && facts.durations.some((d) => d.what === price.what);
  if (!timed && where2 && ['venue', 'service-landing', 'portfolio', 'brand-landing'].includes(typeId) && facts.kind && !/\b(app|page|settings|pricing|dashboard|tool)\b/.test(facts.kind) && facts.kind.split(' ').length <= 6) headline = cap(`${facts.kind.replace(/^(?:a|an|the)\s+/i, '')}${where2}`);
  else if (typeId === 'venue' && kind && (facts.street || facts.place)) headline = `${/^an?\s/i.test(kind) ? kind : `A ${facts.kind}`} on ${facts.street ? facts.street.replace(/^\d+\s+/, '') : `the high street in ${facts.place}`}${facts.street && facts.place ? ` in ${facts.place}` : ''}`;
  else if (typeId === 'event' && kind) headline = `${/^(an?|the)\s/i.test(facts.kind) ? kind : `A ${facts.kind}`}${facts.place ? ` in ${facts.place}` : ''}`;
  else if (typeId === 'cause' && count) headline = `${count.value} ${count.what}${count.per ? ` ${count.per}` : ''}${count.when ? ` ${count.when}` : ''}${facts.place ? `, in ${facts.place}` : ''}`;
  else if (typeId === 'service-landing' && price?.what) {
    const done = facts.durations.find((d) => d.what === price.what);
    // A plural, a fixed fee or a word that takes no article ("work", "advice") reads without "A".
    const a = /s$/.test(price.what.split(' ').pop()) || /^(fixed|free)/.test(price.what) || /^(work|advice|help|care|building|cleaning|repair|maintenance|tuition|training|support)$/i.test(price.what) ? '' : 'A ';
    const what = price.what.replace(/^fixed[-\s](?:fee|price)\s+/i, '');
    // With a time as well, the price goes to the picture and the headline carries the time.
    const plural = /s$/.test(what) ? what : what.replace(/(\w+)$/, (w) => (/(ch|sh|x|z)$/.test(w) ? `${w}es` : `${w}s`));
    headline = cap(done ? `${plural} in ${done.value}` : `${a}${what} ${price.from ? 'from' : 'for'} ${price.value.replace(/\s+(a|per)\s+.*/, '')}`);
  }
  else if (claim) headline = imperative(claim);
  else if (price?.what) headline = `${cap(price.what)} ${price.from ? 'from' : 'for'} ${price.value}`;
  // Nothing more specific: what it is and where, which is still true ("A dentist in Leeds").
  if (!headline && kind) headline = `${/^(an?|the)\s/i.test(facts.kind) ? kind : `${/^[aeiou]/i.test(facts.kind) ? 'An' : 'A'} ${facts.kind}`}${facts.place ? ` in ${facts.place}` : ''}`;
  if (headline && headline.split(/\s+/).length > 12) headline = headline.split(/,\s*/)[0];
  const ledeParts = [];
  if (typeId === 'venue' || typeId === 'service-landing' || typeId === 'cause') {
    if (typeId === 'cause' && facts.claims.length && !facts.counts.some((c) => headline?.includes(c.value) && facts.claims[0].includes(c.value))) ledeParts.push(`${cap(facts.claims[0])}.`);
    if (facts.offers.length) ledeParts.push(`${cap(facts.offers.join(' and '))}${facts.place && !headline?.includes(facts.place) ? ` in ${facts.place}` : ''}.`);
    const others = facts.prices.filter((p) => p !== price && p.what);
    if (typeId !== 'service-landing' && price && !headline?.includes(price.value)) ledeParts.push(`${cap(price.what ?? 'prices')} ${price.from ? 'from' : 'at'} ${price.value}.`);
    // A price named by its period reads as the period: "£48 a month", never "Monthly for £48".
    const PERIOD = { monthly: 'month', yearly: 'year', annual: 'year', weekly: 'week', daily: 'day', nightly: 'night' };
    for (const p of others.slice(0, 1)) ledeParts.push(PERIOD[p.what.toLowerCase()] ? `${p.from ? 'From ' : ''}${p.value} a ${PERIOD[p.what.toLowerCase()]}.` : `${cap(p.what)} ${p.from ? 'from' : 'for'} ${p.value}.`);
    for (const d of facts.durations.filter((x) => x.phrase && !headline?.includes(x.value)).slice(0, 1)) ledeParts.push(`${cap(d.phrase)}.`);
  } else {
    for (const c of facts.claims.slice(headline === imperative(claim ?? '') ? 1 : 0, 2)) ledeParts.push(`${name ?? 'It'} ${c}.`);
    if (price && !headline?.includes(price.value)) ledeParts.push(price.what ? `${cap(price.what)} ${price.from ? 'from' : 'at'} ${price.value}.` : `${price.value.replace(/\s+a\s+/, ' a ')}${facts.audience ? ` for ${facts.audience}` : ''}.`.replace(/^./, (c) => c.toUpperCase()));
  }
  if (!ledeParts.length && typeId === 'cause' && (facts.days || time)) ledeParts.push(`Open ${facts.days ?? ''}${time ? `${facts.days ? ', ' : ''}${time.what === 'hours' ? time.value : `from ${time.value}`}` : ''}${facts.street ? `, at ${facts.building ? `${facts.building}, ` : ""}${facts.street}` : ''}.`.replace(/\s+/g, ' '));
  const noteParts = [facts.days && time ? `Open ${facts.days}${time.what === 'hours' ? `, ${time.value}` : `, from ${time.value}`}` : facts.days ? `Open ${facts.days}` : time ? `Open from ${time.value}` : null, facts.street ? where : null].filter(Boolean);
  // A note that would only repeat the place in the eyebrow says nothing.
  const note = noteParts.join(' · ') || null;
  // The one action, in the subject's words: what the brief offers to do next.
  const b = ` ${(facts.brief ?? '').toLowerCase()} `;
  const action = /\bcheck-?ups?\b/.test(b) ? 'Book a check-up'
    : /\b(ferry|ferries|sailings?|crossings?)\b/.test(b) ? 'Book a crossing'
    : /\binduction\b/.test(b) ? 'Book your first visit'
    : /\bfirst (meeting|visit|consultation)\b[^.]*\bfree\b|\bfree first (meeting|visit|consultation)\b/.test(b) ? `Book a first ${/meeting/.test(b) ? 'meeting' : /visit/.test(b) ? 'visit' : 'consultation'}`
    : /\b(episode|podcast)\b/.test(b) ? 'Listen'
    : /\bquotes?\b/.test(b) ? 'Get a quote'
    : /\b(first|free)\b[^.]*\bcall\b/.test(b) ? 'Book a first call'
    : /\bclass(es)?\b/.test(b) && typeId === 'venue' ? 'Book a class'
    : /\b(donate|donation|give)\b/.test(b) || typeId === 'cause' ? (/\bfood bank|foodbank|parcels?\b/.test(b) ? 'Give food or money' : 'Donate')
    : /\b(table|tables)\b/.test(b) && typeId === 'venue' ? 'Book a table'
    : /\bticket/.test(b) ? 'Get a ticket'
    : null;
  // The second, quieter link names what it shows: "See the loaves", not the sample's own range.
  const firstThing = facts.prices.find((p) => p.what)?.what ?? facts.offers[0] ?? null;
  const secondary = typeId === 'venue' && firstThing ? `See the ${firstThing.replace(/^(?:a|an|the)\s+/i, '').replace(/^Saturday\s+/, '')}` : null;
  return {
    action,
    secondary,
    // A line above that only repeats the headline is a label over a heading: drop it (keep the town if the headline lacks it).
    eyebrow: headline && facts.kind && headline.toLowerCase().includes(facts.kind.toLowerCase().replace(/^(?:a|an|the)\s+/, '')) ? (facts.place && !headline.includes(facts.place) ? facts.place : null) : eyebrow,
    headline: headline ?? null,
    // Other true headlines from the same facts, for the person to choose between: what and where, the price people
    // come for, what it does, a figure with its period. Never more than three, never the chosen one again.
    options: [...new Set([
      facts.kind && (facts.street || facts.place || facts.route) ? cap(`${facts.kind.replace(/^(?:a|an|the)\s+/i, '')}${facts.route ? ` from ${facts.route.from} to ${facts.route.to}` : facts.street ? ` on ${facts.street.replace(/^\d+\s+/, '')}` : ` in ${facts.place}`}`) : null,
      price?.what ? cap(`${/s$/.test(price.what.split(' ').pop()) || /^(fixed|free|work|advice|help|care|tuition|training|support)/i.test(price.what) ? '' : 'a '}${price.what} ${price.from ? 'from' : 'for'} ${price.value.replace(/\s+(a|per)\s+.*/, '')}`) : null,
      claim ? imperative(claim) : null,
      facts.claims[1] ? imperative(facts.claims[1]) : null,
      count && count.what ? `${count.value} ${count.what}${count.per ? ` ${count.per}` : ''}${count.when ? ` ${count.when}` : ''}` : null,
    ].filter((h) => h && h.split(/\s+/).length <= 12 && !(headline && (headline.toLowerCase().includes(h.toLowerCase()) || h.toLowerCase().includes(headline.toLowerCase())))))].slice(0, 3),
    lede: ledeParts.length ? ledeParts.join(' ') : null,
    note,
    todo: [
      !headline && 'the one thing that makes this place or product itself, in under ten words',
      !facts.prices.length && ['venue', 'service-landing', 'brand-landing', 'landing', 'pricing', 'event', 'store-product'].includes(typeId) && 'one real price',
      !facts.times.length && !facts.days && ['venue', 'service-landing', 'cause'].includes(typeId) && 'the opening days and hours',
      !where && ['venue', 'service-landing', 'cause', 'event'].includes(typeId) && 'the address',
    ].filter(Boolean),
  };
}

/** The wording for a TODO that asks for facts instead of inventing them. */
export const askFor = (things) => `TODO: ask for ${things.join(', ')}. Do not invent figures.`;

/**
 * Opening hours from the brief, as { 1..7: "10:00 to 14:00" | null } (Monday is 1), when it gives both the
 * days and an hour range ("Monday and Thursday 10 to 2"). Null when it does not: hours are never guessed.
 */
export function openingHours(facts) {
  if (!facts.days) return null;
  const range = facts.times.find((t) => t.what === 'hours')?.value;
  const m = range && /^(\d{1,2})(?:[:.](\d\d))?\s*([ap]m)?\s+to\s+(\d{1,2})(?:[:.](\d\d))?\s*([ap]m)?$/i.exec(range);
  if (!m) return null;
  const to24 = (h, ap, other) => { let x = +h; if (/pm/i.test(ap ?? '') && x < 12) x += 12; if (!ap && other != null && x < other) x += 12; return x; };
  const h1 = to24(m[1], m[3], null), h2 = to24(m[4], m[6], h1);
  const fmt = (h, mm) => `${h}:${mm ?? '00'}`;
  const idx = (d) => DAYS.findIndex((x) => d.startsWith(x)) + 1;
  const open = new Set();
  for (const part of facts.days.split(/\s*(?:,|and)\s*/)) {
    const [a, b] = part.split(/\s*(?:to|-|–)\s*/).map(idx);
    if (a && b) { for (let d = a; ; d = (d % 7) + 1) { open.add(d); if (d === b) break; } } else if (a) open.add(a);
  }
  return Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((d) => [d, open.has(d) ? `${fmt(h1, m[2])} to ${fmt(h2, m[5])}` : null]));
}
