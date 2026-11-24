#!/usr/bin/env node
// Selective installer. Copies ONLY the tokens, components, charts and blueprints you ask for
// (plus every file they import, nothing else) into a project, and writes/updates taste-profile.json
// while respecting its locks.
//
//   node scripts/install-taste.mjs --palette slate-forest --type precision --components data-table,command-palette
//   node scripts/install-taste.mjs --framework react --charts line-chart,kpi-card --dest ./src/ui
//   node scripts/install-taste.mjs --framework static --components accordion --dest ./ui   (no build step: lumina.css + lumina.js + snippets/)
//   node scripts/install-taste.mjs --attach --root "#app" --components toast-stack      (existing app)
//   node scripts/install-taste.mjs --density dense                (change one axis; locked axes are kept)
//   node scripts/install-taste.mjs --style swiss                  (a style brings its palette, mode, type and radius)
//   node scripts/install-taste.mjs --override accent-solid="oklch(0.5 0.15 30)"   (contrast-checked)
//   node scripts/install-taste.mjs --list | --dry-run | --force (ignore locks) | --overwrite
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { mergeProfile, normalizeProfile, serializeProfile, validateProfile, CHOICES, AXES } = await import(pathToFileURL(join(root, 'engine/profiles/profile.mjs')).href);
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
if (!['vanilla', 'react', 'static'].includes(framework)) fail(`--framework must be vanilla, react or static`);
const projectDir = resolve(opts.project ?? '.');
const dest = resolve(projectDir, opts.dest ?? 'lumina-taste');
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
// A blueprint's markup uses catalog components: install them too, so pages built from its snippets are styled.
for (const id of want.blueprints) for (const u of catalog.blueprints.find((b) => b.id === id)?.uses ?? []) if (catalog.ui.some((c) => c.id === u) && !want.components.includes(u)) want.components.push(u);
const unknown = [
  ...want.components.filter((id) => !catalog.ui.some((c) => c.id === id)).map((id) => `component "${id}"`),
  ...want.charts.filter((id) => !catalog.charts.some((c) => c.id === id)).map((id) => `chart "${id}"`),
  ...want.blueprints.filter((id) => !catalog.blueprints.some((c) => c.id === id)).map((id) => `blueprint "${id}"`),
];
if (unknown.length) fail(`Unknown ${unknown.join(', ')}. Try: node scripts/search.mjs "<what you want>"`);

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
for (const id of want.blueprints) {
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
  addDir(c.path, framework === 'react' ? ['.react.tsx', '.css'] : ['.html', '.css', '.ts']);
  for (const d of cssDeps(id)) { if (d === id) continue; const dep = catalog.ui.find((x) => x.id === d); if (dep) addDir(dep.path, ['.css']); }
}
for (const id of want.charts) addDir(catalog.charts.find((x) => x.id === id).path, framework === 'react' ? ['.react.tsx'] : [`${id}.ts`]);
for (const id of want.blueprints) addDir(catalog.blueprints.find((x) => x.id === id).path, ['.html', '.css', '.ts']);
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
const tokenFiles = ['tokens/base.css', 'tokens/layout.css', 'tokens/typography/typography.css', ...(opts['all-palettes'] ? ['tokens/palettes/all.css'] : [`tokens/palettes/${profile.palette}.css`]), ...(profile.style !== 'none' ? ['tokens/styles/styles.css'] : [])];
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
if (framework === 'static') await writeStatic();
else for (const f of [...tokenFiles, ...profileEngine, ...[...files].sort()]) write(f, readFileSync(join(root, f)));

// Static: no build step in the project. One lumina.css (tokens + component CSS) and one lumina.js that
// enhances every [data-lt] element on load and exposes the charts, plus each component's HTML to paste.
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
    if (html && !opts['no-snippets']) write(`snippets/${id}.html`, readFileSync(join(root, html)));
  });
  want.charts.forEach((id, i) => { const c = catalog.charts.find((x) => x.id === id); imp.push(`import { render as c${i} } from './${c.path}/${id}';`); charts.push(`  ${JSON.stringify(id)}: c${i},`); });
  // One component failing to start never stops the others, or window.lumina.
  const safe = "const safe = (name, fn) => (el) => { try { return fn(el); } catch (err) { console.error('[lumina] ' + name + ' could not start:', err); return () => {}; } };";
  const entry = `${imp.join('\n')}\n${safe}\nconst registry = {\n${reg.join('\n')}\n};\nexport const charts = {\n${charts.join('\n')}\n};\nexport function enhanceAll(root = document) { return autoEnhance(root, registry); }\nif (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => enhanceAll()); else enhanceAll();\n`;
  const r = await esbuild.build({ stdin: { contents: entry, resolveDir: root, loader: 'ts', sourcefile: 'lumina-entry.ts' }, bundle: true, format: 'iife', globalName: 'lumina', target: 'es2022', minify: true, write: false, outdir: 'out', entryNames: 'lumina', logLevel: 'silent' });
  // lumina.css / lumina.js are generated from your component list: always rebuilt, never 'kept'.
  for (const o of r.outputFiles) write(basename(o.path), Buffer.from(o.contents), true);
  for (const id of want.blueprints) {
    const bp = catalog.blueprints.find((x) => x.id === id);
    // Unminified on purpose: a blueprint is a starting point you edit.
    const b = await esbuild.build({ entryPoints: [join(root, bp.path, 'main.ts')], bundle: true, format: 'iife', target: 'es2022', minify: false, legalComments: 'none', write: false, outdir: 'out', entryNames: 'main', logLevel: 'silent' });
    for (const o of b.outputFiles) write(`${id}/${basename(o.path)}`, Buffer.from(o.contents), true);
    const html = readFileSync(join(root, bp.path, 'index.html'), 'utf8').replace(/<script type="module" src="\.\/main\.ts"><\/script>/, '<link rel="stylesheet" href="./main.css">\n  <script defer src="./main.js"></script>');
    // The page follows your profile, not the blueprint's demo theme.
    const themed = html.replace(/<html([^>]*)>/, (_m, a) => `<html${a.replace(/\s+data-(palette|mode|type|density|radius|motion|style)="[^"]*"/g, '')} data-palette="${profile.palette}" data-mode="${profile.mode}" data-type="${profile.typography}" data-density="${profile.density}" data-radius="${profile.radius}" data-motion="${profile.motion}"${profile.style !== 'none' ? ` data-style="${profile.style}"` : ''}>`);
    write(`${id}/index.html`, themed);
  }
}
const tokenIndex = `/* lumina-taste tokens: import this once, before any component CSS. */\n${tokenFiles.map((f) => `@import "./${relative('tokens', f)}";`).join('\n')}\n`;
if (framework !== 'static') write('tokens/index.css', tokenIndex);

if (!opts['no-profile']) {
  if (dry) console.log(`  ~ ${relative(projectDir, profilePath)}`);
  else { mkdirSync(dirname(profilePath), { recursive: true }); writeFileSync(profilePath, serializeProfile(profile)); }
}

// ------------------------------------------------------------------ report
const attrs = `data-palette="${profile.palette}" data-mode="${profile.mode}" data-type="${profile.typography}" data-density="${profile.density}" data-radius="${profile.radius}" data-motion="${profile.motion}"${profile.style !== 'none' ? ` data-style="${profile.style}"` : ''}`;
console.log(`${dry ? 'Dry run: would install' : 'Installed'} lumina-taste (${framework}) into ${relative(projectDir, dest) || '.'} (in ${projectDir})`);
console.log(`  ${copied} file(s) written, ${unchanged} already up to date${skipped ? `, ${skipped} kept` : ''}.`);
if (applied.length) console.log(`  Profile updated: ${applied.join(', ')}.`);
if (blocked.length) console.log(`  Locked, left unchanged: ${blocked.join(', ')}. Pass --force or --unlock <axis> if the user asked for it.`);
console.log(`  Profile: ${relative(projectDir, profilePath)} (${profile.palette}, ${profile.mode}, ${profile.typography}, ${profile.density}, ${profile.radius}, ${profile.motion}${profile.style !== 'none' ? `, style ${profile.style}` : ''}${profile.locks.length ? `; locked: ${profile.locks.join(', ')}` : ''})`);
console.log('\nNext:');
if (framework === 'static') console.log(`  1. In each page: <link rel="stylesheet" href="${relative(projectDir, join(dest, 'lumina.css'))}"> and <script defer src="${relative(projectDir, join(dest, 'lumina.js'))}"></script>.\n     Paste markup from ${relative(projectDir, join(dest, 'snippets'))}/; it is enhanced on load. Charts: lumina.charts['line-chart'](el, data, options) after DOMContentLoaded. Works from file:// too.`);
else console.log(`  1. Import ${relative(projectDir, join(dest, 'tokens/index.css'))} once, before component CSS.`);
if (profile.installMode === 'attach') console.log(`  2. Put the attributes on your wrapper only (host styles stay untouched):\n     <div class="lt-root" ${attrs}>…</div>   (attachRoot: "${profile.attachRoot}")`);
else console.log(`  2. Put the attributes on <html>:\n     <html ${attrs}>\n     or call applyProfile(profile) from engine/profiles/profile.mjs (bootstrapSnippet() avoids a flash).`);
const webfont = JSON.parse(readFileSync(join(root, 'tokens/typography/source.json'), 'utf8')).pairings?.find?.((x) => x.id === profile.typography)?.webfont;
if (framework === 'static' && want.blueprints.length) console.log(`  Blueprints: ${want.blueprints.map((b) => relative(projectDir, join(dest, b, 'index.html'))).join(', ')} ${want.blueprints.length > 1 ? 'are' : 'is'} a complete page:\n     main.css and main.js already hold the tokens and every component it uses, so it does not need lumina.css.\n     Move it where the page should live (or copy its markup into your page), then replace the sample words and data.`);
if (webfont) console.log(`  Fonts: the stacks fall back to installed faces with the same character. For the exact faces add\n     <link rel="stylesheet" href="${webfont}">`);
if (want.components.length && framework !== 'static') console.log(`  3. ${framework === 'react' ? 'Import the components from their .react.tsx files.' : 'Paste each .html snippet and call enhance(el) from its .ts file (or autoEnhance(document, { id: enhance }) from _shared/dom.ts).'}`);
if (blocked.length && !opts.force) process.exit(3);
