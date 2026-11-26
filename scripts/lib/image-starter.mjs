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

/**
 * How well a starter photograph fits a brief. A brief names its subject first ("Corner building, shop front at
 * ground floor…", "The bakery counter with buns…"), so: the photograph must show one of the brief's first two
 * words that are not just the business itself, or it does not fit at all; then each of its shot keywords found in
 * the brief counts, earlier words more, words after the first comma (the detail and the light) less, and words that
 * only name the business ("coffee" on a café page) a third. Words of what it shows count a little.
 */
export function fitScore(photo, brief, { subjectWords = [], ratio, loose = false } = {}) {
  const clean = fold(brief).replace(/\b\d+(:\d+)?\b/g, ' ');
  const text = ` ${clean} `;
  const words = briefWords(brief);
  if (!words.length) return 0;
  const firstClause = briefWords(clean.split(/[,;.]/)[0]).length;
  const generic = (k) => subjectWords.some((w) => stem(fold(w)) === stem(fold(k)));
  const at = (k) => { const i = words.findIndex((w) => holds(` ${w} `, k.split(' ')[0])); return i < 0 ? words.length : i; };
  const head = words.filter((w) => !generic(w)).slice(0, 2);
  let s = 0, headHit = false;
  const seen = new Set();
  for (const k of photo.shot ?? []) {
    if (!holds(text, k)) continue;
    const key = stem(fold(k).split(' ').at(-1));
    if (seen.has(key)) continue;
    seen.add(key);
    const i = at(k);
    if (!generic(k) && head.some((w) => holds(` ${w} `, k.split(' ')[0]) || holds(` ${k} `, w))) headHit = true;
    s += (generic(k) ? 0.3 : 1) * (k.includes(' ') ? 1.3 : 1) * (i < firstClause ? 1 : 0.6) / (1 + i * 0.15);
  }
  if (!headHit && !loose) return 0;
  for (const w of briefWords(photo.shows ?? '')) if (!seen.has(stem(w)) && words.some((x) => stem(x) === stem(w))) { seen.add(stem(w)); s += 0.2 * (generic(w) ? 0.3 : 1); }
  // A tall panel prefers a tall or square picture; a wide one a wide picture. A small nudge: the crop and focal
  // point handle the rest.
  if (ratio && photo.orientation) s -= (ratio < 0.95 && photo.orientation === 'wide') || (ratio > 1.15 && photo.orientation === 'tall') ? 0.1 : 0;
  return s;
}

/**
 * Give each brief the best starter photograph, each photograph once. Pairs are taken best first across the whole
 * page (so an early, loose brief cannot take the picture a later brief names outright), and once a picture is
 * chosen, pictures of the same tone get a small lift, so the set holds together.
 * briefs: [{ key, shot, weight? }] (weight above 1: the hero, which chooses first). Returns Map key → { photo, score }.
 */
export function assignStarters(set, briefs, { ratio, min = 0.9, subject = '' } = {}) {
  // Only the words that name this business count as generic ("coffee" for a coffee shop); the set's own words
  // ("extension" for a builder) are what its pictures show.
  const subjectWords = fold(subject).split(/[^a-z]+/).filter((w) => w.length > 2);
  const pairs = [];
  for (const b of briefs) for (const p of set.photos ?? []) {
    const s = fitScore(p, b.shot, { subjectWords, ratio });
    if (s >= min) pairs.push({ b, p, s });
  }
  const out = new Map(), used = new Set(), tones = {};
  while (pairs.length) {
    const lift = (x) => x.s + ((x.b.weight ?? 1) > 1 ? 100 : 0) + (Object.keys(tones).length ? 0.08 * (tones[x.p.tone] ?? 0) / Math.max(...Object.values(tones)) : 0);
    pairs.sort((a, b) => lift(b) - lift(a));
    const top = pairs.shift();
    if (out.has(top.b.key) || used.has(top.p.id)) continue;
    out.set(top.b.key, { photo: top.p, score: +top.s.toFixed(3) });
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
 * the business's own pictures. briefs: [{ key, shot }] still empty; chosen: the photographs already used.
 */
export function completeSet(set, briefs, chosen, { ratio, subject = '' } = {}) {
  const subjectWords = fold(subject).split(/[^a-z]+/).filter((w) => w.length > 2);
  const used = new Set(chosen.map((p) => p.id));
  const tones = {};
  for (const p of chosen) tones[p.tone] = (tones[p.tone] ?? 0) + 1;
  const out = new Map();
  for (const b of briefs) {
    const best = (set.photos ?? []).filter((p) => !used.has(p.id))
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
