// Brand from what you have: a colour, a logo or a saved site becomes a palette, a typeface pairing and a
// tone note. A colour goes straight in; a logo's dominant non-neutral colours are read in headless Chromium
// (canvas pixels, k-means in OKLab, no new dependencies); a site is read by sniff.mjs (its CSS custom
// properties, computed colours and fonts). The accent is then solved the way build-tokens.mjs solves every
// shipped palette's accent: the lightness nearest the brand colour at which text on it and it on the page
// both pass. Every result is contrast-checked against the kit's rules before it is offered.
import { contrast, round, toCss, parseOklch } from '../../scripts/lib/color.mjs';
import { RULES } from '../../scripts/lib/contrast-rules.mjs';
import { pickAccent, fix, MARGIN } from '../../scripts/lib/accent.mjs';

// ---------------------------------------------------------------- colour maths
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
/** 8-bit sRGB → OKLab [L, a, b]. */
export function rgbToLab([r, g, b]) {
  const R = lin(r), G = lin(g), B = lin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
export const labToLch = ([L, a, b]) => [L, Math.hypot(a, b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360];
const lchToLab = ([L, C, H]) => [L, C * Math.cos((H * Math.PI) / 180), C * Math.sin((H * Math.PI) / 180)];
export function hexToRgb(hex) {
  let h = String(hex).trim().replace(/^#/, '');
  if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split('').map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(h)) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
/** Any CSS colour string the kit meets (hex, rgb(), oklch()) → OKLCH, or null. */
export function toLch(str) {
  const s = String(str).trim();
  if (/^oklch\(/.test(s)) return parseOklch(s);
  const rgb = s.startsWith('#') || /^[0-9a-f]{3,8}$/i.test(s) ? hexToRgb(s) : /^rgba?\(/.test(s) ? s.match(/[\d.]+/g).slice(0, 3).map(Number) : null;
  return rgb ? labToLch(rgbToLab(rgb)) : null;
}
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/**
 * The dominant non-neutral colours among sampled pixels: k-means in OKLab, seeded deterministically,
 * clusters ranked by how many pixels they hold. Near-white, near-black, grey and transparent pixels are
 * left out: a logo's colour is what is left when its ground and its ink are taken away.
 * @param {number[][]} pixels [r, g, b, a] in 0–255
 */
export function dominantColours(pixels, k = 4) {
  const pts = [];
  for (const [r, g, b, a = 255] of pixels) {
    if (a < 128) continue;
    const lab = rgbToLab([r, g, b]);
    const C = Math.hypot(lab[1], lab[2]);
    if (C < 0.045 || lab[0] > 0.97 || lab[0] < 0.12) continue;
    pts.push(lab);
  }
  if (!pts.length) return [];
  // Seeds: the most chromatic point, then each next seed the point farthest from those chosen.
  const seeds = [pts.reduce((m, p) => (Math.hypot(p[1], p[2]) > Math.hypot(m[1], m[2]) ? p : m))];
  while (seeds.length < Math.min(k, pts.length)) seeds.push(pts.reduce((m, p) => (Math.min(...seeds.map((s) => dist(s, p))) > Math.min(...seeds.map((s) => dist(s, m))) ? p : m)));
  let centres = seeds.map((s) => [...s]);
  let assign = new Array(pts.length).fill(0);
  for (let it = 0; it < 12; it++) {
    assign = pts.map((p) => centres.reduce((bi, c, i) => (dist(p, c) < dist(p, centres[bi]) ? i : bi), 0));
    centres = centres.map((c, i) => { const mine = pts.filter((_, j) => assign[j] === i); return mine.length ? [0, 1, 2].map((d) => mine.reduce((s, p) => s + p[d], 0) / mine.length) : c; });
  }
  const counts = centres.map((_, i) => assign.filter((a) => a === i).length);
  return centres.map((c, i) => ({ lch: round(labToLch(c)), share: counts[i] / pts.length }))
    .filter((x) => x.share >= 0.04)
    .sort((a, b) => b.share - a.share)
    // Two clusters of the same colour (a gradient in the mark) count once.
    .filter((x, i, all) => all.findIndex((y) => dist(lchToLab(y.lch), lchToLab(x.lch)) < 0.06) === i);
}

// ---------------------------------------------------------------- accent from a brand colour
/**
 * The accent tokens for one mode of a palette, solved from a brand colour the way build-tokens.mjs solves
 * a palette's accent: the lightness nearest the brand's at which ink on the accent passes 4.5:1 and the
 * accent passes 3:1 on the page and the first surface; then accent text that passes 4.5:1 everywhere.
 * @returns {Record<string, string> | null} oklch() strings, or null if no lightness works
 */
export function solveAccent(brand, ...modeTokens) {
  const [, bC, bH] = brand;
  const sets = modeTokens.map((tokens) => Object.fromEntries(Object.entries(tokens).map(([k, v]) => [k, parseOklch(v.oklch ?? v)])));
  // The same solver the shipped palettes are built with, held to every ground it will sit on.
  const best = pickAccent(brand, { grounds: sets.flatMap((t) => [t['bg-canvas'], t['bg-surface-1']]) });
  if (!best) return null;
  // Accent text (links, focus rings) must read on every surface of every mode it is used in.
  const ok = (c) => sets.every((t) => ['bg-canvas', 'bg-surface-1', 'bg-surface-2', 'bg-surface-3', 'accent-soft'].every((k) => !t[k] || contrast(c, t[k]) >= 4.5 + MARGIN));
  let text = null;
  for (let d = 0; d <= 0.6 && !text; d += 0.005) for (const L of [best.solid[0] - d, best.solid[0] + d]) { const c = fix([L, Math.max(bC, 0.02), bH]); if (L > 0 && L < 1 && ok(c)) { text = c; break; } }
  if (!text) return null;
  return { 'accent-solid': toCss(best.solid), 'accent-hover': toCss(best.hover), 'accent-ink': toCss(best.ink), 'accent-text': toCss(text) };
}

/** Every contrast rule the overridden tokens take part in, checked in one mode. Returns the failures. */
export function checkOverrides(tokens, overrides) {
  const t = Object.fromEntries(Object.entries(tokens).map(([k, v]) => [k, v.oklch ?? v]));
  Object.assign(t, overrides);
  t['focus-ring'] = t['accent-text'];
  const fails = [];
  for (const [fg, bgs, min] of RULES) {
    if (!overrides[fg] && !bgs.some((b) => overrides[b])) continue;
    for (const bg of bgs) {
      if (!t[fg] || !t[bg]) continue;
      const r = contrast(parseOklch(t[fg]), parseOklch(t[bg]));
      if (r < min) fails.push(`--${fg} on --${bg} ${r.toFixed(2)}:1 (needs ${min}:1)`);
    }
  }
  return fails;
}

// ---------------------------------------------------------------- palette, type and tone
/** Palettes that are one of the looks models fall back on (references/ai-defaults.md), named by the critic's
 *  own tests, plus the three the kit names outright. A brand colour is never handed one of these. */
const NAMED_DEFAULTS = { 'terminal-phosphor': 'black with one acid colour', 'mono-lime': 'black with one acid colour', 'black-signal': 'black with one acid colour' };
export function defaultLook(p) {
  if (NAMED_DEFAULTS[p.id]) return NAMED_DEFAULTS[p.id];
  const lch = (m, k) => parseOklch(p.modes[m].tokens[k].oklch);
  const inHue = (h, a, b) => h >= a && h <= b;
  for (const m of ['light', 'dark']) {
    const [gL, gC, gH] = lch(m, 'bg-canvas'), [, aC, aH] = lch(m, 'accent-solid');
    if (inHue(aH, 262, 305) && aC >= 0.12) return 'the indigo or violet SaaS default';
    if (m === 'light' && gL >= 0.93 && gC >= 0.006 && gC <= 0.045 && inHue(gH, 55, 100) && ((inHue(aH, 12, 58) && aC >= 0.06) || (inHue(aH, 125, 178) && aC >= 0.04))) return 'cream with a terracotta or forest accent';
    if (m === 'dark' && gL <= 0.24 && aC >= 0.15 && (inHue(aH, 105, 150) || inHue(aH, 18, 52))) return 'black with one acid colour';
  }
  return null;
}

/**
 * The closest shipped palette to a brand colour (accent weighted most, the ground when known), and the
 * accent override that keeps the brand's own colour when no palette is close enough.
 * @param {{ accent: number[], canvas?: number[] | null, mode?: 'light' | 'dark' }} brand  OKLCH
 * @param {any[]} palettes  tokens/palettes/palettes.json palettes
 */
export function fitPalette(brand, palettes, { mode = null } = {}) {
  const m = mode ?? (brand.canvas && brand.canvas[0] < 0.5 ? 'dark' : 'light');
  const a = lchToLab(brand.accent);
  const ranked = palettes.map((p) => {
    const t = p.modes[m].tokens;
    const d = dist(a, lchToLab(parseOklch(t['accent-solid'].oklch))) * 2.5 + (brand.canvas ? dist(lchToLab(brand.canvas), lchToLab(parseOklch(t['bg-canvas'].oklch))) : 0);
    return { p, d, gap: dist(a, lchToLab(parseOklch(t['accent-solid'].oklch))) };
  }).sort((x, y) => x.d - y.d);
  // The nearest palette may be a default look; then the brand colour is set on the nearest palette that is not.
  const best = ranked.find((r) => !defaultLook(r.p)) ?? ranked[0];
  const avoided = best !== ranked[0] ? { id: ranked[0].p.id, name: ranked[0].p.name, look: defaultLook(ranked[0].p) } : null;
  // Close enough: the shipped palette as it is. Otherwise the brand colour, solved for the page.
  let overrides = null, perMode = null, fails = [];
  if (best.gap > 0.06 || avoided) {
    // One override serves both modes (the installer checks it in each), so it is solved against both grounds.
    const own = solveAccent(brand.accent, best.p.modes.light.tokens, best.p.modes.dark.tokens);
    if (own) {
      overrides = own;
      fails = [...checkOverrides(best.p.modes.light.tokens, own).map((f) => `light: ${f}`), ...checkOverrides(best.p.modes.dark.tokens, own).map((f) => `dark: ${f}`)];
    }
    // Each mode solved on its own, as every shipped palette is: the page can carry these even when no single
    // value works in both (a mid green is too light for white text in light mode and too dark on a dark page).
    perMode = { light: solveAccent(brand.accent, best.p.modes.light.tokens), dark: solveAccent(brand.accent, best.p.modes.dark.tokens) };
    if (!perMode.light && !perMode.dark) perMode = null;
    else for (const m2 of ['light', 'dark']) if (perMode[m2]) fails.push(...checkOverrides(best.p.modes[m2].tokens, perMode[m2]).map((f) => `${m2} (own): ${f}`));
  }
  return { palette: best.p.id, name: best.p.name, avoided, mode: m, perMode, gap: +best.gap.toFixed(3), overrides, contrastFailures: fails, alternatives: ranked.filter((r) => r !== best && !defaultLook(r.p)).slice(0, 2).map((r) => r.p.id) };
}

/** A typeface pairing for a brand colour (or the fonts a site already uses), with the reason. */
export function suggestType({ accent, fonts = null, current = null }) {
  if (fonts?.typography) return { typography: fonts.typography, reason: `the site already sets ${fonts.heading?.split(',')[0]?.replace(/["']/g, '') || 'its own face'}; this is the nearest pairing in the kit, so new pages read as the same brand` };
  const [L, C, H] = accent;
  if (C < 0.04) return { typography: 'swiss', reason: 'a black, white or grey mark is carried by its shapes, and a plain grotesk lets them lead' };
  if (L < 0.45 && C < 0.12) return { typography: 'editorial', reason: `a deep, quiet ${H > 200 && H < 300 ? 'blue' : 'colour'} reads as established; a serif headline over a plain body carries that without ornament` };
  if (C >= 0.16 && (H < 70 || H > 330)) return { typography: 'slab', reason: 'a loud warm colour wants sturdy letters that hold their own beside it; a slab headline does' };
  if (C >= 0.14) return { typography: 'geometric', reason: 'a bright, saturated mark pairs with round geometric letters and clean numerals, not a second loud element' };
  if (H > 100 && H < 180) return { typography: 'humanist', reason: 'a soft green reads as calm and approachable; a humanist sans keeps that friendly but adult' };
  if (current) return { typography: current, reason: `a moderate colour asks for nothing in particular, so the subject's own pairing (${current}) stays` };
  return { typography: 'humanist', reason: 'a moderate colour leaves the voice to the type; a humanist sans keeps it plain and readable' };
}

/** One line on what the colour says, so the copy and the page's one risk agree with it. */
export function toneNote([L, C, H]) {
  const warm = H < 90 || H > 330, cool = H > 180 && H < 300;
  if (C < 0.04) return 'Monochrome: let one photograph or one large figure carry the colour, and keep the accent for the action only.';
  if (L < 0.42) return `Deep and ${warm ? 'warm' : cool ? 'cool' : 'grounded'}: it reads as established. Plain, confident copy; space and one dark band rather than more colour.`;
  if (C > 0.17) return `Loud and ${warm ? 'warm' : 'bright'}: use it once, large (the brand band or the bold idea), and keep everything else ink on a quiet ground.`;
  return `${warm ? 'Warm' : cool ? 'Cool' : 'Fresh'} and moderate: it can carry the primary button and one panel; let type and pictures do the rest.`;
}

/** What kind of thing --brand-from was given. */
export function brandSourceKind(src) {
  const s = String(src).trim();
  if (/^#?[0-9a-f]{3}([0-9a-f]{3})?([0-9a-f]{2})?$/i.test(s) || /^(oklch|rgb)a?\(/i.test(s)) return 'colour';
  if (/\.(png|jpe?g|webp|gif|svg)$/i.test(s)) return 'logo';
  if (/^https?:\/\//i.test(s) || /\.html?$/i.test(s) || /^file:/.test(s)) return 'site';
  return null;
}

// ---------------------------------------------------------------- reading the sources
/** Playwright's Chromium from the skill or the project, or null. */
async function chromiumOrNull() {
  const { createRequire } = await import('node:module');
  const { pathToFileURL } = await import('node:url');
  const { join } = await import('node:path');
  for (const base of [import.meta.url, pathToFileURL(join(process.cwd(), 'package.json')).href]) {
    for (const name of ['@playwright/test', 'playwright']) {
      try { const mod = await import(pathToFileURL(createRequire(base).resolve(name)).href); const c = mod.chromium ?? mod.default?.chromium; if (c) return c; } catch { /* next */ }
    }
  }
  return null;
}

/** A logo's pixels, read in headless Chromium: the image drawn onto a 96px canvas, every pixel returned. */
export async function readLogoPixels(file) {
  const { readFileSync } = await import('node:fs');
  const chromium = await chromiumOrNull();
  if (!chromium) throw new Error('Reading a logo needs Playwright: npm i -D @playwright/test && npx playwright install chromium');
  const ext = file.toLowerCase().split('.').pop();
  const mime = { svg: 'image/svg+xml', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }[ext];
  const url = `data:${mime};base64,${readFileSync(file).toString('base64')}`;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    return await page.evaluate(async (src) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const w = img.naturalWidth || 96, h = img.naturalHeight || 96, k = 96 / Math.max(w, h);
      const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      const out = []; for (let i = 0; i < d.length; i += 4) out.push([d[i], d[i + 1], d[i + 2], d[i + 3]]);
      return out;
    }, url);
  } finally { await browser.close(); }
}

/**
 * The whole step: a colour, a logo or a site → palette (shipped, or shipped with the brand's accent solved
 * in), typeface pairing with a reason, tone note, and the flags to install it.
 * @param {string} src  "#e63312", "logo.png", "logo.svg", "./saved/index.html" or "https://…"
 * @param {{ palettes: any[], sniff?: (target: string) => any, current?: string | null }} ctx
 */
export async function brandFrom(src, { palettes, sniff = null, current = null }) {
  const kind = brandSourceKind(src);
  if (!kind) throw new Error(`--brand-from takes a colour (#e63312), a logo (.png, .jpg, .svg, .webp) or a site (a URL or a saved .html file); got "${src}".`);
  let accent = null, canvas = null, colours = [], fonts = null;
  if (kind === 'colour') { accent = toLch(src.startsWith('#') || /^(oklch|rgb)/i.test(src) ? src : `#${src}`); colours = [{ lch: accent, share: 1 }]; }
  else if (kind === 'logo') {
    colours = dominantColours(await readLogoPixels(src));
    accent = colours[0]?.lch ?? null;
  } else {
    if (!sniff) throw new Error('Reading a site needs sniff.mjs.');
    const s = sniff(src);
    const brandVar = (s.brandColours ?? [])[0];
    accent = brandVar ? toLch(brandVar.value) : s.measured.accent ? parseOklch(s.measured.accent) : null;
    canvas = s.measured.canvas ? parseOklch(s.measured.canvas) : null;
    colours = (s.brandColours ?? []).map((v) => ({ lch: toLch(v.value), from: v.name })).filter((c) => c.lch);
    fonts = { heading: s.measured.heading, body: s.measured.body, typography: s.profile.typography };
  }
  if (!accent) return { kind, src, colours, palette: null, note: 'No brand colour found (the mark is black, white or grey). Keep a shipped palette and let the type carry the brand.', type: suggestType({ accent: [0.2, 0, 0], fonts, current }), tone: toneNote([0.2, 0, 0]) };
  const fit = fitPalette({ accent, canvas }, palettes);
  const type = suggestType({ accent, fonts, current });
  const flags = [`--palette ${fit.palette}`, `--mode ${fit.mode}`, `--type ${type.typography}`, ...Object.entries(fit.overrides ?? {}).map(([k, v]) => `--override ${k}="${v}"`)];
  const why = fit.avoided ? `The nearest shipped palette, ${fit.avoided.name}, is ${fit.avoided.look}, one of the looks every model falls back on, so the brand colour is set on ${fit.name}'s ground instead. ` : '';
  const note = why + (fit.overrides ? `The brand colour is its own, so the ${fit.name} palette carries it as a solved accent (contrast-checked in light and dark).`
    : fit.perMode ? `The brand colour is its own and no single shade of it passes contrast in both light and dark, so each mode gets its own shade (solved like a shipped palette's accent) and a draft carries them in a <style> block. The install command keeps the ${fit.name} accent, because a profile override is one value for both modes.`
    : fit.gap > 0.06 ? `The brand colour cannot be a button colour in both light and dark and still pass contrast, so the ${fit.name} palette keeps its own accent. Use the brand colour where text does not sit on it at small sizes: the bold idea's panel (style="--art: ${toCss(accent)}") or one large figure.`
    : `The ${fit.name} palette is within a step of the brand colour, so it is used as it is.`);
  return { kind, src, colours: colours.map((c) => ({ ...c, css: toCss(c.lch) })), accent: toCss(accent), ...fit, type, tone: toneNote(accent), note, flags };
}
