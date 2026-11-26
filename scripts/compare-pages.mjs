#!/usr/bin/env node
// Blind side-by-side comparison of two or more pages: ours, another tool's, a reference site saved locally.
//
//   node scripts/compare-pages.mjs ours=out/index.html rival=../other/index.html [ref=saved/site.html …]
//        [--out dir] [--width 1440] [--height 900] [--mode light] [--seed n]
//     Screenshots every page at the same size (the first screen, the whole page up to 8 screens, and the
//     phone's first screen), gives each a random letter, and writes into the folder:
//       A-first.png, A-full.png, A-phone.png, B-…   the pictures, named by letter only
//       sheet.html, sheet.png                         the first screens side by side, by letter
//       judge.md                                      the rubric and what to look at
//       round.json                                    letters, verdicts (no names until a verdict is recorded)
//       .key.json                                     which letter is which source: the judge does not open it
//     A page given without a name is named after its folder.
//
//   node scripts/compare-pages.mjs --record "A>B" --reason "…" --out dir [--tally file]
//     Records the verdict (A>B, A=B, or a ranking A>C>B) in round.json and adds it to the running tally
//     (default: compare-tally.json next to the round folder), then prints the tally per source.
//
//   node scripts/compare-pages.mjs --tally file      prints a tally
//
// Network: only the URLs given. A file page may load files and data: URLs; a served page may load from its
// own origin. Everything else is blocked and counted in round.json, so a remote font or picture cannot
// leak the comparison or change between runs.
import { randomInt } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadChromium, nameOf, settle, toUrl, unfold } from './lib/browser.mjs';

const argv = process.argv.slice(2);
const opt = (name, def) => { const i = argv.indexOf(`--${name}`); if (i < 0) return def; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const record = opt('record', null);
const reason = opt('reason', null);
const tallyArg = opt('tally', null);
const outArg = opt('out', null);
const W = +opt('width', '1440'), H = +opt('height', '900');
const mode = opt('mode', 'light');
const seed = opt('seed', null);
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const readJson = (f, def) => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return def; } };
const writeJson = (f, v) => writeFileSync(f, JSON.stringify(v, null, 2) + '\n');
const tallyPath = (out) => resolve(tallyArg ?? join(dirname(out), 'compare-tally.json'));

/** Pairwise results from a verdict: "A>B>C" gives A over B, A over C, B over C; "A=B" a tie. */
function parseVerdict(v, letters) {
  const groups = v.replace(/\s+/g, '').toUpperCase().split('>').map((g) => g.split('='));
  const flat = groups.flat();
  if (flat.some((l) => !letters.includes(l)) || new Set(flat).size !== flat.length || flat.length < 2) return null;
  const pairs = [];
  for (let i = 0; i < groups.length; i++) {
    for (let a = 0; a < groups[i].length; a++) for (let b = a + 1; b < groups[i].length; b++) pairs.push({ win: null, tie: [groups[i][a], groups[i][b]] });
    for (let j = i + 1; j < groups.length; j++) for (const w of groups[i]) for (const l of groups[j]) pairs.push({ win: w, lose: l });
  }
  return pairs;
}

function printTally(file) {
  const t = readJson(file, { sources: {}, rounds: 0 });
  const rows = Object.entries(t.sources).map(([name, s]) => ({ name, ...s, rate: s.wins + s.losses + s.ties ? (s.wins + s.ties / 2) / (s.wins + s.losses + s.ties) : 0 })).sort((a, b) => b.rate - a.rate);
  console.log(`Tally (${t.rounds} verdict${t.rounds === 1 ? '' : 's'}) · ${file}`);
  console.log(`${'source'.padEnd(18)}${'wins'.padEnd(6)}${'losses'.padEnd(8)}${'ties'.padEnd(6)}win rate`);
  for (const r of rows) console.log(`${r.name.padEnd(18)}${String(r.wins).padEnd(6)}${String(r.losses).padEnd(8)}${String(r.ties).padEnd(6)}${Math.round(r.rate * 100)}%`);
}

// ---------------------------------------------------------------- record a verdict
if (record) {
  if (!outArg) { console.error('--record needs --out <the round folder>'); process.exit(2); }
  if (!reason || reason.trim().split(/\s+/).length < 4) { console.error('--record needs --reason "…": what you saw, in a sentence (four words or more).'); process.exit(2); }
  const out = resolve(outArg);
  const round = readJson(join(out, 'round.json'), null), key = readJson(join(out, '.key.json'), null);
  if (!round || !key) { console.error(`No round in ${out} (round.json and .key.json are written by a comparison run).`); process.exit(2); }
  const pairs = parseVerdict(record, Object.keys(key));
  if (!pairs) { console.error(`Cannot read "${record}". Use the letters of this round (${Object.keys(key).join(', ')}): A>B, A=B or A>C>B.`); process.exit(2); }
  const named = record.toUpperCase().replace(/[A-Z]/g, (l) => key[l]?.source ?? l);
  round.verdicts.push({ verdict: record.toUpperCase(), named, reason: reason.trim(), at: new Date().toISOString() });
  round.revealed = key;
  writeJson(join(out, 'round.json'), round);
  const tf = tallyPath(out);
  const t = readJson(tf, { sources: {}, rounds: 0, log: [] });
  const src = (l) => (t.sources[key[l].source] ??= { wins: 0, losses: 0, ties: 0 });
  for (const p of pairs) { if (p.win) { src(p.win).wins++; src(p.lose).losses++; } else { src(p.tie[0]).ties++; src(p.tie[1]).ties++; } }
  t.rounds++;
  (t.log ??= []).push({ round: basename(out), verdict: named, reason: reason.trim(), at: new Date().toISOString() });
  writeJson(tf, t);
  console.log(`Recorded ${record.toUpperCase()} → ${named}`);
  printTally(tf);
  process.exit(0);
}
if (tallyArg && !argv.some((a) => !a.startsWith('--'))) { printTally(resolve(tallyArg)); process.exit(0); }

// ---------------------------------------------------------------- a comparison round
const inputs = argv.filter((a) => !a.startsWith('--'));
if (inputs.length < 2) { console.error('Usage: node scripts/compare-pages.mjs <name=page> <name=page> [more…] [--out dir]   |   --record "A>B" --reason "…" --out dir'); process.exit(2); }
const pages = inputs.map((x) => { const m = /^([\w.-]+)=(.+)$/.exec(x); const url = toUrl(m && !/^(https?|file)$/.test(m[1]) ? m[2] : x); return { source: m && !/^(https?|file)$/.test(m[1]) ? m[1] : nameOf(url), url }; });
const names = pages.map((p) => p.source);
if (new Set(names).size !== names.length) { console.error(`Two pages share a name (${names.join(', ')}). Name them: ours=… rival=…`); process.exit(2); }
// Shuffle the letters (Fisher-Yates); --seed makes a round repeatable for tests.
let s = seed == null ? null : +seed;
const rnd = (n) => (s == null ? randomInt(n) : ((s = (s * 1103515245 + 12345) % 2147483648), s % n));
const order = pages.map((_, i) => i);
for (let i = order.length - 1; i > 0; i--) { const j = rnd(i + 1); [order[i], order[j]] = [order[j], order[i]]; }
const lettered = order.map((idx, i) => ({ letter: LETTERS[i], ...pages[idx] }));

const chromium = await loadChromium(import.meta.url);
if (!chromium) { console.error('compare-pages needs Playwright: npm i -D @playwright/test && npx playwright install chromium'); process.exit(2); }
const out = resolve(outArg ?? mkdtempSync(join(tmpdir(), 'lt-compare-')));
mkdirSync(out, { recursive: true });
const allowed = new Set(pages.filter((p) => /^https?:/.test(p.url)).map((p) => new URL(p.url).origin));
const browser = await chromium.launch();
const blocked = {};
try {
  for (const p of lettered) {
    blocked[p.letter] = 0;
    for (const [kind, vw, vh, mobile] of [['desktop', W, H, false], ['phone', 390, 844, true]]) {
      const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, isMobile: mobile, hasTouch: mobile, colorScheme: mode, reducedMotion: 'reduce' });
      await ctx.route('**/*', (route) => {
        const u = route.request().url();
        if (/^(file|data|blob|about):/.test(u) || allowed.has(new URL(u).origin)) return route.continue();
        if (kind === 'desktop') blocked[p.letter]++;
        return route.abort('blockedbyclient');
      });
      const page = await ctx.newPage();
      await page.goto(p.url, { waitUntil: 'load' }).catch((e) => console.error(`${p.letter}: ${e.message.split('\n')[0]}`));
      await settle(page, mode).catch(() => {});
      if (kind === 'desktop') {
        await page.screenshot({ path: join(out, `${p.letter}-first.png`) });
        await unfold(page);
        const full = await page.evaluate(() => document.documentElement.scrollHeight);
        await page.screenshot({ path: join(out, `${p.letter}-full.png`), fullPage: true, clip: { x: 0, y: 0, width: vw, height: Math.min(full, vh * 8) } });
      } else await page.screenshot({ path: join(out, `${p.letter}-phone.png`) });
      await ctx.close();
    }
  }
  // The sheet: first screens side by side, then the phones, labelled by letter only.
  const cols = Math.min(lettered.length, 3);
  const sheet = `<!doctype html><html><head><meta charset="utf-8"><title>Comparison</title><style>
  body{margin:0;padding:32px;background:#1b1d1f;color:#f2f2f0;font:600 20px/1.2 system-ui,sans-serif}
  .row{display:grid;grid-template-columns:repeat(${cols},1fr);gap:24px;margin-bottom:32px}
  figure{margin:0} img{display:block;width:100%;height:auto;border-radius:6px;background:#fff}
  figcaption{margin:0 0 8px;font-size:28px} .phones img{width:auto;max-width:100%;height:520px;object-fit:contain;object-position:left top;background:none}
  </style></head><body>
  <div class="row">${lettered.map((p) => `<figure><figcaption>${p.letter}</figcaption><img src="${p.letter}-first.png" alt="Page ${p.letter}, first screen"></figure>`).join('')}</div>
  <div class="row phones">${lettered.map((p) => `<figure><figcaption>${p.letter} · phone</figcaption><img src="${p.letter}-phone.png" alt="Page ${p.letter} on a phone"></figure>`).join('')}</div>
  </body></html>`;
  writeFileSync(join(out, 'sheet.html'), sheet);
  const ctx = await browser.newContext({ viewport: { width: cols * 720 + 64, height: 900 } });
  const sp = await ctx.newPage();
  await sp.goto(pathToFileURL(join(out, 'sheet.html')).href, { waitUntil: 'load' });
  await sp.screenshot({ path: join(out, 'sheet.png'), fullPage: true });
  await ctx.close();
} finally { await browser.close(); }

writeJson(join(out, '.key.json'), Object.fromEntries(lettered.map((p) => [p.letter, { source: p.source, url: p.url }])));
writeJson(join(out, 'round.json'), { created: new Date().toISOString(), size: `${W}x${H}`, mode, letters: lettered.map((p) => p.letter), blocked, verdicts: [] });
const L = lettered.map((p) => p.letter);
const judge = `# Blind comparison

${L.length} pages, shown at ${W}×${H} and 390×844 in ${mode} mode, lettered at random. Judge the pictures, not the names: do not open \`.key.json\` and do not open the pages themselves until you have recorded a verdict.

## Look at

- The sheet: \`sheet.png\` (first screens, then phones)
${lettered.map((p) => `- ${p.letter}: \`${p.letter}-first.png\`, the whole page \`${p.letter}-full.png\`, the phone \`${p.letter}-phone.png\`${blocked[p.letter] ? ` (${blocked[p.letter]} outside requests were blocked: fonts or pictures from other sites may be missing)` : ''}`).join('\n')}

## Rubric

Score each page 1 to 5 on each line, in one table, with a few words for every score below 4.

| | ${L.join(' | ')} |
| --- | ${L.map(() => '---').join(' | ')} |
| First screen: what it is, for whom, the one action, in 3 seconds | ${L.map(() => '').join(' | ')} |
| Squint: the right thing stands out first | ${L.map(() => '').join(' | ')} |
| One bold idea, and the rest quiet | ${L.map(() => '').join(' | ')} |
| Something to look at in every section; words are captions | ${L.map(() => '').join(' | ')} |
| Type: a clear jump from headline to body, one pairing | ${L.map(() => '').join(' | ')} |
| Craft: one left edge, spacing in steps, nothing cramped or broken, the phone as good as the desk | ${L.map(() => '').join(' | ')} |
| Not generated: no default look, no template sections, no invented figures | ${L.map(() => '').join(' | ')} |

Then pick: which page would a demanding designer ship? Totals help, but the verdict is the overall impression.

## Record the verdict

\`\`\`
node scripts/compare-pages.mjs --out ${out} --record "${L.slice(0, 2).join('>')}" --reason "what decided it, in one sentence"
\`\`\`

Use \`A>B\` (A is better), \`A=B\` (no clear difference) or a ranking such as \`${L.join('>')}\`. Recording reveals the names and adds the result to the running tally (\`${tallyPath(out)}\`).
`;
writeFileSync(join(out, 'judge.md'), judge);
console.log(`Comparison round: ${out}/`);
console.log(`  ${L.length} pages lettered ${L.join(', ')} · sheet.png · judge.md${Object.values(blocked).some(Boolean) ? ` · blocked outside requests: ${Object.entries(blocked).filter(([, n]) => n).map(([l, n]) => `${l} ${n}`).join(', ')}` : ''}`);
console.log('Open sheet.png and the pictures, score them with judge.md, then record the verdict with --record.');
