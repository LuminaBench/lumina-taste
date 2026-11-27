// The person's own media, read before anything is searched for: photographs, a logo, video, a menu or price list.
// scanMedia() lists a folder, says what each file is and what it shows (from media.json, written by the person or
// by the agent after looking at each picture, else from the file name); assignMine() matches photographs to a
// page's picture slots, best fit first, then fills the rest in page order, because the business's own picture of
// its own place beats any stock photograph; menuFrom() reads a plain-text menu or price list into brief facts.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { imageSize } from './image-size.mjs';

const PHOTO = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const VIDEO = new Set(['.mp4', '.mov', '.webm', '.m4v']);
const TEXT = new Set(['.txt', '.md', '.csv']);
const STOP = /^(img|image|photo|photograph|picture|pic|dsc|dscn|pxl|final|copy|edit|edited|new|old|web|hi|hires|lo|v\d+|\d+|the|a|an|of|and|with|at|in|on|for|our|my)$/i;

/** Words from a file name: "Dining-room_evening 2.JPG" → ["dining", "room", "evening"]. */
export function nameWords(file) {
  return file.replace(/\.[a-z0-9]+$/i, '').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 1 && !STOP.test(w));
}

const stem = (w) => w.toLowerCase().replace(/(ies)$/, 'y').replace(/(es|s)$/, '');

/** What a file is, from its type, its name and (for pictures) its shape. */
export function kindOf(file, size = null) {
  const ext = extname(file).toLowerCase();
  const words = nameWords(file);
  if (ext === '.svg' || words.some((w) => /^(logo|logotype|wordmark|mark|icon|badge|emblem|monogram)$/.test(w))) return 'logo';
  if (VIDEO.has(ext)) return 'video';
  if (ext === '.pdf' || (TEXT.has(ext) && words.some((w) => /^(menu|menus|prices|price|pricelist|tariff|rates|list|services|treatments)$/.test(w)))) return 'menu';
  if (TEXT.has(ext)) return 'text';
  if (/^\.(woff2?|ttf|otf)$/.test(ext)) return 'font';
  if (PHOTO.has(ext)) {
    // A small square PNG is a mark more often than a photograph.
    if (ext === '.png' && size && Math.abs(size.width - size.height) < size.width * 0.1 && size.width <= 1024 && words.length <= 2) return 'logo';
    return 'photo';
  }
  return 'other';
}

/** Read a folder of the person's media. media.json beside the files ({ "file": "…", "shows": "…", "use": "hero" }) wins over the name. */
export function scanMedia(dir) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) throw new Error(`No folder at ${dir}`);
  let notes = [];
  const mf = join(dir, 'media.json');
  if (existsSync(mf)) { try { const j = JSON.parse(readFileSync(mf, 'utf8')); notes = Array.isArray(j) ? j : j.files ?? []; } catch (e) { throw new Error(`media.json is not valid JSON: ${e.message}`); } }
  const note = (f) => notes.find((n) => n.file === f) ?? {};
  const items = [];
  for (const f of readdirSync(dir).sort()) {
    if (f.startsWith('.') || f === 'media.json') continue;
    const path = join(dir, f);
    if (!statSync(path).isFile()) continue;
    const ext = extname(f).toLowerCase();
    const buf = PHOTO.has(ext) ? readFileSync(path) : null;
    const size = buf ? imageSize(buf) : null;
    const n = note(f);
    const kind = n.kind ?? kindOf(f, size);
    const shows = n.shows ?? null;
    items.push({
      file: f, path, kind, shows, use: n.use ?? null, focus: n.focus ?? null,
      width: size?.width ?? null, height: size?.height ?? null,
      orientation: size ? (size.width > size.height * 1.15 ? 'wide' : size.height > size.width * 1.15 ? 'tall' : 'square') : null,
      words: [...new Set([...nameWords(f), ...(shows ? nameWords(shows) : [])])],
      small: !!size && Math.max(size.width, size.height) < 1200,
    });
  }
  return items;
}

/**
 * Match the person's photographs to a page's slots. slots: [{ key, shot, weight }] in page order (the first screen
 * first). Returns Map key → { item, score, how: 'match' | 'named' | 'order' }. A media.json "use" ("hero", "rail",
 * a word from a brief) places a picture outright; then the best word matches; then the rest in page order.
 */
export function assignMine(items, slots) {
  // A photograph the check found unusable (out of focus, tiny, unreadable) is not placed; one that is usable but
  // not fit to lead (dark, soft, small) is kept out of the first screen when another can lead.
  const photos = items.filter((i) => i.kind === 'photo' && i.check?.fit !== false);
  const canLead = (it) => it.check?.hero !== false;
  const leads = photos.some(canLead);
  const heroSlot = (i) => i === 0 && (slots[0]?.weight ?? 1) > 1;
  const out = new Map(), used = new Set();
  const words = (s) => String(s).toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2 && !STOP.test(w)).map(stem);
  const sw = slots.map((s) => new Set(words(s.shot)));
  // Named uses first: "hero" is the first slot; any other word goes to the first slot whose brief holds it.
  for (const it of photos) {
    if (!it.use) continue;
    const k = it.use === 'hero' ? 0 : slots.findIndex((s, i) => !out.has(s.key) && sw[i].has(stem(it.use)));
    if (k >= 0 && !out.has(slots[k].key)) { out.set(slots[k].key, { item: it, score: 99, how: 'named' }); used.add(it.file); }
  }
  // Then word matches, the strongest pair first.
  const pairs = [];
  for (const it of photos) {
    if (used.has(it.file)) continue;
    const iw = new Set(it.words.map(stem));
    slots.forEach((s, i) => { if (heroSlot(i) && leads && !canLead(it)) return; const hit = [...sw[i]].filter((w) => iw.has(w)).length; if (hit) pairs.push({ it, s, score: hit * (s.weight ?? 1) }); });
  }
  pairs.sort((a, b) => b.score - a.score);
  for (const p of pairs) { if (used.has(p.it.file) || out.has(p.s.key)) continue; out.set(p.s.key, { item: p.it, score: p.score, how: 'match' }); used.add(p.it.file); }
  // The rest in page order: the business's own picture of its own place beats any stock photograph. Wide pictures
  // go to the first screen, the others follow.
  const rest = photos.filter((it) => !used.has(it.file)).sort((a, b) => (canLead(b) - canLead(a)) || ((b.orientation === 'wide') - (a.orientation === 'wide')));
  slots.forEach((s, i) => {
    if (!rest.length || out.has(s.key)) return;
    const k = heroSlot(i) && leads ? rest.findIndex(canLead) : 0;
    if (k < 0) return;
    const [it] = rest.splice(k, 1); out.set(s.key, { item: it, score: 0, how: 'order' }); used.add(it.file);
  });
  return out;
}

/** Look at each photograph (size, exposure, focus) in a browser, when there is one; see photo-check.mjs. */
export async function checkMine(items, from = import.meta.url) {
  const { loadChromium } = await import('./browser.mjs');
  const { checkPhotos } = await import('./photo-check.mjs');
  const chromium = await loadChromium(from).catch(() => null);
  const photos = items.filter((i) => i.kind === 'photo');
  if (!chromium || !photos.length) return items;
  const checked = await checkPhotos(photos, { chromium, use: (it) => (it.use === 'hero' ? 'hero' : 'card') });
  return items.map((i) => checked.find((c) => c.path === i.path) ?? i);
}

/** A plain-text menu or price list ("Margherita £11.50" per line, or "name, price" CSV) as "name £price" phrases. */
export function menuFrom(items) {
  const phrases = [];
  for (const it of items.filter((i) => i.kind === 'menu' && TEXT.has(extname(i.file).toLowerCase()))) {
    for (const raw of readFileSync(it.path, 'utf8').split(/\r?\n/)) {
      const line = raw.replace(/^[-*#\s]+/, '').trim();
      const m = /^(.{2,60}?)[\s.,:–—-]*([£$€]\s?\d+(?:[.,]\d{2})?)\s*$/.exec(line);
      // The name is what comes before the first comma ("Pizza, artichoke and ham" is the pizza).
      if (m) phrases.push(`${m[1].split(/,\s*/)[0].replace(/[\s.,:–—-]+$/, '')} ${m[2].replace(/\s/g, '')}`);
    }
  }
  return phrases;
}
