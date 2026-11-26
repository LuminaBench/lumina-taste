#!/usr/bin/env node
// Selective installer. Copies ONLY the tokens, components, charts and blueprints you ask for
// (plus every file they import, nothing else) into a project, and writes/updates taste-profile.json
// while respecting its locks.
//
//   node scripts/install-taste.mjs --palette slate-forest --type precision --components data-table,command-palette
//   node scripts/install-taste.mjs --framework react --charts line-chart,kpi-card --dest ./src/ui
//   node scripts/install-taste.mjs --framework static --components accordion --dest ./ui   (no build step: lumina.css + lumina.js + snippets/)
//   node scripts/install-taste.mjs --framework tailwind --components hero-split,faq-section   (static kit + tailwind.css: Tailwind v4 @theme on the kit's tokens)
//   node scripts/install-taste.mjs --framework next --blueprints practice   (Next.js App Router: app/layout.tsx, app/globals.css, app/page.tsx; React components)
//   node scripts/install-taste.mjs --attach --root "#app" --components toast-stack      (existing app)
//   node scripts/install-taste.mjs --density dense                (change one axis; locked axes are kept)
//   node scripts/install-taste.mjs --style swiss                  (a style brings its palette, mode, type and radius)
//   node scripts/install-taste.mjs --override accent-solid="oklch(0.5 0.15 30)"   (contrast-checked)
//   node scripts/install-taste.mjs --list | --dry-run | --force (ignore locks) | --overwrite
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { mergeProfile, normalizeProfile, serializeProfile, validateProfile, bootstrapSnippet, CHOICES, AXES } = await import(pathToFileURL(join(root, 'engine/profiles/profile.mjs')).href);
const { htmlToJsx } = await import(pathToFileURL(join(root, 'engine/compose/jsx.mjs')).href);
const { STYLES } = await import(pathToFileURL(join(root, 'engine/profiles/options.mjs')).href);
const { contrast, parseOklch } = await import(pathToFileURL(join(root, 'scripts/lib/color.mjs')).href);
const { RULES } = await import(pathToFileURL(join(root, 'scripts/lib/contrast-rules.mjs')).href);
const catalog = JSON.parse(readFileSync(join(root, 'catalog.json'), 'utf8'));

// ------------------------------------------------------------------ args
const argv = process.argv.slice(2);
const opts = { overrides: {} };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith('--')) continue;
  const [k, inline] = a.slice(2).split(/=(.*)/s);
  const takesValue = !['dry-run', 'force', 'overwrite', 'list', 'attach', 'all-palettes', 'help', 'no-profile'].includes(k);
  const v = takesValue ? inline ?? argv[++i] : true;
  if (k === 'override') { const [tk, tv] = String(v).split(/=(.*)/s); opts.overrides[tk] = tv === '' || tv === 'null' ? null : tv; }
  else opts[k] = v;
}
const list = (v) => (v ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : []);

if (opts.help) {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 12).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(0);
}
if (opts.list) {
  const pad = (s, n) => String(s).padEnd(n);
  console.log(`Palettes (${CHOICES.palette.length}): ${CHOICES.palette.join(', ')}`);
  console.log(`Typography (${CHOICES.typography.length}): ${CHOICES.typography.join(', ')}`);
  console.log(`Density: ${CHOICES.density.join(', ')} · Radius: ${CHOICES.radius.join(', ')} · Motion: ${CHOICES.motion.join(', ')}`);
  console.log(`Styles (${STYLES.length}): ${STYLES.map((x) => x.id).join(', ')}\n`);
  console.log(`UI patterns (${catalog.ui.length}):`);
  for (const f of catalog.families) console.log(`  ${pad(f.title, 32)} ${catalog.ui.filter((c) => c.family === f.id).map((c) => c.id).join(', ')}`);
  console.log(`\nCharts (${catalog.charts.length}): ${catalog.charts.map((c) => c.id).join(', ')}`);
  console.log(`Blueprints (${catalog.blueprints.length}): ${catalog.blueprints.map((c) => c.id).join(', ')}`);
  process.exit(0);
}

const framework = opts.framework ?? 'vanilla';
if (!['vanilla', 'react', 'static', 'tailwind', 'next'].includes(framework)) fail(`--framework must be vanilla, react, static, tailwind or next`);
// Tailwind gets the static kit (one lumina.css, one lumina.js, snippets) plus a Tailwind v4 entry stylesheet;
// Next gets the React components plus an App Router layout, global stylesheet and a first page.
const staticLike = framework === 'static' || framework === 'tailwind';
const projectDir = resolve(opts.project ?? '.');
let dest = resolve(projectDir, opts.dest ?? 'lumina-taste');
const profilePath = resolve(projectDir, opts.profile ?? 'taste-profile.json');
const dry = !!opts['dry-run'];
function fail(msg, code = 1) { console.error(`✗ ${msg}`); process.exit(code); }

// ------------------------------------------------------------------ profile
let current = null;
if (existsSync(profilePath)) {
  try { current = JSON.parse(readFileSync(profilePath, 'utf8')); } catch { fail(`${relative(projectDir, profilePath)} is not valid JSON.`); }
  const errs = validateProfile(current);
  if (errs.length) fail(`Existing profile is invalid:\n  ${errs.join('\n  ')}`);
}
const patch = {};
// A style is a starting point: it brings its palette, mode, type and radius. Explicit flags still win.
if (opts.style && opts.style !== true && opts.style !== 'none') {
  const st = STYLES.find((x) => x.id === opts.style);
  if (!st) fail(`Unknown style "${opts.style}". Choose one of: none, ${STYLES.map((x) => x.id).join(', ')}`);
  Object.assign(patch, { palette: st.palette, mode: st.mode, typography: st.typography, radius: st.radius });
}
const map = { palette: 'palette', mode: 'mode', type: 'typography', typography: 'typography', density: 'density', radius: 'radius', motion: 'motion', style: 'style', root: 'attachRoot' };
for (const [flag, axis] of Object.entries(map)) if (opts[flag] !== undefined && opts[flag] !== true) patch[axis] = opts[flag];
if (opts.attach) patch.installMode = 'attach';
if (opts.greenfield) patch.installMode = 'greenfield';
if (Object.keys(opts.overrides).length) patch.overrides = opts.overrides;
const base = normalizeProfile(current ?? {});
let locks = new Set(base.locks);
for (const l of list(opts.lock)) locks.add(l);
for (const l of list(opts.unlock)) locks.delete(l);
const badLock = [...locks].find((l) => !AXES.includes(l) && !/^overrides\.[a-z][a-z0-9-]*$/.test(l));
if (badLock) fail(`Unknown lock "${badLock}". Lockable: ${AXES.join(', ')}, overrides.<token>`);

const { profile, applied, blocked } = mergeProfile(base, patch, { force: !!opts.force });
profile.locks = [...locks].sort();
const errs = validateProfile(profile);
if (errs.length) fail(errs.join('\n  '));

// Colour overrides must keep every contrast rule they take part in.
const palettes = JSON.parse(readFileSync(join(root, 'tokens/palettes/palettes.json'), 'utf8')).palettes;
const pal = palettes.find((p) => p.id === profile.palette);
for (const [tok, val] of Object.entries(profile.overrides)) {
  if (!/oklch\(/.test(val)) continue;
  for (const mode of ['light', 'dark']) {
    const t = Object.fromEntries(Object.entries(pal.modes[mode].tokens).map(([k, v]) => [k, v.oklch]));
    t[tok] = val;
    t['focus-ring'] = t['accent-text'];
    for (const [fg, bgs, min] of RULES) {
      if (fg !== tok && !bgs.includes(tok)) continue;
      for (const bg of bgs) {
        if (!t[fg] || !t[bg]) continue;
        const r = contrast(parseOklch(t[fg]), parseOklch(t[bg]));
        if (r < min) fail(`Override --${tok}: ${val} breaks contrast in ${mode} mode: --${fg} on --${bg} is ${r.toFixed(2)}:1 (needs ${min}:1). Pick a ${fg === tok ? (mode === 'light' ? 'darker' : 'lighter') : 'different'} value.`);
      }
    }
  }
}

// ------------------------------------------------------------------ file selection
const want = { components: list(opts.components), charts: list(opts.charts), blueprints: list(opts.blueprints) };
// A static install bundles everything into one lumina.css and lumina.js. Running it again with fewer parts must
// not drop the ones already there: keep every part that already has a snippet in this folder (--fresh starts over).
const kept = [];
if (staticLike && !opts.fresh && existsSync(join(dest, 'snippets'))) {
  for (const f of readdirSync(join(dest, 'snippets'))) {
    const id = f.replace(/\.html$/, '');
    if (f.endsWith('.html') && catalog.ui.some((c) => c.id === id) && !want.components.includes(id)) { want.components.push(id); kept.push(id); }
  }
}
// Asking only for blueprints means "give me that page": write the page and nothing else.
const blueprintOnly = staticLike && want.blueprints.length > 0 && !want.components.length && !want.charts.length;
// One blueprint and nothing else is "give me that page": it is written where the page lives (the project
// folder unless --dest says otherwise), not in a sub-folder that then has to be moved. A page that is
// already there is never written over: the blueprint goes into <id>/ beside it instead.
const solo = blueprintOnly && want.blueprints.length === 1;
if (solo && !opts.dest) dest = projectDir;
const MARK = '<!-- lumina-taste blueprint:';
const soloTaken = solo && !opts.overwrite && existsSync(join(dest, 'index.html')) && !readFileSync(join(dest, 'index.html'), 'utf8').includes(MARK);
const pageDir = (id) => (solo && !soloTaken ? '' : `${id}/`);
// A blueprint's markup uses catalog components: install them too, so pages built from its snippets are styled.
if (!blueprintOnly) for (const id of want.blueprints) for (const u of catalog.blueprints.find((b) => b.id === id)?.uses ?? []) if (catalog.ui.some((c) => c.id === u) && !want.components.includes(u)) want.components.push(u);
const unknown = [
  ...want.components.filter((id) => !catalog.ui.some((c) => c.id === id)).map((id) => `component "${id}"`),
  ...want.charts.filter((id) => !catalog.charts.some((c) => c.id === id)).map((id) => `chart "${id}"`),
  ...want.blueprints.filter((id) => !catalog.blueprints.some((c) => c.id === id)).map((id) => `blueprint "${id}"`),
];
// The closest real ids, by shared words: "status-badge" → badge, status-dot.
const near = (id, pool) => { const w = id.split('-'); return pool.map((c) => ({ c, s: c.split('-').filter((x) => w.includes(x)).length * 2 + (c.includes(id) || id.includes(c) ? 2 : 0) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 3).map((x) => x.c); };
const hints = [...want.components.filter((id) => !catalog.ui.some((c) => c.id === id)).map((id) => [id, near(id, catalog.ui.map((c) => c.id))]), ...want.charts.filter((id) => !catalog.charts.some((c) => c.id === id)).map((id) => [id, near(id, catalog.charts.map((c) => c.id))])].filter(([, n]) => n.length).map(([id, n]) => `${id} → ${n.join(', ')}`);
if (unknown.length) fail(`Unknown ${unknown.join(', ')}.${hints.length ? ` Closest ids: ${hints.join('; ')}.` : ''} Try: node scripts/search.mjs "<what you want>"`);

// A component's markup may use another component's classes (a .lt-btn inside a dialog, a .lt-badge in a
// table). Their CSS comes along automatically, so pasted markup never renders unstyled.
const rootClass = new Map();
for (const c of catalog.ui) {
  // The classes a component styles are the roots of its @scope blocks (and its plain top-level selectors).
  for (const f of c.files.filter((f) => f.endsWith('.css'))) {
    const css = readFileSync(join(root, f), 'utf8');
    for (const m of css.matchAll(/@scope\s*\(\.(lt-[a-z0-9-]+)\)/g)) if (!rootClass.has(m[1])) rootClass.set(m[1], c.id);
  }
}
// Classes a blueprint uses in its own markup (an .lt-badge in a header) count as components it needs.
if (!blueprintOnly) for (const id of want.blueprints) {
  const bp = catalog.blueprints.find((b) => b.id === id);
  const html = bp && existsSync(join(root, bp.path, 'index.html')) ? readFileSync(join(root, bp.path, 'index.html'), 'utf8') : '';
  for (const m of html.matchAll(/\blt-[a-z0-9-]+/g)) { const c = rootClass.get(m[0]); if (c && !want.components.includes(c)) want.components.push(c); }
}
function cssDeps(id, seen = new Set()) {
  if (seen.has(id)) return seen;
  seen.add(id);
  const c = catalog.ui.find((x) => x.id === id);
  for (const d of c?.deps ?? []) cssDeps(d, seen);
  for (const f of (c?.files ?? []).filter((f) => /\.(html|react\.tsx)$/.test(f))) {
    for (const m of readFileSync(join(root, f), 'utf8').matchAll(/\blt-[a-z0-9-]+/g)) { const dep = rootClass.get(m[0]); if (dep && dep !== id) cssDeps(dep, seen); }
  }
  return seen;
}
const entries = new Set();
const addDir = (path, exts) => { for (const f of catalog.ui.concat(catalog.charts, catalog.blueprints).find((x) => x.path === path)?.files ?? []) if (exts.some((e) => f.endsWith(e))) entries.add(f); };
for (const id of want.components) {
  const c = catalog.ui.find((x) => x.id === id);
  addDir(c.path, framework === 'react' ? ['.react.tsx', '.css'] : framework === 'next' ? ['.react.tsx', '.css', `${id}.ts`] : ['.html', '.css', '.ts']);
  for (const d of cssDeps(id)) { if (d === id) continue; const dep = catalog.ui.find((x) => x.id === d); if (dep) addDir(dep.path, ['.css']); }
}
for (const id of want.charts) addDir(catalog.charts.find((x) => x.id === id).path, ['react', 'next'].includes(framework) ? ['.react.tsx'] : [`${id}.ts`]);
for (const id of framework === 'next' ? [] : want.blueprints) addDir(catalog.blueprints.find((x) => x.id === id).path, ['.html', '.css', '.ts']);
if (entries.size) { entries.add('components/ui/_shared/shared.css'); }

// Follow every relative import (ts, tsx, css) so the copy compiles on its own: nothing more, nothing less.
const files = new Set();
const IMPORT = /(?:import|export)\s[^'"]*?from\s*['"](\.[^'"]+)['"]|import\s*['"](\.[^'"]+)['"]/g;
const resolveImport = (from, spec) => {
  const p = join(dirname(from), spec);
  for (const c of [p, `${p}.ts`, `${p}.tsx`, `${p}.mjs`, join(p, 'index.ts')]) if (existsSync(join(root, c)) && !c.endsWith('/')) { try { readFileSync(join(root, c)); return c; } catch { /* dir */ } }
  return null;
};
const visit = (f) => {
  if (files.has(f)) return;
  files.add(f);
  if (!/\.(ts|tsx|mjs)$/.test(f)) return;
  const src = readFileSync(join(root, f), 'utf8');
  for (const m of src.matchAll(IMPORT)) {
    const r = resolveImport(f, m[1] ?? m[2]);
    if (r) visit(r);
    // A .d.mts next to an .mjs keeps TypeScript users typed.
    if (r?.endsWith('.mjs') && existsSync(join(root, r.replace(/\.mjs$/, '.d.mts')))) files.add(r.replace(/\.mjs$/, '.d.mts'));
  }
};
for (const e of entries) visit(e);
// Blueprint boot imports tokens itself; everything else gets tokens explicitly below.
const tokenFiles = ['tokens/base.css', 'tokens/layout.css', 'tokens/backdrops.css', 'tokens/composition.css', 'tokens/scroll.css', 'tokens/typography/typography.css', ...(opts['all-palettes'] ? ['tokens/palettes/all.css'] : [`tokens/palettes/${profile.palette}.css`]), ...(profile.style !== 'none' ? ['tokens/styles/styles.css'] : [])];
for (const f of [...files]) if (f.startsWith('tokens/palettes/') && f !== `tokens/palettes/${profile.palette}.css`) files.delete(f);
const profileEngine = ['engine/profiles/profile.mjs', 'engine/profiles/profile.d.mts', 'engine/profiles/options.mjs', 'engine/profiles/options.d.mts'];

// ------------------------------------------------------------------ write
let copied = 0, skipped = 0, unchanged = 0;
const write = (rel, content, generated = false) => {
  const target = join(dest, rel);
  if (existsSync(target) && !generated) {
    const old = readFileSync(target);
    if (Buffer.compare(old, Buffer.isBuffer(content) ? content : Buffer.from(content)) === 0) { unchanged++; return; }
    if (!opts.overwrite) { skipped++; console.log(`  ! kept your edited ${relative(projectDir, target)} (use --overwrite to replace)`); return; }
  }
  copied++;
  if (dry) { console.log(`  + ${relative(projectDir, target)}`); return; }
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
};
if (staticLike) await writeStatic();
else for (const f of [...tokenFiles, ...profileEngine, ...[...files].sort()]) write(f, readFileSync(join(root, f)));

// Static: no build step in the project. One lumina.css (tokens + component CSS) and one lumina.js that
// enhances every [data-lt] element on load and exposes the charts, plus each component's HTML to paste.

/** A short comment at the top of a snippet: what it is, its parts, and what to change before shipping it. */
function snippetNote(c, html) {
  let doc = {};
  try { const fam = JSON.parse(readFileSync(join(root, 'components/ui', c.family, 'family.json'), 'utf8')); doc = (fam.components ?? []).find((x) => x.id === c.id) ?? {}; } catch { /* no docs */ }
  const clean = (s) => String(s).replace(/--/g, '–').replace(/\s+/g, ' ').trim();
  const lines = [`${c.name} (${c.id}): ${clean(c.summary)}`];
  if (doc.anatomy?.length) lines.push(`Parts: ${doc.anatomy.map((a) => `${clean(a.name)} ${clean(a.sel)}`).join('; ')}.`);
  const demo = html.match(/^<[a-z]+ class="(lt-[a-z-]*demo[a-z-]*)"/)?.[1];
  if (demo) lines.push(`The outer .${demo} element is only a preview frame: keep what is inside it and drop the frame.`);
  if (doc.note) lines.push(clean(doc.note));
  lines.push('Every part is optional: delete the ones this page does not need.');
  lines.push('Replace the sample words, names and numbers with the product\'s own before shipping.');
  return `<!-- ${lines.join('\n     ')} -->\n${html}`;
}

/** The shared preamble of styles.css plus the sections that address one style. */
function oneStyle(id) {
  const [head, ...sections] = readFileSync(join(root, 'tokens/styles/styles.css'), 'utf8').split(/(?=^\/\* -{10,} )/m);
  return [head, ...sections.filter((sec) => sec.includes(`[data-style="${id}"]`))].join('');
}

async function writeStatic() {
  let esbuild;
  try { esbuild = await import(pathToFileURL(createRequire(import.meta.url).resolve('esbuild')).href); } catch { fail('--framework static bundles with esbuild. Run `npm install` once in the skill folder, then try again.'); }
  const imp = [], reg = [], charts = [];
  for (const f of tokenFiles) imp.push(`import './${f}';`);
  imp.push(`import { autoEnhance } from './components/ui/_shared/dom';`, `import './components/ui/_shared/shared.css';`);
  want.components.forEach((id, i) => {
    const c = catalog.ui.find((x) => x.id === id);
    for (const f of c.files.filter((f) => f.endsWith('.css'))) imp.push(`import './${f}';`);
    for (const d of cssDeps(id)) { if (d === id) continue; const dep = catalog.ui.find((x) => x.id === d); for (const f of dep?.files.filter((f) => f.endsWith('.css')) ?? []) imp.push(`import './${f}';`); }
    const ts = c.files.find((f) => f.endsWith(`${id}.ts`));
    const html = c.files.find((f) => f.endsWith('.html'));
    const name = html ? readFileSync(join(root, html), 'utf8').match(/data-lt="([^"]+)"/)?.[1] : null;
    if (ts && name && /export function enhance\b/.test(readFileSync(join(root, ts), 'utf8'))) { imp.push(`import { enhance as e${i} } from './${ts.replace(/\.ts$/, '')}';`); reg.push(`  ${JSON.stringify(name)}: safe(${JSON.stringify(name)}, e${i}),`); }
    if (html && !opts['no-snippets']) write(`snippets/${id}.html`, snippetNote(c, readFileSync(join(root, html), 'utf8')), true); // reference copies: always current
  });
  want.charts.forEach((id, i) => { const c = catalog.charts.find((x) => x.id === id); imp.push(`import { render as c${i} } from './${c.path}/${id}';`); charts.push(`  ${JSON.stringify(id)}: c${i},`); });
  if (!blueprintOnly) {
  // One component failing to start never stops the others, or window.lumina.
  const safe = "const safe = (name, fn) => (el) => { try { return fn(el); } catch (err) { console.error('[lumina] ' + name + ' could not start:', err); return () => {}; } };";
  const entry = `${imp.join('\n')}\n${safe}\nconst registry = {\n${reg.join('\n')}\n};\nexport const charts = {\n${charts.join('\n')}\n};\nexport function enhanceAll(root = document) { return autoEnhance(root, registry); }\nif (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => enhanceAll()); else enhanceAll();\n`;
  const r = await esbuild.build({ stdin: { contents: entry, resolveDir: root, loader: 'ts', sourcefile: 'lumina-entry.ts' }, bundle: true, format: 'iife', globalName: 'lumina', target: 'es2022', minify: true, write: false, outdir: 'out', entryNames: 'lumina', logLevel: 'silent' });
  // lumina.css / lumina.js are generated from your component list: always rebuilt, never 'kept'.
  for (const o of r.outputFiles) write(basename(o.path), Buffer.from(o.contents), true);
  }
  for (const id of want.blueprints) {
    const bp = catalog.blueprints.find((x) => x.id === id);
    // Unminified on purpose: a blueprint is a starting point you edit.
    // The page ships the palette it uses (every palette with --all-palettes), and the style sheet when a style is set.
    const onePalette = { name: 'one-palette', setup(build) { if (!opts['all-palettes']) build.onResolve({ filter: /palettes\/all\.css$/ }, () => ({ path: join(root, `tokens/palettes/${profile.palette}.css`) })); } };
    const b = await esbuild.build({ entryPoints: [join(root, bp.path, 'main.ts')], bundle: true, format: 'iife', target: 'es2022', minify: false, legalComments: 'none', write: false, outdir: 'out', entryNames: 'main', logLevel: 'silent', plugins: [onePalette] });
    for (const o of b.outputFiles) {
      let out = Buffer.from(o.contents);
      if (o.path.endsWith('.css') && profile.style !== 'none') out = Buffer.concat([out, Buffer.from(`\n/* tokens/styles/styles.css: ${profile.style} */\n${oneStyle(profile.style)}`)]);
      write(`${pageDir(id)}${basename(o.path)}`, out, true);
    }
    const html = readFileSync(join(root, bp.path, 'index.html'), 'utf8').replace(/<script type="module" src="\.\/main\.ts"><\/script>/, '<link rel="stylesheet" href="./main.css">\n  <script defer src="./main.js"></script>')
      // The demo's title and description describe the kit's sample, not your page.
      .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="TODO: one sentence that says what this page is, for search results and link previews.">\n  ${MARK} ${id}. Sample brand, people, copy and numbers are placeholders: replace all of them. -->`);
    // --name "Your Business": the sample's name gives way to yours wherever it appears, longest form first.
    let named = html;
    if (typeof opts.name === 'string' && opts.name.trim()) {
      const esc = opts.name.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;');
      let sampleNames = []; try { sampleNames = JSON.parse(readFileSync(join(root, bp.path, 'meta.json'), 'utf8')).brand ?? []; } catch { /* no meta */ }
      for (const b of [...sampleNames].sort((x, y) => y.length - x.length)) named = named.replaceAll(b.replace(/&/g, '&amp;'), esc).replaceAll(b, esc);
    }
    // The page follows your profile, not the blueprint's demo theme.
    const themed = named.replace(/<html([^>]*)>/, (_m, a) => `<html${a.replace(/\s+data-(palette|mode|type|density|radius|motion|style)="[^"]*"/g, '')} data-palette="${profile.palette}" data-mode="${profile.mode}" data-type="${profile.typography}" data-density="${profile.density}" data-radius="${profile.radius}" data-motion="${profile.motion}"${profile.style !== 'none' ? ` data-style="${profile.style}"` : ''}>`);
    write(`${pageDir(id)}index.html`, themed, solo && !soloTaken);
  }
}
// ------------------------------------------------------------------ tailwind and next
/** Kit tokens as Tailwind v4 theme variables. `@theme inline` keeps them as references, so every utility
 *  follows the kit's data-mode (and data-tone bands) instead of baking one mode's colours in. */
const TW_COLOURS = {
  canvas: 'bg-canvas', surface: 'bg-surface-1', 'surface-2': 'bg-surface-2', 'surface-3': 'bg-surface-3',
  ink: 'text-primary', 'ink-2': 'text-secondary', 'ink-muted': 'text-muted', line: 'border-hairline', 'line-strong': 'border-strong',
  accent: 'accent-solid', 'accent-hover': 'accent-hover', 'accent-ink': 'accent-ink', 'accent-soft': 'accent-soft', 'accent-text': 'accent-text',
  positive: 'status-positive', negative: 'status-negative', warning: 'status-warning', info: 'status-info',
  ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`chart-${i + 1}`, `chart-${i + 1}`])),
};
function tailwindCss() {
  const lines = [
    `/* lumina-taste for Tailwind v4: palette ${profile.palette}, type ${profile.typography}, radius ${profile.radius}.`,
    '   Use this file as the entry stylesheet. Colours, fonts, radii and spacing come from the kit\'s tokens, so',
    '   utilities follow <html data-mode="light|dark"> and the kit\'s dark and brand bands. Every pair is contrast-checked. */',
    '@import "tailwindcss";',
    '@import "./lumina.css";',
    '',
    '/* dark: follows the kit\'s mode attribute, not the OS setting alone. */',
    '@custom-variant dark (&:where([data-mode="dark"], [data-mode="dark"] *, [data-tone="dark"], [data-tone="dark"] *));',
    '',
    '@theme inline {',
    ...Object.entries(TW_COLOURS).map(([k, t]) => `  --color-${k}: var(--${t});`),
    '  --font-sans: var(--font-body);',
    '  --font-display: var(--font-display);',
    '  --font-mono: var(--font-mono);',
    ...['xs', 'sm', 'md', 'lg', 'xl'].map((r) => `  --radius-${r}: var(--radius-${r});`),
    '  --shadow-sm: var(--shadow-sm);',
    '  --shadow-md: var(--shadow-md);',
    '  --text-ui: var(--text-ui);',
    '  --text-ui-sm: var(--text-ui-sm);',
    '}',
    '',
  ];
  return lines.join('\n');
}
function writeTailwind() { write('tailwind.css', tailwindCss(), true); }

function writeNext() {
  const appDir = join(projectDir, 'app');
  const rel = (to) => { const r = relative(appDir, to).split('\\').join('/'); return r.startsWith('.') ? r : `./${r}`; };
  const writeApp = (name, content) => {
    const target = join(appDir, name);
    if (existsSync(target) && !opts.overwrite && readFileSync(target, 'utf8') !== content) { skipped++; console.log(`  ! kept your ${relative(projectDir, target)} (use --overwrite to replace)`); return; }
    if (existsSync(target) && readFileSync(target, 'utf8') === content) { unchanged++; return; }
    copied++;
    if (dry) { console.log(`  + ${relative(projectDir, target)}`); return; }
    mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, content);
  };
  // The page's own styles from a blueprint: its page.css and the shared blueprint layer.
  const bpCss = [];
  for (const id of want.blueprints) {
    const bp = catalog.blueprints.find((x) => x.id === id);
    for (const f of [join('blueprints/_shared/blueprint.css'), join(bp.path, 'page.css')]) if (existsSync(join(root, f))) { const out = `pages/${f === 'blueprints/_shared/blueprint.css' ? 'blueprint' : id}.css`; write(out, readFileSync(join(root, f)), true); if (!bpCss.includes(out)) bpCss.push(out); }
  }
  const cssFiles = [...files].filter((f) => f.endsWith('.css') && !f.startsWith('tokens/'));
  const globals = [
    `/* lumina-taste for Next.js: palette ${profile.palette}, type ${profile.typography}. Tokens first, then component styles. */`,
    `@import "${rel(join(dest, 'tokens/index.css'))}";`,
    ...cssFiles.sort().map((f) => `@import "${rel(join(dest, f))}";`),
    ...bpCss.map((f) => `@import "${rel(join(dest, f))}";`),
    '',
  ].join('\n');
  const attrs = { 'data-palette': profile.palette, 'data-mode': profile.mode, 'data-type': profile.typography, 'data-density': profile.density, 'data-radius': profile.radius, 'data-motion': profile.motion, ...(profile.style !== 'none' ? { 'data-style': profile.style } : {}) };
  const boot = bootstrapSnippet(profile).replace(/^<script>|<\/script>$/g, '');
  const layout = `import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'TODO: page title',
  description: 'TODO: one sentence that says what this page is, for search results and link previews.',
};

// Sets the theme attributes (and a saved light or dark choice) before first paint, so the page never flashes the wrong mode.
const themeBootstrap = ${JSON.stringify(boot)};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en"${Object.entries(attrs).map(([k, v]) => ` ${k}="${v}"`).join('')} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
`;
  // Behaviour for kit markup on the page: the vanilla enhancers, started once on the client.
  const enhancers = want.components.map((id) => catalog.ui.find((c) => c.id === id)).filter((c) => c && c.files.some((f) => f.endsWith(`${c.id}.ts`)) && /export function enhance\b/.test(readFileSync(join(root, c.files.find((f) => f.endsWith(`${c.id}.ts`))), 'utf8')))
    .map((c) => ({ id: c.id, name: readFileSync(join(root, c.files.find((f) => f.endsWith('.html')) ?? c.files[0]), 'utf8').match(/data-lt="([^"]+)"/)?.[1] ?? c.id, file: c.files.find((f) => f.endsWith(`${c.id}.ts`)).replace(/\.ts$/, '') }));
  const enhance = `'use client';
// Starts the behaviour of every kit element on the page ([data-lt]) once it is in the document.
import { useEffect } from 'react';
import { autoEnhance } from '${rel(join(dest, 'components/ui/_shared/dom'))}';
${enhancers.map((e, i) => `import { enhance as e${i} } from '${rel(join(dest, e.file))}';`).join('\n')}

const registry = {
${enhancers.map((e, i) => `  ${JSON.stringify(e.name)}: e${i},`).join('\n')}
};

export function Enhance() {
  useEffect(() => autoEnhance(document, registry), []);
  return null;
}
`;
  // The first page: the blueprint's body, or the chosen blocks in order, as JSX.
  let markup = '';
  if (want.blueprints.length) {
    const bp = catalog.blueprints.find((x) => x.id === want.blueprints[0]);
    const html = readFileSync(join(root, bp.path, 'index.html'), 'utf8');
    markup = (/<body[^>]*>([\s\S]*)<\/body>/.exec(html)?.[1] ?? '').trim();
    // --name "Your Business": the sample's name gives way to yours, as it does for a static blueprint.
    if (typeof opts.name === 'string' && opts.name.trim()) {
      let names = []; try { names = JSON.parse(readFileSync(join(root, bp.path, 'meta.json'), 'utf8')).brand ?? []; } catch { /* no meta */ }
      for (const b of [...names].sort((x, y) => y.length - x.length)) markup = markup.replaceAll(b.replace(/&/g, '&amp;'), opts.name.trim().replace(/&/g, '&amp;')).replaceAll(b, opts.name.trim().replace(/&/g, '&amp;'));
    }
  } else {
    const blocks = want.components.map((id) => catalog.ui.find((c) => c.id === id)).filter((c) => c && (c.family === 'blocks' || /^(navbar|footer|site-footer)/.test(c.id)));
    const order = (c) => (/^navbar/.test(c.id) ? 0 : /footer/.test(c.id) ? 2 : 1);
    const main = blocks.filter((c) => order(c) === 1).map((c) => readFileSync(join(root, c.files.find((f) => f.endsWith('.html'))), 'utf8').trim());
    markup = [...blocks.filter((c) => order(c) === 0).map((c) => readFileSync(join(root, c.files.find((f) => f.endsWith('.html'))), 'utf8').trim()), `<main id="main" data-scroll>\n${main.join('\n')}\n</main>`, ...blocks.filter((c) => order(c) === 2).map((c) => readFileSync(join(root, c.files.find((f) => f.endsWith('.html'))), 'utf8').trim())].join('\n');
  }
  const jsx = htmlToJsx(markup).split('\n').map((l) => (l.trim() ? `      ${l}` : '')).join('\n');
  const page = `import { Enhance } from './lumina-enhance';

// A first page from lumina-taste (${want.blueprints.length ? `the ${want.blueprints[0]} blueprint` : 'the blocks you chose'}). Every name, sentence, number and link is sample
// content: rewrite all of it. Swap any block for its React component when you need props.
export default function Page() {
  return (
    <>
${jsx}
      <Enhance />
    </>
  );
}
`;
  writeApp('layout.tsx', layout);
  writeApp('globals.css', globals);
  writeApp('lumina-enhance.tsx', enhance);
  writeApp('page.tsx', page);
}

const tokenIndex = `/* lumina-taste tokens: import this once, before any component CSS. */\n${tokenFiles.map((f) => `@import "./${relative('tokens', f)}";`).join('\n')}\n`;
if (!staticLike) write('tokens/index.css', tokenIndex);
if (framework === 'tailwind') writeTailwind();
if (framework === 'next') writeNext();

if (!opts['no-profile']) {
  if (dry) console.log(`  ~ ${relative(projectDir, profilePath)}`);
  else { mkdirSync(dirname(profilePath), { recursive: true }); writeFileSync(profilePath, serializeProfile(profile)); }
}

// ------------------------------------------------------------------ report
const attrs = `data-palette="${profile.palette}" data-mode="${profile.mode}" data-type="${profile.typography}" data-density="${profile.density}" data-radius="${profile.radius}" data-motion="${profile.motion}"${profile.style !== 'none' ? ` data-style="${profile.style}"` : ''}`;
console.log(`${dry ? 'Dry run: would install' : 'Installed'} lumina-taste (${framework}) into ${relative(projectDir, dest) || '.'} (in ${projectDir})`);
// A page the kit drafted (compose --write) or a blueprint page next to this install follows a changed profile:
// its <html> theme attributes are rewritten, so a new palette or typeface shows without editing the page by hand.
const retheme = [];
if (!dry && !opts['no-profile']) for (const f of [join(projectDir, 'index.html'), join(projectDir, 'index.draft.html'), join(dest, '..', 'index.html')]) {
  if (!existsSync(f) || retheme.includes(f)) continue;
  const page = readFileSync(f, 'utf8');
  if (!/<!-- lumina-taste (draft for|blueprint):/.test(page)) continue;
  const next = page.replace(/<html([^>]*)>/, (_m, a) => `<html${a.replace(/\s+data-(palette|mode|type|density|radius|motion|style)="[^"]*"/g, '')} data-palette="${profile.palette}" data-mode="${profile.mode}" data-type="${profile.typography}" data-density="${profile.density}" data-radius="${profile.radius}" data-motion="${profile.motion}"${profile.style && profile.style !== 'none' ? ` data-style="${profile.style}"` : ''}>`);
  if (next !== page) { writeFileSync(f, next); retheme.push(f); }
  // A flat blueprint page carries one palette and one style in its main.css: add the new ones beside it.
  const css = join(dirname(f), 'main.css');
  if (/<!-- lumina-taste blueprint:/.test(page) && existsSync(css)) {
    let add = '';
    const have = readFileSync(css, 'utf8');
    if (!new RegExp(`\\[data-palette="?${profile.palette}"?\\]`).test(have)) add += `\n/* tokens/palettes/${profile.palette}.css */\n${readFileSync(join(root, `tokens/palettes/${profile.palette}.css`), 'utf8')}`;
    if (profile.style && profile.style !== 'none' && !new RegExp(`\\[data-style="?${profile.style}"?\\]`).test(have)) add += `\n/* tokens/styles/styles.css: ${profile.style} */\n${oneStyle(profile.style)}`;
    if (add) { writeFileSync(css, have + add); if (!retheme.includes(f)) retheme.push(f); }
  }
}
if (retheme.length) console.log(`  Re-themed ${retheme.map((f) => relative(projectDir, f) || f).join(', ')} to this profile.`);
if (kept.length) console.log(`  Kept ${kept.length} part(s) already installed here (${kept.slice(0, 6).join(', ')}${kept.length > 6 ? '…' : ''}). Pass --fresh to start over.`);
console.log(`  ${copied} file(s) written, ${unchanged} already up to date${skipped ? `, ${skipped} kept` : ''}${opts['no-profile'] || dry ? '' : `, plus ${relative(projectDir, profilePath)}`}.`);
if (applied.length) console.log(`  Profile updated: ${applied.join(', ')}.`);
if (blocked.length) console.log(`  Locked, left unchanged: ${blocked.join(', ')}. Pass --force or --unlock <axis> if the user asked for it.`);
console.log(`  Profile: ${relative(projectDir, profilePath)} (${profile.palette}, ${profile.mode}, ${profile.typography}, ${profile.density}, ${profile.radius}, ${profile.motion}${profile.style !== 'none' ? `, style ${profile.style}` : ''}${profile.locks.length ? `; locked: ${profile.locks.join(', ')}` : ''})`);
console.log('\nNext:');
if (blueprintOnly) {
  const where = (id) => relative(projectDir, join(dest, pageDir(id))) || '.';
  if (soloTaken) console.log(`  ! ${relative(projectDir, join(dest, 'index.html'))} already exists, so the page was written to ${where(want.blueprints[0])}/ instead (--overwrite replaces it).`);
  console.log(`  1. ${want.blueprints.map((b) => `${where(b)}/index.html`).join(', ')} ${want.blueprints.length > 1 ? 'are complete pages' : 'is a complete page'}, with main.css and main.js beside it (tokens and every component it uses). It opens from disk.
  2. Make it yours: every brand, person, sentence, number and link in it is sample content. Change them all;
     audit-ui --product "<name>" lists what is left. Remove a section you cannot fill with real facts.
     Page behaviour is the last block of main.js, under the comment "// blueprints/<id>/main.ts"; the component code above it stays as it is.
  3. Need a part or a chart it lacks? Run this command again with --components <ids> and/or --charts <ids> added: that also writes
     lumina.css and lumina.js. Link both after main.css; charts are then at lumina.charts['<id>'](el, data, options).`);
}
else if (framework === 'tailwind') console.log(`  1. Use ${relative(projectDir, join(dest, 'tailwind.css'))} as your Tailwind v4 entry stylesheet (it imports tailwindcss and the kit), and load ${relative(projectDir, join(dest, 'lumina.js'))} for behaviour.\n     Utilities follow the kit's tokens in both modes: bg-canvas, bg-surface, text-ink, text-ink-muted, bg-accent, text-accent-ink, border-line, rounded-md, font-display.\n     Paste markup from ${relative(projectDir, join(dest, 'snippets'))}/ and add utilities around it; dark: follows data-mode.`);
else if (framework === 'next') console.log(`  1. app/layout.tsx sets the theme before first paint; app/globals.css imports the tokens and component styles;\n     app/page.tsx is a first page from ${want.blueprints.length ? `the ${want.blueprints.join(', ')} blueprint` : 'the blocks you chose'}. Every word in it is sample copy. Swap a block's markup for its React component\n     (${relative(projectDir, join(dest, 'components'))}/…/<id>.react.tsx) when you need props; app/lumina-enhance.tsx wires the behaviour of the rest.`);
else if (framework === 'static') console.log(`  1. In each page: <link rel="stylesheet" href="${relative(projectDir, join(dest, 'lumina.css'))}"> and <script defer src="${relative(projectDir, join(dest, 'lumina.js'))}"></script>.\n     Paste markup from ${relative(projectDir, join(dest, 'snippets'))}/; it is enhanced on load. ${want.charts.length ? `Charts in this bundle: ${want.charts.map((c) => `lumina.charts['${c}']`).join(', ')}; call them as (el, data, options) after DOMContentLoaded. ` : ''}Works from file:// too.`);
else console.log(`  1. Import ${relative(projectDir, join(dest, 'tokens/index.css'))} once, before component CSS.`);
if (profile.installMode === 'attach') console.log(`  2. Put the attributes on your wrapper only (host styles stay untouched):\n     <div class="lt-root" ${attrs}>…</div>   (attachRoot: "${profile.attachRoot}")`);
else if (!blueprintOnly && framework !== 'next') console.log(`  2. Put the attributes on <html>:\n     <html ${attrs}>\n     or call applyProfile(profile) from engine/profiles/profile.mjs (bootstrapSnippet() avoids a flash).`);
const webfont = JSON.parse(readFileSync(join(root, 'tokens/typography/source.json'), 'utf8')).pairings?.find?.((x) => x.id === profile.typography)?.webfont;
if (staticLike && want.blueprints.length && !blueprintOnly) console.log(`  Blueprints: ${want.blueprints.map((b) => relative(projectDir, join(dest, b, 'index.html'))).join(', ')} ${want.blueprints.length > 1 ? 'are' : 'is'} a complete page:\n     main.css and main.js already hold the tokens and every component it uses, so it does not need lumina.css.\n     Move it where the page should live (or copy its markup into your page), then replace the sample words and data.`);
if (webfont) console.log(`  Fonts: nothing to do. The page uses faces already on the device, chosen to match, and works offline.\n     Optional, needs network: for the exact faces add <link rel="stylesheet" href="${webfont}">, or self-host them with @font-face.`);
if (want.components.length && !staticLike && framework !== 'next') console.log(`  3. ${framework === 'react' ? 'Import the components from their .react.tsx files.' : 'Paste each .html snippet and call enhance(el) from its .ts file (or autoEnhance(document, { id: enhance }) from _shared/dom.ts).'}`);
if (blocked.length && !opts.force) process.exit(3);
