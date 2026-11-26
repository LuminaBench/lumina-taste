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
const STOP = new Set(['a', 'an', 'the', 'and', 'or', 'for', 'from', 'in', 'on', 'at', 'of', 'to', 'with', 'that', 'which', 'who', 'is', 'are', 'was', 'open', 'opens', 'gave', 'give', 'gives', 'sends', 'send', 'by', 'it', 'its', 'our', 'their', 'per', 'every', 'each', 'last', 'this', 'than', 'up', 'out', 'about', 'around', 'over', 'under', 'into']);
const VERBS = /^(?:sends?|chases?|builds?|building|makes?|making|sells?|selling|runs?|running|offers?|offering|gives?|gave|giving|helps?|tracks?|books?|keeps?|turns?|lets?|finds?|shows?|writes?|reads?|bakes?|baking|roasts?|roasting|serves?|serving|fixes?|fixing|teaches?|teaching|cuts?|plans?|pays?|pay|files?|repairs?|repairing|installs?|installing|delivers?|delivering|cooks?|brews?|designs?|designing|grows?|ships?|takes?|handles?|checks?|answers?|collects?|stores?|syncs?)$/i;

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
  const facts = { brief: String(brief ?? '').trim(), name: product ?? null, kind: null, place: null, street: null, audience: null, prices: [], times: [], days: null, durations: [], counts: [], claims: [], offers: [] };

  // The kind of business: "…, a sourdough bakery on Mill Lane" / "an invoicing tool for freelancers".
  const kindM = /,\s+(?:an?|the)\s+([a-z][\w'’-]*(?:\s+[a-z][\w'’-]*){0,4}?)(?=\s+(?:on|in|at|for|that|which|who|with|near|building|making|selling|run|based|offering|open)\b|[,.;]|\s*$)/.exec(b)
    ?? /\b(?:for|page for|site for|website for)\s+(?:an?|the)\s+([a-z][\w'’-]*(?:\s+[a-z][\w'’-]*){0,4}?)(?=\s+(?:on|in|at|for|that|which|who|with|near|building|making|selling|run|based|offering|open)\b|[,.;]|\s*$)/.exec(b);
  if (kindM) facts.kind = clean(kindM[1]);

  const streetM = new RegExp(`\\b(?:on|at)\\s+((?:\\d+\\s+)?[A-Z][\\w'’-]*(?:\\s+[A-Z][\\w'’-]*)*\\s+${STREET})\\b`).exec(b);
  if (streetM) facts.street = streetM[1];
  // A place is a capitalised name after "in", that is not a month, a day or the product.
  for (const m of b.matchAll(/\bin\s+([A-Z][a-zA-Z'’-]+(?:\s+(?:upon|on|-on-)?\s*[A-Z][a-zA-Z'’-]+){0,2})/g)) {
    const p = m[1].trim();
    if (DAYS.includes(p) || /^(January|February|March|April|May|June|July|August|September|October|November|December)$/.test(p) || p === product) continue;
    facts.place = p; break;
  }
  const audM = /\bfor\s+((?:small\s+|independent\s+|busy\s+|local\s+)?[a-z]+(?:ers|ists|ants|ents|people|teams|families|parents|owners))\b/.exec(b);
  if (audM && !/^(a|an|the)$/.test(audM[1])) facts.audience = audM[1];

  // Prices: £4.20, £40,000, $12, €9.50, £9 a month, from £450.
  for (const m of b.matchAll(/(\bfrom\s+)?([£$€]\s?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?(?:k|m)?)(\s+(?:a|per)\s+(?:month|year|week|hour|head|person|night|day|session|class))?/g)) {
    const value = m[2].replace(/\s/g, '') + (m[3] ?? '');
    const at = m.index + (m[1]?.length ?? 0);
    // A price after a comma starts its own clause: it belongs to the product, not to the words before it.
    let what = /,\s*$/.test(b.slice(0, m.index)) ? '' : nounBefore(b, m.index);
    const after = nounAfter(b, m.index + m[0].length);
    // "a £40,000 single-storey extension": the noun follows the price.
    if (after && (!what || /\b(?:a|an)\s*$/.test(b.slice(0, at)))) what = after;
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
  const claimM = /\b(?:that|which|who)\s+(.+?)(?=,\s+(?:open|from|with|for)\b|[.;]|\s+for\s+[£$€]|$)/.exec(b);
  if (claimM) {
    for (const part of claimM[1].split(/,\s*|\s+and\s+(?=[a-z]+s\b)/)) {
      const c = clean(part);
      if (c && words(c).length >= 2 && VERBS.test(words(c)[0])) facts.claims.push(c);
    }
  }
  // Offers: the things made or sold, after building/making/selling/offering.
  const offM = /\b(?:building|builds|making|makes|selling|sells|offering|offers|baking|bakes|serving|serves|repairing|installing|designing|teaching|running|runs)\s+(.+?)(?=,|[.;]|\s+(?:for|in|on|from|with|that)\s|$)/.exec(b);
  if (offM) for (const part of offM[1].split(/\s+and\s+|,\s*/)) { const o = clean(part); if (o && words(o).length <= 4) facts.offers.push(o); }
  return facts;
}

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
  const time = facts.times.find((t) => /open|from/.test(t.what ?? '')) ?? facts.times[0] ?? null;
  const count = facts.counts[0] ?? null;
  const dur = facts.durations.find((d) => d.what) ?? facts.durations[0] ?? null;
  const claim = facts.claims[0] ?? null;
  const eyebrow = kind && facts.place ? `${kind} · ${facts.place}` : kind ?? facts.place ?? null;
  let headline = null;
  if (typeId === 'venue' && kind && (facts.street || facts.place)) headline = `${/^an?\s/i.test(kind) ? kind : `A ${facts.kind}`} on ${facts.street ?? `the high street in ${facts.place}`}${facts.street && facts.place ? ` in ${facts.place}` : ''}`;
  else if (typeId === 'event' && kind) headline = `${/^(an?|the)\s/i.test(facts.kind) ? kind : `A ${facts.kind}`}${facts.place ? ` in ${facts.place}` : ''}`;
  else if (typeId === 'cause' && count) headline = `${count.value} ${count.what}${count.per ? ` ${count.per}` : ''}${count.when ? ` ${count.when}` : ''}${facts.place ? `, in ${facts.place}` : ''}`;
  else if (typeId === 'service-landing' && price?.what) {
    const done = facts.durations.find((d) => d.what === price.what);
    const a = /s$/.test(price.what.split(' ').pop()) || /^(fixed|free)/.test(price.what) ? '' : 'A ';
    const what = price.what.replace(/^fixed[-\s](?:fee|price)\s+/i, '');
    // With a time as well, the price goes to the picture and the headline carries the time.
    const plural = /s$/.test(what) ? what : what.replace(/(\w+)$/, (w) => (/(ch|sh|x|z)$/.test(w) ? `${w}es` : `${w}s`));
    headline = cap(done ? `${plural} in ${done.value}` : `${a}${what} ${price.from ? 'from' : 'for'} ${price.value.replace(/\s+(a|per)\s+.*/, '')}`);
  }
  else if (claim) headline = imperative(claim);
  else if (price?.what) headline = `${cap(price.what)} ${price.from ? 'from' : 'for'} ${price.value}`;
  if (headline && headline.split(/\s+/).length > 12) headline = headline.split(/,\s*/)[0];
  const ledeParts = [];
  if (typeId === 'venue' || typeId === 'service-landing' || typeId === 'cause') {
    if (typeId === 'cause' && facts.claims.length && !facts.counts.some((c) => headline?.includes(c.value) && facts.claims[0].includes(c.value))) ledeParts.push(`${cap(facts.claims[0])}.`);
    if (facts.offers.length) ledeParts.push(`${cap(facts.offers.join(' and '))}${facts.place && !headline?.includes(facts.place) ? ` in ${facts.place}` : ''}.`);
    const others = facts.prices.filter((p) => p !== price && p.what);
    if (typeId !== 'service-landing' && price && !headline?.includes(price.value)) ledeParts.push(`${cap(price.what ?? 'prices')} ${price.from ? 'from' : 'at'} ${price.value}.`);
    for (const p of others.slice(0, 1)) ledeParts.push(`${cap(p.what)} ${p.from ? 'from' : 'for'} ${p.value}.`);
    for (const d of facts.durations.filter((x) => x.phrase && !headline?.includes(x.value)).slice(0, 1)) ledeParts.push(`${cap(d.phrase)}.`);
  } else {
    for (const c of facts.claims.slice(headline === imperative(claim ?? '') ? 1 : 0, 2)) ledeParts.push(`${name ?? 'It'} ${c}.`);
    if (price && !headline?.includes(price.value)) ledeParts.push(price.what ? `${cap(price.what)} ${price.from ? 'from' : 'at'} ${price.value}.` : `${price.value.replace(/\s+a\s+/, ' a ')}${facts.audience ? ` for ${facts.audience}` : ''}.`.replace(/^./, (c) => c.toUpperCase()));
  }
  if (!ledeParts.length && typeId === 'cause' && (facts.days || time)) ledeParts.push(`Open ${facts.days ?? ''}${time ? `${facts.days ? ', ' : ''}${time.what === 'hours' ? time.value : `from ${time.value}`}` : ''}${facts.street ? ` on ${facts.street}` : ''}.`.replace(/\s+/g, ' '));
  const noteParts = [facts.days && time ? `Open ${facts.days}${time.what === 'hours' ? `, ${time.value}` : `, from ${time.value}`}` : facts.days ? `Open ${facts.days}` : time ? `Open from ${time.value}` : null, facts.street ? where : null].filter(Boolean);
  // A note that would only repeat the place in the eyebrow says nothing.
  const note = noteParts.join(' · ') || null;
  // The one action, in the subject's words: what the brief offers to do next.
  const b = ` ${(facts.brief ?? '').toLowerCase()} `;
  const action = /\bquotes?\b/.test(b) ? 'Get a quote'
    : /\b(first|free)\b[^.]*\bcall\b/.test(b) ? 'Book a first call'
    : /\bclass(es)?\b/.test(b) && typeId === 'venue' ? 'Book a class'
    : /\b(donate|donation|give)\b/.test(b) || typeId === 'cause' ? (/\bfood bank|foodbank|parcels?\b/.test(b) ? 'Give food or money' : 'Donate')
    : /\b(table|tables)\b/.test(b) ? 'Book a table'
    : /\bticket/.test(b) ? 'Get a ticket'
    : null;
  // The second, quieter link names what it shows: "See the loaves", not the sample's own range.
  const firstThing = facts.prices.find((p) => p.what)?.what ?? facts.offers[0] ?? null;
  const secondary = typeId === 'venue' && firstThing ? `See the ${firstThing.replace(/^(?:a|an|the)\s+/i, '').replace(/^Saturday\s+/, '')}` : null;
  return {
    action,
    secondary,
    eyebrow,
    headline: headline ?? null,
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
  const fmt = (h, mm) => `${String(h).padStart(2, '0')}:${mm ?? '00'}`;
  const idx = (d) => DAYS.findIndex((x) => d.startsWith(x)) + 1;
  const open = new Set();
  for (const part of facts.days.split(/\s*(?:,|and)\s*/)) {
    const [a, b] = part.split(/\s*(?:to|-|–)\s*/).map(idx);
    if (a && b) { for (let d = a; ; d = (d % 7) + 1) { open.add(d); if (d === b) break; } } else if (a) open.add(a);
  }
  return Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((d) => [d, open.has(d) ? `${fmt(h1, m[2])} to ${fmt(h2, m[5])}` : null]));
}
