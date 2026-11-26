// Curated starter photographs: engine/photos/<set>.json, one hand-checked set per kind of business (public domain
// or CC0 only, with source, file, creator, what it shows, shot keywords, tone and a focal point chosen by eye).
// find-images.mjs uses a set before it searches: --starter <set or domain>, or the set the --subject maps to.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PHOTOS_DIR = () => process.env.LT_PHOTOS ?? join(root, 'engine', 'photos');

/** Every starter set, by id. */
export function loadStarters(dir = PHOTOS_DIR()) {
  if (!existsSync(dir)) return {};
  const sets = {};
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    const s = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    sets[s.id ?? f.replace(/\.json$/, '')] = s;
  }
  return sets;
}

const fold = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const stem = (w) => w.replace(/(ies|es|s)$/, '');
/** Does a word or phrase stand in the text as words ("bun" in "buns", not "bun" in "bunting")? */
const holds = (text, phrase) => {
  const parts = fold(phrase).split(/\s+/).filter(Boolean).map((w) => `${esc(stem(w))}(s|es|ies)?`);
  return parts.length > 0 && new RegExp(`\\b${parts.join('[\\s-]+')}\\b`).test(text);
};

/** The page-types domain a subject belongs to, by the composer's rule (most domain words in it), or null. */
export function domainOf(subject) {
  const pt = JSON.parse(readFileSync(join(root, 'engine/compose/page-types.json'), 'utf8'));
  const text = ` ${fold(subject)} `;
  const scored = pt.domains.map((d) => ({ id: d.id, s: d.words.filter((w) => holds(text, w)).length })).sort((a, b) => b.s - a.s);
  return scored[0]?.s > 0 ? scored[0].id : null;
}

/**
 * The starter set for a page. starter: a set id or a domain id (wins). Otherwise the set whose own words the
 * subject names (the longest such word wins, so "coffee shop" finds the café set before the shop set), then the
 * set of the subject's domain. Returns the set or null.
 */
export function starterFor({ starter, subject } = {}, sets = loadStarters()) {
  if (starter) return sets[starter] ?? Object.values(sets).find((s) => (s.domains ?? []).includes(starter)) ?? null;
  if (!subject) return null;
  const text = ` ${fold(subject)} `;
  let best = null, bestLen = 0;
  for (const s of Object.values(sets)) for (const w of s.words ?? []) if (holds(text, w) && w.length > bestLen) { best = s; bestLen = w.length; }
  if (best) return best;
  const d = domainOf(subject);
  return d ? sets[d] ?? Object.values(sets).find((s) => (s.domains ?? []).includes(d)) ?? null : null;
}

// Words in a brief that say how to shoot, not what: they never pick a photograph.
const NOISE = /^(the|a|an|on|in|of|with|and|from|at|by|to|for|its|their|our|your|one|two|three|four|five|six|seven|eight|nine|ten|twelve|same|as|others|other|photograph|photo|picture|shot|light|lit|morning|evening|dusk|dawn|soft|side|natural|overcast|daylight|real|wide|close|tall|level|just|out|no|people|posed|people's|beside|behind|under|over|above|below|through|into|seen|from|it|is|are|optional|ratio|nothing|else|then|while|still|new|finished|empty)$/;

/** The brief's meaningful words, in order. */
export const briefWords = (brief) => fold(brief).replace(/\b\d+(:\d+)?\b/g, ' ').split(/[^a-z']+/).filter((w) => w.length > 2 && !NOISE.test(w));

// The head noun phrase of a brief: what the picture is of. "Workshop units with roller doors" is "workshop units",
// "A small office building, finished" is "office building", "A tray of cinnamon buns" is "cinnamon buns". Read from
// the first clause: cut where a preposition, a verb form or an adverb starts, skip words that only describe (size,
// state, colour, position, number), and read "X of Y" as Y unless X is a part ("the front of the shop").
const CUT = /^(with|on|in|at|by|from|beside|behind|under|over|above|below|through|into|onto|near|for|to|against|across|along|outside|inside|just|being|while|where|that|which|who|seen|laid|set|built|made|done|held|shown|taken|lit|spread|lined|after|before|during|until|as|like|than|then|is|are|was|were)$/;
const DESCRIBE = /^(a|an|the|this|that|these|those|its|their|our|your|some|any|each|every|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|several|few|many|small|smaller|large|larger|big|little|tiny|huge|tall|low|long|short|wide|narrow|old|older|new|newer|newly|modern|young|bright|dark|quiet|busy|empty|full|warm|cool|cold|hot|fresh|clean|single|double|whole|half|own|finished|completed|complete|unfinished|recent|typical|real|optional|very|rear|upper|lower|left|right|white|black|grey|gray|red|blue|green|yellow|orange|pink|brown|gold|silver|pale|deep|soft|plain|simple|same|other|g|kg|m|mm|cm)$/;
const PART = /^(front|fronts|back|side|top|bottom|end|corner|edge|inside|outside|view|detail|interior|exterior|entrance|roof|row|rows|line|stack|pile|tray|bag|box|jar|plate|bowl|cup|glass|pot|basket|set|range|selection|collection|handful|bunch|pair|couple|wall|shelf|shelves)$/;
// "X of Y" where X is a part or a container: the picture is of X with Y in it, so either fits; otherwise Y.
// Nouns that end like verb forms.
const ING_NOUN = /^(buildings?|ceilings?|flooring|roofing|cladding|decking|parking|clothing|paintings?|weddings?|bedding|railings?|seating|lighting|housing|plumbing|wiring|landings?|tiling|shelving|fencing|paving|siding|boarding|settings?|meetings?|evenings?|mornings?|puddings?|icing|filling|dumplings?|living|dining|framing|scaffolding|rendering|pointing|glazing|offering|spring|string|ceiling|awning|lettings?|listings?|bookings?|recordings?|carvings?|drawings?|sweepings?|trimmings?|seedlings?|saplings?|herring|herringbone|wedding)$/;
const isVerbish = (w) => /(ed|ing)$/.test(w) && w.length > 4 && !ING_NOUN.test(w);
const describes = (w) => DESCRIBE.test(w) || /-(storey|story|bed|bedroom|seat|seater|room|metre|foot)$/.test(w);

/** The head phrases of a brief: [{ head, mods }], from its first clause. */
export function briefHeads(brief) {
  const clause = fold(brief).replace(/^\s*\w+:\s*/, '').replace(/\b\d+(:\d+)?\b/g, ' ').split(/[,;.()]/)[0];
  const tokens = clause.split(/[^a-z'-]+/).filter(Boolean).map((w) => w.replace(/^'+|'+$/g, '')).filter(Boolean);
  // Read up to the first cut (a verb form only counts once a noun has been read: "Stacked bags" keeps "bags").
  const phrase = [];
  for (const w of tokens) {
    if (CUT.test(w) || (isVerbish(w) && phrase.some((x) => !describes(x) && x !== 'and' && x !== 'of'))) {
      if (phrase.length && phrase.some((x) => !describes(x) && x !== 'and' && x !== 'of')) break;
      continue;
    }
    phrase.push(w);
  }
  // "X of Y": Y is the subject, unless X is a part or a container, when X counts too.
  const groups = [];
  const ofAt = phrase.indexOf('of');
  if (ofAt > 0) {
    const x = phrase.slice(0, ofAt).filter((w) => PART.test(w.replace(/s$/, '')) || (!describes(w) && !isVerbish(w))), y = phrase.slice(ofAt + 1);
    groups.push(y);
    if (x.length && PART.test(x.at(-1).replace(/s$/, ''))) groups.push(x);
  } else groups.push(phrase);
  const heads = [];
  for (const g of groups) {
    // "A and B": two subjects when the left side is a phrase or a plural ("the machine and a flat white", "cups and
    // saucers"); shared modifiers when it is one singular word ("brick and stone homes").
    const parts = [];
    let cur = [];
    for (const w of g) { if (w === 'and' || w === '&') { parts.push(cur); cur = []; } else cur.push(w); }
    parts.push(cur);
    const merged = [];
    for (const part of parts) {
      const words = part.filter((w) => !describes(w) && !(isVerbish(w) && part.indexOf(w) === 0) && w.length > 1);
      const last = merged.at(-1);
      if (last && last.pending) { last.mods.push(...last.pendingWords); last.pending = false; }
      if (!words.length) continue;
      if (words.length === 1 && !/s$/.test(words[0]) && part !== parts.at(-1)) { merged.push({ head: null, mods: [], pending: true, pendingWords: words }); continue; }
      const prev = merged.at(-1);
      const mods = words.slice(0, -1);
      if (prev && prev.head === null) { merged.pop(); mods.unshift(...prev.pendingWords); }
      merged.push({ head: words.at(-1), mods });
    }
    for (const m of merged) if (m.head) heads.push({ head: m.head, mods: m.mods.filter((w) => w !== m.head) });
  }
  return heads;
}

// Words with more than one sense in a brief. A photograph and a brief must not read the shared word two ways: a
// kitchen's units are not a trading estate's, a cocktail bar is not a steel bar, a dining table is not a table of
// fees, a crane on a site is not a crane in the reeds. Each sense is known by the words around it.
const SENSES = {
  unit: [/\b(kitchen|fitted|cupboards?|worktops?|wardrobes?|bathroom|vanity)\b/, /\b(workshop|storage|industrial|estate|roller|warehouse|trade|business|light industrial|lock-?up|self[- ]storage|commercial)\b/],
  bar: [/\b(cocktails?|drinks?|stools?|pub|beer|wine|whisky|spirits|bartender|happy hour|counter|pour|glass)\b/, /\b(steel|iron|rebar|metal|reinforc\w*|rods?|bending|welded?)\b/],
  table: [/\b(dining|dinner|chairs?|laid|seats?|tablecloth|wooden|kitchen|cafe|restaurant|glasses|flowers|picnic|desk)\b/, /\b(fees?|rates?|figures?|rows|columns?|results?|prices?|numbers?|data|comparison|timetables?|spreadsheet|schedule of)\b/],
  crane: [/\b(site|tower|jib|lift|lifting|construction|building|block|skyline|steel|cranes)\b/, /\b(birds?|heron|wading|reeds?|marsh|wetlands?|feathers?|wings?|nest|origami|paper)\b/],
};
const senseOf = (word, text) => { const s = SENSES[word]; if (!s) return -1; const hits = s.map((re) => re.test(text)); return hits[0] && !hits[1] ? 0 : hits[1] && !hits[0] ? 1 : -1; };

// States a brief can ask for, and the words that show the other: a finished building is not a site under cranes.
const FINISHED = /\b(finished|completed|complete|done|after|handed over|new build|newly built|built|fitted|refurbished|renovated)\b/;
const UNDERWAY = /\b(under construction|being built|in progress|on site|site|scaffold|scaffolding|cranes?|foundations|groundworks|rebar|rising|frame going up|gutted|stripped out|before)\b/;
const stateOf = (text) => { const f = FINISHED.test(text), u = UNDERWAY.test(text); return f && !u ? 'finished' : u && !f ? 'underway' : null; };

/**
 * How a starter photograph fits a brief: { score, level, why }. Gates first, any of which makes the score 0: the
 * photograph must show the brief's head phrase (its head noun, and one of the head's own modifiers when it has any:
 * "workshop units" needs "workshop", not just "units"); a shared word must be read in the same sense; and a state
 * the brief asks for (finished, under way) must not be contradicted by the photograph's own words. Then each of its
 * shot keywords found in the brief counts, earlier words more, words after the first comma (the detail and the light)
 * less, and words that only name the business ("coffee" on a café page) a third. Words of what it shows count a
 * little. state: the state a brief's siblings ask for, used when the brief names none. level is "fit", or "stand-in" when the match is thin (the head noun only names the business, or little
 * else agrees). loose: relax the head phrase (for completing a set), never the sense or the state.
 */
export function fitDetail(photo, brief, { subjectWords = [], ratio, loose = false, state = null } = {}) {
  const clean = fold(brief).replace(/\b\d+(:\d+)?\b/g, ' ');
  const text = ` ${clean} `;
  const words = briefWords(brief);
  if (!words.length) return { score: 0, level: null, why: 'no words' };
  const photoText = ` ${fold([...(photo.shot ?? []), photo.shows ?? ''].join(' '))} `;
  const photoWords = new Set([...(photo.shot ?? []).flatMap((k) => fold(k).split(/\s+/)), ...briefWords(photo.shows ?? '')].map(stem));
  const has = (w) => photoWords.has(stem(w)) || (photo.shot ?? []).some((k) => holds(` ${fold(k)} `, w));
  // Sense: every shared ambiguous word read the same way.
  for (const w of Object.keys(SENSES)) {
    if (!holds(text, w) || !holds(photoText, w)) continue;
    const a = senseOf(w, text), b = senseOf(w, photoText);
    if (a >= 0 && b >= 0 && a !== b) return { score: 0, level: null, why: `"${w}" means something else here` };
  }
  // State: the photograph must not show the opposite of what the brief asks for.
  const want = stateOf(text) ?? state, shows = stateOf(photoText);
  if (want && shows && want !== shows) return { score: 0, level: null, why: `the brief wants it ${want}, the photograph shows it ${shows}` };
  const generic = (k) => subjectWords.some((w) => stem(fold(w)) === stem(fold(k)));
  // Head phrase.
  const heads = briefHeads(brief);
  let headOk = !heads.length, headGeneric = false;
  for (const { head, mods } of heads) {
    const phraseHit = (photo.shot ?? []).some((k) => k.includes(' ') && holds(text, k) && holds(` ${fold(k)} `, head));
    if (!has(head) && !phraseHit) continue;
    const realMods = mods.filter((m) => !generic(m));
    if (realMods.length && !phraseHit && !realMods.some(has)) continue;
    headOk = true;
    headGeneric = generic(head) && !realMods.some(has) && !phraseHit;
    if (!headGeneric) break;
  }
  if (!headOk && !loose) return { score: 0, level: null, why: `does not show ${heads.map((h) => [...h.mods, h.head].join(' ')).join(' or ')}` };
  const firstClause = briefWords(clean.split(/[,;.]/)[0]).length;
  const at = (k) => { const i = words.findIndex((w) => holds(` ${w} `, k.split(' ')[0])); return i < 0 ? words.length : i; };
  let s = 0;
  const seen = new Set();
  for (const k of photo.shot ?? []) {
    if (!holds(text, k)) continue;
    const key = stem(fold(k).split(' ').at(-1));
    if (seen.has(key)) continue;
    seen.add(key);
    const i = at(k);
    s += (generic(k) ? 0.3 : 1) * (k.includes(' ') ? 1.3 : 1) * (i < firstClause ? 1 : 0.6) / (1 + i * 0.15);
  }
  for (const w of briefWords(photo.shows ?? '')) if (!seen.has(stem(w)) && words.some((x) => stem(x) === stem(w))) { seen.add(stem(w)); s += 0.2 * (generic(w) ? 0.3 : 1); }
  // A tall panel prefers a tall or square picture; a wide one a wide picture. A small nudge: the crop and focal
  // point handle the rest.
  if (ratio && photo.orientation) s -= (ratio < 0.95 && photo.orientation === 'wide') || (ratio > 1.15 && photo.orientation === 'tall') ? 0.1 : 0;
  const level = !headOk || headGeneric || s < 1.2 ? 'stand-in' : 'fit';
  return { score: s, level, why: '' };
}

/** fitDetail's score alone. */
export const fitScore = (photo, brief, opts) => fitDetail(photo, brief, opts).score;

/**
 * Give each brief the best starter photograph, each photograph once. Pairs are taken best first across the whole
 * page (so an early, loose brief cannot take the picture a later brief names outright), and once a picture is
 * chosen, pictures of the same tone get a small lift, so the set holds together.
 * briefs: [{ key, shot, weight? }] (weight above 1: the hero, which chooses first). Returns Map key → { photo, score,
 * level }: level "stand-in" marks a thin match (see fitDetail).
 */
export function assignStarters(set, briefs, { ratio, min = 0.9, subject = '' } = {}) {
  // Only the words that name this business count as generic ("coffee" for a coffee shop); the set's own words
  // ("extension" for a builder) are what its pictures show.
  const subjectWords = fold(subject).split(/[^a-z]+/).filter((w) => w.length > 2);
  const pairs = [];
  for (const b of briefs) for (const p of set.photos ?? []) {
    const { score: s, level } = fitDetail(p, b.shot, { subjectWords, ratio });
    if (s >= min) pairs.push({ b, p, s, level });
  }
  const out = new Map(), used = new Set(), tones = {};
  while (pairs.length) {
    const lift = (x) => x.s + ((x.b.weight ?? 1) > 1 ? 100 : 0) + (Object.keys(tones).length ? 0.08 * (tones[x.p.tone] ?? 0) / Math.max(...Object.values(tones)) : 0);
    pairs.sort((a, b) => lift(b) - lift(a));
    const top = pairs.shift();
    if (out.has(top.b.key) || used.has(top.p.id)) continue;
    out.set(top.b.key, { photo: top.p, score: +top.s.toFixed(3), level: top.level });
    used.add(top.p.id);
    tones[top.p.tone] = (tones[top.p.tone] ?? 0) + 1;
    for (let i = pairs.length - 1; i >= 0; i--) if (pairs[i].b.key === top.b.key || pairs[i].p.id === top.p.id) pairs.splice(i, 1);
  }
  return out;
}

/**
 * Finish a set of sibling panels (one gallery, one grid): when most of them have a photograph, half photographs
 * and half drawings reads as broken, so each empty one gets the closest unused photograph of the set (shot words
 * without the subject rule, then the set's prevailing tone). These are stand-ins: say so, and replace them with
 * the business's own pictures. briefs: [{ key, shot }] still empty; chosen: the photographs already used;
 * siblings: the section's briefs, whose prevailing state (finished, under way) a brief that names none takes.
 */
export function completeSet(set, briefs, chosen, { ratio, subject = '', siblings = [] } = {}) {
  // A gallery of finished work is finished throughout: a brief that names no state takes its siblings'.
  const states = siblings.map((x) => stateOf(` ${fold(x)} `));
  const f = states.filter((x) => x === 'finished').length, u = states.filter((x) => x === 'underway').length;
  const state = f > u ? 'finished' : u > f ? 'underway' : null;
  const subjectWords = fold(subject).split(/[^a-z]+/).filter((w) => w.length > 2);
  const used = new Set(chosen.map((p) => p.id));
  const tones = {};
  for (const p of chosen) tones[p.tone] = (tones[p.tone] ?? 0) + 1;
  const out = new Map();
  for (const b of briefs) {
    const best = (set.photos ?? []).filter((p) => !used.has(p.id) && !fitDetail(p, b.shot, { subjectWords, loose: true, state }).why)
      .map((p) => ({ p, s: fitScore(p, b.shot, { subjectWords, ratio, loose: true }) + 0.3 * (tones[p.tone] ?? 0) / Math.max(1, chosen.length) - (ratio && ratio < 0.95 && p.orientation === 'wide' ? 0.05 : 0) }))
      .sort((x, y) => y.s - x.s)[0];
    if (!best) break;
    out.set(b.key, { photo: best.p, score: +best.s.toFixed(3), standIn: true });
    used.add(best.p.id);
    tones[best.p.tone] = (tones[best.p.tone] ?? 0) + 1;
  }
  return out;
}

/** A starter photograph as a find-images candidate. */
export function starterCandidate(set, p) {
  return {
    source: 'starter', set: set.id, id: p.id, provider: p.provider ?? 'wikimedia', title: p.title, creator: p.creator, licence: p.licence, licenceUrl: p.licenceUrl ?? '',
    page: p.page, url: p.url, width: p.width, height: p.height, needsCredit: false, focus: p.focus ?? null, shows: p.shows, tone: p.tone, orientation: p.orientation, tags: p.shot ?? [],
  };
}
