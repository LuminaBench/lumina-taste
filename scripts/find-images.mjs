#!/usr/bin/env node
// Find openly licensed photographs for a page, and put them where the page's picture stand-ins are.
//
//   node scripts/find-images.mjs "stoneware mug kiln"                      # list candidates (nothing is downloaded)
//   node scripts/find-images.mjs "stoneware mug kiln" --pick 2,5 --out ./images
//   node scripts/find-images.mjs --fill index.html --subject "stoneware pottery" --out ./images
//
// Sources: Openverse (Flickr, Wikimedia, museums and more) and Wikimedia Commons. By default only public domain
// and CC0 pictures are offered, which need no credit; --license by also allows CC BY and CC BY-SA, which do.
// Every downloaded picture is recorded in <out>/CREDITS.md and credits.json with its creator, licence and
// source page. With --fill, each art panel's data-shot brief is the search: the best match is downloaded and
// set as the panel's <img> (the panel's own type steps aside), keeping the brief in data-shot.
//
// Pictures are a means, not decoration: one ratio per set, the subject itself, never a stranger's face as a
// "customer". If nothing fitting is found, keep the art panel. See references/images.md.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';

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
const dry = flag('dry-run');
const asJson = flag('json');
const query = args.join(' ').trim();
if (!query && !fill) {
  console.error('Usage: node scripts/find-images.mjs "<what the picture shows>" [--pick 1,3] [--out ./images] [--orientation wide|tall|square] [--license open|by]\n       node scripts/find-images.mjs --fill page.html [--subject "<the business>"] [--out ./images] [--dry-run]');
  process.exit(2);
}

// The services, overridable for tests.
const OPENVERSE = process.env.LT_OPENVERSE ?? 'https://api.openverse.org/v1/images/';
const COMMONS = process.env.LT_COMMONS ?? 'https://commons.wikimedia.org/w/api.php';
const UA = { 'User-Agent': 'lumina-taste-image-finder/1.0 (design kit; finds openly licensed photographs)' };
const LICENCES = licence === 'by' ? ['cc0', 'pdm', 'by', 'by-sa'] : ['cc0', 'pdm'];
const MAX_BYTES = 6 * 1024 * 1024;

const getJson = async (url) => { const r = await fetch(url, { headers: UA }); if (!r.ok) throw new Error(`${r.status} from ${new URL(url).host}`); return r.json(); };
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'picture';
const strip = (s) => String(s ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

/** Openverse: photographs, large, safe, in the allowed licences. */
async function openverse(q) {
  const u = new URL(OPENVERSE);
  u.searchParams.set('q', q); u.searchParams.set('license', LICENCES.join(',')); u.searchParams.set('category', 'photograph');
  u.searchParams.set('size', 'large'); u.searchParams.set('mature', 'false'); u.searchParams.set('page_size', String(Math.min(20, count * 2)));
  if (orientation) u.searchParams.set('aspect_ratio', orientation);
  const j = await getJson(u.href);
  return (j.results ?? []).map((r) => ({
    source: 'openverse', title: strip(r.title) || 'Untitled', creator: strip(r.creator) || 'Unknown', licence: `${String(r.license ?? '').toUpperCase()}${r.license_version ? ` ${r.license_version}` : ''}`, licenceUrl: r.license_url,
    page: r.foreign_landing_url, url: r.url, width: r.width ?? 0, height: r.height ?? 0, bytes: r.filesize ?? 0, needsCredit: !['cc0', 'pdm'].includes(r.license ?? ''),
  }));
}

/** Wikimedia Commons: bitmaps whose licence metadata is public domain or CC0 (or CC BY with --license by). */
async function commons(q) {
  const u = new URL(COMMONS);
  for (const [k, v] of Object.entries({ action: 'query', format: 'json', generator: 'search', gsrsearch: `filetype:bitmap ${q}`, gsrnamespace: '6', gsrlimit: String(Math.min(20, count * 2)), prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiurlwidth: '1800', origin: '*' })) u.searchParams.set(k, v);
  const j = await getJson(u.href);
  return Object.values(j.query?.pages ?? {}).map((p) => {
    const ii = p.imageinfo?.[0] ?? {}, m = ii.extmetadata ?? {};
    const lic = strip(m.LicenseShortName?.value ?? '');
    const open = /public domain|^pd|cc0/i.test(lic), by = /^cc by(-sa)? /i.test(lic);
    if (!open && !(licence === 'by' && by)) return null;
    return {
      source: 'commons', title: strip(m.ObjectName?.value ?? p.title.replace(/^File:/, '').replace(/\.[a-z]+$/i, '')), creator: strip(m.Artist?.value ?? 'Unknown'), licence: lic, licenceUrl: strip(m.LicenseUrl?.value ?? ''),
      page: ii.descriptionurl, url: ii.thumburl ?? ii.url, width: ii.thumbwidth ?? ii.width ?? 0, height: ii.thumbheight ?? ii.height ?? 0, bytes: 0, needsCredit: !open,
    };
  }).filter(Boolean);
}

/** Both sources, best first: large enough, the right shape, the allowed licence. */
async function search(q, { strict = false } = {}) {
  // Filling a page unattended uses photograph-first sources only; a person choosing from a list sees both.
  const settled = await Promise.allSettled(strict ? [openverse(q)] : [openverse(q), commons(q)]);
  const failed = settled.filter((s) => s.status === 'rejected').map((s) => s.reason.message);
  const all = settled.flatMap((s) => (s.status === 'fulfilled' ? s.value : []));
  const want = orientation === 'wide' ? 1.5 : orientation === 'tall' ? 0.75 : orientation === 'square' ? 1 : null;
  const score = (c) => Math.min(c.width, 2400) / 2400 + (want && c.height ? 1 - Math.min(1, Math.abs(c.width / c.height - want)) : 0) - (c.needsCredit ? 0.15 : 0);
  const seen = new Set();
  // Photographs of the thing, not artworks of it: museum scans, paintings and prints are left out, and a title must
  // share a word with the search (a search for "porridge bowl" should not bring back a painting of a saint).
  const ART = /\b(MET|NGA|DP\d+|painting|engraving|drawing|lithograph|etching|woodcut|illustration|poster|print|manuscript|holy|saint|madonna|portrait of|plate \d+|fig\.|scan(ned)?)\b/i;
  const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const text = (c) => `${c.title} ${c.page ?? ''}`.replace(/[_-]+/g, ' ').toLowerCase();
  const subjectWords = subject.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const relevant = (c) => words.some((w) => text(c).includes(w.replace(/s$/, ''))) && (!strict || !subjectWords.length || subjectWords.some((w) => text(c).includes(w.replace(/s$/, ''))));
  const rank = (c) => score(c) - (c.source === 'commons' ? 0.25 : 0);
  const list = all.filter((c) => c.url && c.width >= 1000 && (!c.bytes || c.bytes <= MAX_BYTES) && !ART.test(text(c)) && relevant(c) && !seen.has(c.url) && seen.add(c.url)).sort((a, b) => rank(b) - rank(a)).slice(0, count);
  return { list, failed };
}

/** Download one picture and record its credit. Returns the saved path. */
async function save(c, name) {
  mkdirSync(out, { recursive: true });
  const r = await fetch(c.url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} downloading ${c.url}`);
  const type = r.headers.get('content-type') ?? '';
  if (!/^image\/(jpeg|png|webp|avif)/.test(type)) throw new Error(`not a picture (${type || 'unknown type'}): ${c.url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error(`larger than 6 MB (${(buf.length / 1048576).toFixed(1)} MB): ${c.url}`);
  const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/avif': '.avif' }[type.split(';')[0]] ?? (extname(new URL(c.url).pathname) || '.jpg');
  let file = join(out, `${slug(name)}${ext}`);
  for (let i = 2; existsSync(file); i++) file = join(out, `${slug(name)}-${i}${ext}`);
  writeFileSync(file, buf);
  credit({ ...c, file: basename(file), bytes: buf.length });
  return file;
}

/** credits.json is the record; CREDITS.md is the same, for people. Credit is required for CC BY pictures. */
function credit(entry) {
  const jf = join(out, 'credits.json');
  const list = existsSync(jf) ? JSON.parse(readFileSync(jf, 'utf8')) : [];
  list.push({ file: entry.file, title: entry.title, creator: entry.creator, licence: entry.licence, licenceUrl: entry.licenceUrl, source: entry.page, creditRequired: entry.needsCredit });
  writeFileSync(jf, JSON.stringify(list, null, 2) + '\n');
  const md = ['# Picture credits', '', 'Openly licensed photographs used on this site. Public domain and CC0 pictures need no credit; it is given here anyway. CC BY pictures must be credited where they appear or on a credits page.', '',
    '| File | Picture | By | Licence | Source |', '| --- | --- | --- | --- | --- |',
    ...list.map((e) => `| ${e.file} | ${e.title.replace(/\|/g, '/')} | ${e.creator.replace(/\|/g, '/')} | ${e.licenceUrl ? `[${e.licence}](${e.licenceUrl})` : e.licence}${e.creditRequired ? ' (credit required)' : ''} | ${e.source ? `[page](${e.source})` : ''} |`)];
  writeFileSync(join(out, 'CREDITS.md'), md.join('\n') + '\n');
}

const line = (c, i) => `${String(i + 1).padStart(2)}. ${c.title.slice(0, 60)}  ·  ${c.creator.slice(0, 32)}  ·  ${c.licence}${c.needsCredit ? ' (credit required)' : ''}  ·  ${c.width}×${c.height}\n    ${c.page ?? c.url}`;

// ------------------------------------------------------------------ search and pick
if (!fill) {
  const { list, failed } = await search(query);
  if (asJson) { console.log(JSON.stringify({ query, candidates: list, failed }, null, 2)); process.exit(0); }
  if (failed.length) console.log(`(Not reached: ${failed.join('; ')})`);
  if (!list.length) { console.log(`No openly licensed photographs found for “${query}”. Try fewer, plainer words, or keep the art panel.`); process.exit(0); }
  console.log(`Openly licensed photographs for “${query}” (${licence === 'by' ? 'public domain, CC0, CC BY' : 'public domain and CC0 only'}):\n`);
  list.forEach((c, i) => console.log(line(c, i)));
  if (!pick.length) { console.log(`\nOpen the source pages and choose the ones that show the subject itself. Then: --pick 1,3 --out ${relative(process.cwd(), out) || '.'}`); process.exit(0); }
  for (const n of pick) {
    const c = list[n - 1];
    if (!c) { console.error(`No candidate ${n}.`); continue; }
    if (dry) { console.log(`Would download ${n}: ${c.url}`); continue; }
    try { console.log(`Saved ${relative(process.cwd(), await save(c, `${query} ${n}`))}`); } catch (e) { console.error(`Skipped ${n}: ${e.message}`); }
  }
  if (!dry) console.log(`Credits: ${relative(process.cwd(), join(out, 'CREDITS.md'))}`);
  process.exit(0);
}

// ------------------------------------------------------------------ fill a page's picture stand-ins
const page = resolve(fill);
let html = readFileSync(page, 'utf8');
const figs = [...html.matchAll(/<figure\b[^>]*class="[^"]*\blt-art\b[^"]*"[^>]*>/g)].filter((m) => /data-shot="[^"]+"/.test(m[0]));
const empty = figs.filter((m) => { const rest = html.slice(m.index + m[0].length, html.indexOf('</figure>', m.index)); return !/<(img|picture|video)\b/.test(rest); });
if (!empty.length) { console.log('No empty picture stand-ins (art panels with data-shot) on this page.'); process.exit(0); }
// The brief, minus the photographic notes ("window light, 4:5"), plus the subject, is the search.
const STOP = /^(the|a|an|on|in|of|with|and|from|at|by|through|behind|beside|same|no|people|posed|shot|level|light|morning|evening|soft|side|window|table|counter|alone|pale|wooden|sitting|everyday|bright|across|road|nothing|else|its|their|our|your|one|two|three|four|five|six|full|half|close|wide)$/i;
// From the most specific search to the plainest: the brief's main words with the subject, the two main words,
// then the subject alone. The first that finds an openly licensed photograph wins.
const queries = (shot) => {
  const words = shot.replace(/\b\d+:\d+\b/g, ' ').split(/[,.;·]/)[0].split(/\s+/).filter((w) => w && !STOP.test(w) && /[a-z]/i.test(w));
  return [...new Set([`${words.slice(0, 3).join(' ')} ${subject}`.trim(), words.slice(-2).join(' '), words.slice(0, 2).join(' '), subject].filter((q) => q.trim().length > 2))];
};
const ratioOf = (tag) => { const r = /data-ratio="([\d.]+)\/([\d.]+)"/.exec(tag); const v = r ? r[1] / r[2] : 0.8; return v > 1.2 ? 'wide' : v < 0.9 ? 'tall' : 'square'; };
let done = 0;
const used = new Set();
for (const m of empty.reverse()) { // from the end, so earlier offsets stay valid
  const shot = /data-shot="([^"]+)"/.exec(m[0])[1];
  let c = null, q = '';
  for (q of queries(shot)) {
    const { list } = await search(q, { strict: true }).catch(() => ({ list: [] }));
    c = list.find((x) => !used.has(x.url) && (orientation || ratioOf(m[0]) !== 'wide' || x.width >= x.height)) ?? null;
    if (c) break;
  }
  if (!c) { console.log(`No match for “${q}”: the art panel stays.`); continue; }
  used.add(c.url);
  if (dry) { console.log(`Would fill “${shot.slice(0, 50)}” with ${c.title.slice(0, 40)} (${c.licence}) from ${c.page ?? c.url}`); continue; }
  try {
    const file = await save(c, shot.split(/[,.]/)[0]);
    const src = relative(dirname(page), file).split('\\').join('/');
    const alt = shot.split(/[,.]/)[0].replace(/"/g, '&quot;');
    html = html.slice(0, m.index + m[0].length) + `<img src="${src}" alt="${alt}" loading="lazy" decoding="async">` + html.slice(m.index + m[0].length);
    console.log(`Filled “${shot.slice(0, 50)}” with ${src} (${c.licence}, ${c.creator.slice(0, 30)})`);
    done++;
  } catch (e) { console.log(`Could not use ${c.url}: ${e.message}. The art panel stays.`); }
}
if (done && !dry) {
  writeFileSync(page, html);
  console.log(`\n${done} picture(s) set on ${relative(process.cwd(), page)}. Credits: ${relative(process.cwd(), join(out, 'CREDITS.md'))}. Look at every one: replace any that do not show the subject itself.`);
}
