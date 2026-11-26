#!/usr/bin/env node
// Find openly licensed photographs for a page, art-direct them as one set, and put them where the page's picture
// stand-ins are.
//
//   node scripts/find-images.mjs "stoneware mug kiln"                      # list candidates (nothing is downloaded)
//   node scripts/find-images.mjs "stoneware mug kiln" --pick 2,5 --out ./images
//   node scripts/find-images.mjs --fill index.html --subject "stoneware pottery" --out ./images
//
// Sources: Openverse (Flickr, Wikimedia, museums and more) and Wikimedia Commons, asked one at a time. By default
// only public domain and CC0 pictures are offered, which need no credit; --license by also allows CC BY and
// CC BY-SA, which do. Every picture is recorded in <out>/credits.json and CREDITS.md with its creator, licence,
// source page and treatment.
//
// Treatment (on by default; --no-treat keeps the download as it is): every picture of the set is cropped to one
// ratio, graded to the page's palette, given a focal point, and saved as WebP at 640, 1080 and 1600 px wide (never
// upscaled). The originals stay out of the page folder unless --keep-originals. See scripts/treat-images.mjs.
//
// With --fill, each art panel's data-shot brief is the search: the best match is set as the panel's <img> with
// srcset, sizes, width, height and loading. A panel with no fitting photograph keeps (or gets) a spot
// illustration of the subject (data-motif) instead.
//
// Pictures are a means, not decoration: one ratio per set, the subject itself, never a stranger's face as a
// "customer". See references/images.md.
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { GRADES, paletteColours, parseFocus, parseRatio, treatImages, WIDTHS } from './lib/image-treat.mjs';
import { imgTag, onFirstScreen, writeCredits } from './lib/image-html.mjs';
import { motifSvg, pickMotif } from './lib/image-motifs.mjs';
import { imageSize } from './lib/image-size.mjs';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); if (i < 0) return def; const v = args[i + 1]; args.splice(i, 2); return v; };
const flag = (name) => { const i = args.indexOf(`--${name}`); if (i < 0) return false; args.splice(i, 1); return true; };
const out = resolve(opt('out', 'images'));
const count = Math.max(1, Math.min(30, Number(opt('count', '8'))));
const orientation = opt('orientation', null); // wide | tall | square
const licence = opt('license', opt('licence', 'open')); // open = cc0 + public domain; by = adds CC BY / BY-SA
const pick = (opt('pick', '') || '').split(',').map((s) => Number(s.trim())).filter((n) => n > 0);
const fill = opt('fill', null);
const subject = opt('subject', '');
const ratioArg = opt('ratio', null);
const grade = opt('grade', 'tint');
const palette = opt('palette', null);
const profile = opt('profile', null);
const focusArg = parseFocus(opt('focus', null));
const sizesArg = opt('sizes', null);
const quality = Math.min(0.95, Math.max(0.4, Number(opt('quality', '0.8')) || 0.8));
const noTreat = flag('no-treat');
flag('treat'); // the default; accepted so scripts can say it
const keepOriginals = flag('keep-originals');
const noMotif = flag('no-motif');
const dry = flag('dry-run');
const asJson = flag('json');
const query = args.join(' ').trim();
if (!query && !fill) {
  console.error(`Usage: node scripts/find-images.mjs "<what the picture shows>" [--pick 1,3] [--out ./images] [--orientation wide|tall|square] [--license open|by]
       node scripts/find-images.mjs --fill page.html [--subject "<the business>"] [--out ./images] [--dry-run]
Treatment: [--ratio 4/5] [--grade ${GRADES.join('|')}] [--palette <id> | --profile taste-profile.json] [--focus x,y] [--no-treat] [--keep-originals]`);
  process.exit(2);
}
if (!GRADES.includes(grade)) { console.error(`--grade must be one of ${GRADES.join(', ')}`); process.exit(2); }

// The services, overridable for tests.
const OPENVERSE = process.env.LT_OPENVERSE ?? 'https://api.openverse.org/v1/images/';
const COMMONS = process.env.LT_COMMONS ?? 'https://commons.wikimedia.org/w/api.php';
const UA = { 'User-Agent': 'lumina-taste-image-finder/1.1 (open-source design kit; searches openly licensed photographs, one request at a time)' };
const LICENCES = licence === 'by' ? ['cc0', 'pdm', 'by', 'by-sa'] : ['cc0', 'pdm'];
const MAX_BYTES = 8 * 1024 * 1024;
const MIN_BYTES = 40 * 1024; // smaller than this, a "large" picture is a thumbnail or a graphic

const getJson = async (url) => { const r = await fetch(url, { headers: UA }); if (!r.ok) throw new Error(`${r.status} from ${new URL(url).host}`); return r.json(); };
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'picture';
const strip = (s) => String(s ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

/** Openverse: photographs, large, safe, in the allowed licences. */
async function openverse(q) {
  const u = new URL(OPENVERSE);
  u.searchParams.set('q', q); u.searchParams.set('license', LICENCES.join(',')); u.searchParams.set('category', 'photograph');
  u.searchParams.set('size', 'large'); u.searchParams.set('mature', 'false'); u.searchParams.set('page_size', String(Math.min(20, count * 2 + 4)));
  if (orientation) u.searchParams.set('aspect_ratio', orientation);
  const j = await getJson(u.href);
  return (j.results ?? []).map((r) => ({
    source: 'openverse', provider: r.provider ?? r.source ?? '', title: strip(r.title) || 'Untitled', creator: strip(r.creator) || 'Unknown', licence: `${String(r.license ?? '').toUpperCase()}${r.license_version ? ` ${r.license_version}` : ''}`, licenceUrl: r.license_url,
    page: r.foreign_landing_url, url: r.url, width: r.width ?? 0, height: r.height ?? 0, bytes: r.filesize ?? 0, needsCredit: !['cc0', 'pdm'].includes(r.license ?? ''),
    tags: (r.tags ?? []).map((t) => String(t.name ?? '').toLowerCase()), mature: !!r.mature, licenceCode: r.license ?? '',
  }));
}

/** Wikimedia Commons: bitmaps whose licence metadata is public domain or CC0 (or CC BY with --license by). */
async function commons(q) {
  const u = new URL(COMMONS);
  for (const [k, v] of Object.entries({ action: 'query', format: 'json', generator: 'search', gsrsearch: `filetype:bitmap ${q}`, gsrnamespace: '6', gsrlimit: String(Math.min(20, count * 2 + 4)), prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1800', origin: '*' })) u.searchParams.set(k, v);
  const j = await getJson(u.href);
  return Object.values(j.query?.pages ?? {}).map((p) => {
    const ii = p.imageinfo?.[0] ?? {}, m = ii.extmetadata ?? {};
    const lic = strip(m.LicenseShortName?.value ?? '');
    const open = /public domain|^pd|cc0/i.test(lic), by = /^cc by(-sa)? /i.test(lic);
    if (!open && !(licence === 'by' && by)) return null;
    return {
      source: 'commons', provider: 'wikimedia', title: strip(m.ObjectName?.value ?? p.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, '')), creator: strip(m.Artist?.value ?? 'Unknown'), licence: lic, licenceUrl: strip(m.LicenseUrl?.value ?? ''),
      page: ii.descriptionurl, url: ii.thumburl ?? ii.url, width: ii.width ?? 0, height: ii.height ?? 0, bytes: ii.size ?? 0, needsCredit: !open,
      tags: strip(m.Categories?.value ?? '').toLowerCase().split('|'), mime: ii.mime ?? '', description: strip(m.ImageDescription?.value ?? '').slice(0, 300).toLowerCase(),
    };
  }).filter(Boolean);
}

// Photographs of the thing, not artworks, documents or portraits of it.
const ART = /\b(MET|NGA|DP\d+|painting|paintings|engraving|drawing|lithograph|etching|woodcut|illustration|poster|print|manuscript|holy|saint|madonna|portrait of|plate \d+|fig\.|scan(ned)?|map|diagram|logo|icon|clipart|clip art|vector|cartoon|chart|infographic|screenshot|book page|page \d+|newspaper|stamp|coin|banknote|postcard|catalog(ue)?|advert|advertisement|sculpture|statue|mosaic|fresco|tapestry)\b/i;
// A person as the subject: a "customer", a "team member". Kept out of unattended fills.
const PEOPLE = /\b(portrait|selfie|headshot|face|faces|woman|women|man|men|girl|girls|boy|boys|lady|gentleman|person|people|model|smiling|smile|posing|posed|bride|groom|wedding|family|couple|child|children|kid|kids|baby|crowd|businessman|businesswoman|student|students)\b/i;
// Watermarked or stock-preview sources, and old or archival photographs that rarely suit a current business.
const WATERMARK = /\b(watermark|watermarked|shutterstock|istock|getty|dreamstime|depositphotos|alamy|123rf|preview|sample)\b/i;
const ARCHIVE = /\b(18\d\d|19[0-6]\d)s?\b|\b(archive|archival|historic|historical|vintage|antique|old photo|circa|c\.\s?\d{3,4}|library of congress|national archives)\b/i;

/** Both sources, one request at a time, best first. strict: an unattended fill (Openverse photographs only, no people). */
async function search(q, { strict = false } = {}) {
  const all = [], failed = [];
  for (const fn of strict ? [openverse] : [openverse, commons]) {
    try { all.push(...await fn(q)); } catch (e) { failed.push(e.message); }
  }
  const want = orientation === 'wide' ? 1.5 : orientation === 'tall' ? 0.75 : orientation === 'square' ? 1 : null;
  const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const text = (c) => `${c.title} ${c.page ?? ''} ${(c.tags ?? []).join(' ')} ${c.description ?? ''}`.replace(/[_-]+/g, ' ').toLowerCase();
  const head = (c) => `${c.title} ${c.page ?? ''}`.replace(/[_-]+/g, ' ').toLowerCase();
  const subjectWords = subject.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const stem = (w) => w.replace(/(ies|es|s)$/, '');
  const hits = (c, list) => list.filter((w) => text(c).includes(stem(w))).length;
  const relevant = (c) => hits(c, words) > 0 && (!strict || !subjectWords.length || hits(c, subjectWords) > 0);
  // Large and sharp counts; so does the title naming the thing (a tag alone is weaker); credit-needed and
  // Commons files (more scans and diagrams) count against.
  const score = (c) => Math.min(c.width, 2400) / 2400
    + (want && c.height ? 1 - Math.min(1, Math.abs(c.width / c.height - want)) : 0)
    + 0.35 * Math.min(1, words.filter((w) => head(c).includes(stem(w))).length / Math.max(1, words.length))
    + 0.15 * Math.min(1, hits(c, words) / Math.max(1, words.length))
    - (c.needsCredit ? 0.15 : 0) - (c.source === 'commons' ? 0.25 : 0)
    - (c.height && (c.width / c.height > 2.4 || c.width / c.height < 0.45) ? 0.6 : 0);
  const seen = new Set();
  const why = (c) => {
    if (!c.url) return 'no file';
    if (c.mature) return 'marked mature';
    if (c.width < 1000 || (c.height && c.height < 700)) return 'too small';
    if (c.bytes && c.bytes > MAX_BYTES) return 'over 8 MB';
    if (c.bytes && c.bytes < MIN_BYTES) return 'tiny file';
    if (c.mime && !/^image\/(jpeg|png|webp)$/.test(c.mime)) return `not a photograph (${c.mime})`;
    if (c.licenceCode && !LICENCES.includes(c.licenceCode)) return 'licence';
    if (ART.test(head(c)) || (c.source === 'commons' && ART.test(text(c)))) return 'artwork or document';
    if (WATERMARK.test(text(c))) return 'watermark';
    if (strict && PEOPLE.test(head(c))) return 'people';
    if (strict && ARCHIVE.test(head(c))) return 'archival';
    if (!relevant(c)) return 'off topic';
    if (seen.has(c.url)) return 'duplicate';
    seen.add(c.url);
    return '';
  };
  const judged = all.map((c) => ({ c, reason: why(c) }));
  const list = judged.filter((j) => !j.reason).map((j) => j.c).sort((a, b) => score(b) - score(a)).slice(0, count);
  return { list, failed, rejected: judged.filter((j) => j.reason).map((j) => ({ title: j.c.title, reason: j.reason, page: j.c.page })) };
}

/** Download one picture into a folder outside the page. Returns the saved path. */
async function download(c, dir, name) {
  const r = await fetch(c.url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} downloading ${c.url}`);
  const type = (r.headers.get('content-type') ?? '').split(';')[0];
  if (!/^image\/(jpeg|png|webp)$/.test(type)) throw new Error(`not a photograph (${type || 'unknown type'}): ${c.url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error(`larger than 8 MB (${(buf.length / 1048576).toFixed(1)} MB): ${c.url}`);
  const size = imageSize(buf);
  if (size && (size.width < 640 || size.height < 480) && !process.env.LT_ALLOW_SMALL) throw new Error(`too small (${size.width}×${size.height}): ${c.url}`);
  const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[type] ?? (extname(new URL(c.url).pathname) || '.jpg');
  mkdirSync(dir, { recursive: true });
  let file = join(dir, `${slug(name)}${ext}`);
  for (let i = 2; existsSync(file); i++) file = join(dir, `${slug(name)}-${i}${ext}`);
  writeFileSync(file, buf);
  return file;
}

/**
 * Treat (or copy) a set of downloads into `out` and record their credits. items: [{ c, file, name, focus? }].
 * Returns one result per item (see treatImages), in order.
 */
async function finish(items, ratio) {
  mkdirSync(out, { recursive: true });
  let results;
  if (noTreat) {
    results = items.map(({ file, name }) => {
      const dest = join(out, `${slug(name)}${extname(file)}`);
      copyFileSync(file, dest);
      const buf = readFileSync(dest), size = imageSize(buf) ?? { width: 0, height: 0 };
      return { name: slug(name), files: [{ file: basename(dest), width: size.width, height: size.height, bytes: buf.length }], width: size.width, height: size.height, focus: null, treated: false };
    });
  } else {
    const colours = paletteColours({ palette, profile, page: fill ? resolve(fill) : undefined });
    results = await treatImages(items.map(({ file, name, focus }) => ({ input: file, name: slug(name), focus })), { out, ratio, widths: WIDTHS, quality, grade, colours });
    for (const r of results) if (r.warning) console.log(`! ${r.warning}`);
  }
  if (keepOriginals) for (const it of items) { mkdirSync(join(out, 'originals'), { recursive: true }); copyFileSync(it.file, join(out, 'originals', basename(it.file))); }
  writeCredits(out, items.map(({ c, file }, i) => {
    const r = results[i];
    return {
      file: r.files.at(-1).file, title: c.title, creator: c.creator, licence: c.licence, licenceUrl: c.licenceUrl, source: c.page, provider: c.provider, creditRequired: c.needsCredit,
      files: r.files.map((f) => ({ file: f.file, width: f.width, height: f.height, bytes: f.bytes })),
      width: r.width, height: r.height, ratio: r.ratio ?? null, focus: r.focus ?? null, focusFrom: r.focusFrom ?? null, grade: r.treated ? r.grade : 'none', palette: r.palette ?? null,
      original: { width: r.source?.width ?? c.width, height: r.source?.height ?? c.height, bytes: readFileSync(file).length, kept: keepOriginals ? `originals/${basename(file)}` : null },
    };
  }));
  return results;
}

const line = (c, i) => `${String(i + 1).padStart(2)}. ${c.title.slice(0, 60)}  ·  ${c.creator.slice(0, 32)}  ·  ${c.licence}${c.needsCredit ? ' (credit required)' : ''}  ·  ${c.width}×${c.height}\n    ${c.page ?? c.url}`;
const tmp = mkdtempSync(join(tmpdir(), 'lt-find-'));
const cleanup = () => rmSync(tmp, { recursive: true, force: true });

// ------------------------------------------------------------------ search and pick
if (!fill) {
  const { list, failed, rejected } = await search(query);
  if (asJson) { console.log(JSON.stringify({ query, candidates: list, rejected, failed }, null, 2)); cleanup(); process.exit(0); }
  if (failed.length) console.log(`(Not reached: ${failed.join('; ')})`);
  if (!list.length) { console.log(`No openly licensed photographs found for “${query}”. Try fewer, plainer words, or keep the art panel (it draws the subject: data-motif).`); cleanup(); process.exit(0); }
  console.log(`Openly licensed photographs for “${query}” (${licence === 'by' ? 'public domain, CC0, CC BY' : 'public domain and CC0 only'}):\n`);
  list.forEach((c, i) => console.log(line(c, i)));
  if (!pick.length) { console.log(`\nOpen the source pages and choose the ones that show the subject itself. Then: --pick 1,3 --out ${relative(process.cwd(), out) || '.'}`); cleanup(); process.exit(0); }
  const items = [];
  for (const n of pick) {
    const c = list[n - 1];
    if (!c) { console.error(`No candidate ${n}.`); continue; }
    if (dry) { console.log(`Would download ${n}: ${c.url}`); continue; }
    try { items.push({ c, file: await download(c, tmp, `${query} ${n}`), name: `${query} ${n}`, focus: focusArg }); } catch (e) { console.error(`Skipped ${n}: ${e.message}`); }
  }
  if (items.length) {
    const ratio = parseRatio(ratioArg ?? (orientation === 'wide' ? '3/2' : orientation === 'square' ? '1/1' : '4/5'));
    const results = await finish(items, ratio);
    for (const r of results) console.log(`Saved ${r.files.map((f) => relative(process.cwd(), join(out, f.file))).join(', ')}\n  ${imgTag(r, { base: relative(process.cwd(), out), alt: '<what it shows>' })}`);
    console.log(`Credits: ${relative(process.cwd(), join(out, 'CREDITS.md'))}`);
  }
  cleanup();
  process.exit(0);
}

// ------------------------------------------------------------------ fill a page's picture stand-ins
const page = resolve(fill);
let html = readFileSync(page, 'utf8');
const figs = [...html.matchAll(/<figure\b[^>]*class="[^"]*\blt-art\b[^"]*"[^>]*>/g)];
const inner = (m) => html.slice(m.index + m[0].length, html.indexOf('</figure>', m.index));
const empty = figs.filter((m) => !/<(img|picture|video)\b/.test(inner(m)));
const briefed = empty.filter((m) => /data-shot="[^"]+"/.test(m[0]));
if (!empty.length) { console.log('No empty picture stand-ins (art panels without a photograph) on this page.'); cleanup(); process.exit(0); }
// The brief, minus the photographic notes ("window light, 4:5"), plus the subject, is the search.
const STOP = /^(the|a|an|on|in|of|with|and|from|at|by|through|behind|beside|same|no|people|posed|shot|level|light|morning|evening|soft|side|window|table|counter|alone|pale|wooden|sitting|everyday|bright|across|road|nothing|else|its|their|our|your|one|two|three|four|five|six|full|half|close|wide|top|down|left|right|front|back|overcast|natural|steam|rising|handle|rim)$/i;
// From the most specific search to the plainest: the brief's main words with the subject, the two main words,
// then the subject alone. The first that finds an openly licensed photograph wins.
const queries = (shot) => {
  const words = shot.replace(/\b\d+:\d+\b/g, ' ').split(/[,.;·]/)[0].split(/\s+/).filter((w) => w && !STOP.test(w) && /[a-z]/i.test(w));
  return [...new Set([`${words.slice(0, 3).join(' ')} ${subject}`.trim(), words.slice(0, 2).join(' '), words.slice(-2).join(' '), subject].filter((q) => q.trim().length > 2))];
};
const ratioOf = (tag) => /data-ratio="([\d.]+\/[\d.]+)"/.exec(tag)?.[1] ?? '4/5';
// One ratio for the whole set: the one most panels already use, unless --ratio says otherwise.
const tally = {};
for (const m of briefed) tally[ratioOf(m[0])] = (tally[ratioOf(m[0])] ?? 0) + 1;
const setRatio = parseRatio(ratioArg ?? Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '4/5');
const shotOf = (m) => /data-shot="([^"]+)"/.exec(m[0])?.[1] ?? '';

const chosen = new Map(); // figure index → { c, file, name, shot }
const used = new Set();
for (const m of briefed) {
  const shot = shotOf(m);
  let c = null, q = '';
  for (q of queries(shot)) {
    const { list } = await search(q, { strict: true }).catch(() => ({ list: [] }));
    c = list.find((x) => !used.has(x.url) && (setRatio < 1.2 || x.width >= x.height) && (setRatio > 0.9 || x.height >= x.width * 0.75)) ?? null;
    if (c) break;
  }
  if (!c) { console.log(`No photograph for “${shot.slice(0, 50)}”${q ? ` (last search: “${q}”)` : ''}.`); continue; }
  used.add(c.url);
  if (dry) { console.log(`Would fill “${shot.slice(0, 50)}” with ${c.title.slice(0, 40)} (${c.licence}) from ${c.page ?? c.url}`); continue; }
  try { chosen.set(m.index, { c, file: await download(c, tmp, shot.split(/[,.]/)[0]), name: shot.split(/[,.]/)[0], shot }); } catch (e) { console.log(`Could not use ${c.url}: ${e.message}.`); }
}

const items = [...chosen.entries()];
const results = items.length ? await finish(items.map(([, v]) => ({ ...v, focus: null })), setRatio) : [];
const byIndex = new Map(items.map(([idx], i) => [idx, results[i]]));
const firstIdx = Math.min(...[...byIndex.keys()].filter((i) => onFirstScreen(html, i)), Infinity);

let filled = 0, drawn = 0;
for (const m of [...empty].reverse()) { // from the end, so earlier offsets stay valid
  const start = m.index, openEnd = m.index + m[0].length;
  const r = byIndex.get(start);
  const shot = shotOf(m);
  if (r) {
    const src = relative(dirname(page), out).split('\\').join('/');
    const alt = shot.split(/[,.]/)[0];
    const sizes = /data-sizes="([^"]+)"/.exec(m[0])?.[1] ?? sizesArg ?? undefined;
    let rest = html.slice(openEnd).replace(/^\s*<svg data-part="motif"[\s\S]*?<\/svg>/, '');
    html = html.slice(0, openEnd) + imgTag(r, { base: src, alt, first: start === firstIdx, sizes }) + rest;
    console.log(`Filled “${shot.slice(0, 50)}” with ${r.files.map((f) => f.file).join(', ')} (${chosen.get(start).c.licence}, ${chosen.get(start).c.creator.slice(0, 30)})${r.treated ? `, ${r.grade} grade, focus ${Math.round(r.focus.x * 100)}% ${Math.round(r.focus.y * 100)}%` : ''}`);
    filled++;
    continue;
  }
  // No photograph: keep the art panel, drawn from the subject's own things.
  if (noMotif || dry) continue;
  const has = /<svg data-part="motif"/.test(inner(m));
  const named = /data-motif="([\w-]+)"/.exec(m[0])?.[1];
  const motif = named ?? pickMotif(`${shot} ${subject}`);
  if (!motif) continue;
  const tag = named ? m[0] : m[0].replace(/>$/, ` data-motif="${motif}">`);
  html = html.slice(0, start) + tag + (has ? '' : `\n  ${motifSvg(motif)}`) + html.slice(openEnd);
  if (!has) { drawn++; console.log(`Drew “${motif}” in the panel for “${(shot || 'no brief').slice(0, 50)}”.`); }
}
if (!dry && (filled || drawn)) writeFileSync(page, html);
if (filled) console.log(`\n${filled} picture(s) set on ${relative(process.cwd(), page)}${noTreat ? '' : `, one ratio (${+setRatio.toFixed(3)}) and one grade (${grade})`}. Credits: ${relative(process.cwd(), join(out, 'CREDITS.md'))}. Look at every one: replace any that do not show the subject itself.`);
if (drawn) console.log(`${drawn} art panel(s) drew the subject instead. Look at them too: data-motif="<name>" picks another (scripts/lib/image-motifs.mjs lists them).`);
cleanup();
