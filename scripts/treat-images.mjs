#!/usr/bin/env node
// Art-direct pictures as one set: one aspect ratio, one colour grade from the page's palette, contrast and colour
// brought to the same level, a focal point for phone crops, and WebP files at 640, 1080 and 1600 px (never
// upscaled). find-images.mjs runs this on every photograph it downloads; use it directly for the person's own.
//
//   node scripts/treat-images.mjs shop.jpg mug.jpg@50,35 --out images --ratio 4/5 --palette sage-clay
//   node scripts/treat-images.mjs --page index.html --out images        # every local <img> in the page, rewritten
//
// --grade tint (default: shadows towards the palette's ink, highlights towards its paper, a little accent in the
// mid-tones), duotone (ink to paper), mono, warm, cool, natural (levels only) or none (crop and resize only).
// The palette comes from --palette, --profile taste-profile.json, or the page's taste-profile.json / data-palette.
// file@x,y (per cent or 0..1) or --focus x,y sets the focal point by hand; otherwise it is found from the picture.
// The work runs in headless Chromium through Playwright; without it the files are copied as they are.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { GRADES, paletteColours, parseFocus, parseRatio, treatImages, WIDTHS } from './lib/image-treat.mjs';
import { imgTag, onFirstScreen, writeCredits } from './lib/image-html.mjs';
import { imageSize } from './lib/image-size.mjs';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); if (i < 0) return def; const v = args[i + 1]; args.splice(i, 2); return v; };
const flag = (name) => { const i = args.indexOf(`--${name}`); if (i < 0) return false; args.splice(i, 1); return true; };
const pageArg = opt('page', null);
const out = resolve(opt('out', pageArg ? join(dirname(resolve(pageArg)), 'images') : 'images'));
const ratioArg = opt('ratio', null);
const grade = opt('grade', 'tint');
const palette = opt('palette', null);
const profile = opt('profile', null);
const focus = parseFocus(opt('focus', null));
const quality = Math.min(0.95, Math.max(0.4, Number(opt('quality', '0.8')) || 0.8));
const widths = (opt('widths', '') || '').split(',').map(Number).filter((n) => n > 0);
const asJson = flag('json');
if (!GRADES.includes(grade)) { console.error(`--grade must be one of ${GRADES.join(', ')}`); process.exit(2); }
if (!pageArg && !args.length) {
  console.error('Usage: node scripts/treat-images.mjs <file[@x,y]>… [--out images] [--ratio 4/5] [--grade tint|duotone|mono|warm|cool|natural|none] [--palette <id> | --profile taste-profile.json] [--focus x,y]\n       node scripts/treat-images.mjs --page index.html [--out images] […]');
  process.exit(2);
}

const STANDARD = [[4, 5], [1, 1], [3, 2], [16, 9], [3, 4], [5, 4]];
/** The standard ratio most of the pictures already have, so the set loses as little as possible. */
const commonRatio = (files) => {
  const votes = {};
  for (const f of files) {
    const s = imageSize(readFileSync(f));
    if (!s?.width) continue;
    const r = s.width / s.height;
    const [w, h] = STANDARD.reduce((a, b) => (Math.abs(b[0] / b[1] - r) < Math.abs(a[0] / a[1] - r) ? b : a));
    votes[`${w}/${h}`] = (votes[`${w}/${h}`] ?? 0) + 1;
  }
  return Object.entries(votes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '4/5';
};
const stem = (f) => basename(f, extname(f)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'picture';
const colours = paletteColours({ palette, profile, page: pageArg ? resolve(pageArg) : undefined });

if (!pageArg) {
  const jobs = args.map((a) => { const [f, fc] = a.split('@'); return { input: resolve(f), name: stem(f), focus: parseFocus(fc) ?? focus }; });
  const missing = jobs.filter((j) => !existsSync(j.input));
  if (missing.length) { console.error(`Not found: ${missing.map((j) => j.input).join(', ')}`); process.exit(2); }
  const ratio = parseRatio(ratioArg ?? commonRatio(jobs.map((j) => j.input)));
  const results = await treatImages(jobs, { out, ratio, widths: widths.length ? widths : WIDTHS, quality, grade, colours });
  record(results);
  if (asJson) { console.log(JSON.stringify(results, null, 2)); process.exit(0); }
  for (const r of results) {
    if (r.warning) console.log(`! ${r.warning}`);
    console.log(`${basename(r.input)} → ${r.files.map((f) => `${f.file} (${Math.round(f.bytes / 1024)} kB)`).join(', ')}${r.treated ? `\n  ${r.grade} grade on ${r.palette}, focus ${Math.round(r.focus.x * 100)}% ${Math.round(r.focus.y * 100)}% (${r.focusFrom})` : ''}\n  ${imgTag(r, { base: relative(process.cwd(), out), alt: '<what it shows>' })}`);
  }
  process.exit(0);
}

// ------------------------------------------------------------------ every local picture in a page
const page = resolve(pageArg);
let html = readFileSync(page, 'utf8');
const imgs = [...html.matchAll(/<img\b[^>]*>/g)].filter((m) => !/\bsrcset=/.test(m[0]) && !/data-treated/.test(m[0])).map((m) => {
  const src = /\bsrc="([^"]+)"/.exec(m[0])?.[1] ?? '';
  return { m, src, file: src && !/^(https?:|data:|\/\/)/.test(src) && !/\.(svg|gif)$/i.test(src) ? resolve(dirname(page), decodeURI(src)) : null };
}).filter((x) => x.file && existsSync(x.file));
if (!imgs.length) { console.log('No local pictures to treat on this page (pictures with a srcset are left alone).'); process.exit(0); }
const ratio = parseRatio(ratioArg ?? commonRatio(imgs.map((x) => x.file)));
const seen = new Map();
const jobs = imgs.map((x) => { let n = stem(x.file); const k = (seen.get(n) ?? 0) + 1; seen.set(n, k); if (k > 1) n = `${n}-${k}`; return { input: x.file, name: n, focus: parseFocus(/data-focus="([^"]+)"/.exec(x.m[0])?.[1]) ?? focus }; });
const results = await treatImages(jobs, { out, ratio, widths: widths.length ? widths : WIDTHS, quality, grade, colours });
record(results);
const first = imgs.findIndex((x) => onFirstScreen(html, x.m.index));
for (let i = imgs.length - 1; i >= 0; i--) {
  const { m } = imgs[i], r = results[i];
  if (r.warning) console.log(`! ${r.warning}`);
  const alt = /\balt="([^"]*)"/.exec(m[0])?.[1] ?? '';
  const keep = [...m[0].matchAll(/\b(class|id|data-[\w-]+)="[^"]*"/g)].map((a) => a[0]).filter((a) => !a.startsWith('data-focus'));
  const tag = imgTag(r, { base: relative(dirname(page), out).split('\\').join('/'), alt: alt.replace(/&quot;/g, '"').replace(/&amp;/g, '&'), first: i === first, sizes: /data-sizes="([^"]+)"/.exec(m[0])?.[1] });
  html = html.slice(0, m.index) + (keep.length ? tag.replace('<img ', `<img ${keep.join(' ')} `) : tag) + html.slice(m.index + m[0].length);
}
writeFileSync(page, html);
console.log(`${results.length} picture(s) on ${relative(process.cwd(), page)} cropped to ${+ratio.toFixed(3)}, graded (${grade}, ${colours.id}) and saved as WebP in ${relative(process.cwd(), out) || '.'}. The originals were not changed.`);

/** Add the treatment to credits.json (pictures already credited keep their licence fields). */
function record(results) {
  const jf = join(out, 'credits.json');
  const known = existsSync(jf) ? JSON.parse(readFileSync(jf, 'utf8')) : [];
  writeCredits(out, results.map((r) => {
    const prior = known.find((k) => (k.original?.file ?? '') === basename(r.input) || (k.files ?? []).some((f) => r.files.some((g) => g.file === f.file)));
    return {
      file: r.files.at(-1).file, ...(prior ? {} : { title: basename(r.input), creator: 'Own picture', licence: 'Own' }),
      files: r.files, width: r.width, height: r.height, ratio: r.ratio, focus: r.focus, focusFrom: r.focusFrom, grade: r.treated ? r.grade : 'none', palette: r.palette ?? null,
      original: { file: basename(r.input), width: r.source?.width ?? r.width, height: r.source?.height ?? r.height, bytes: readFileSync(r.input).length },
    };
  }));
}
