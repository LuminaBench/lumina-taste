#!/usr/bin/env node
// Write a lean copy of the skill for an agent's skills folder: what an agent reads and runs at use time,
// nothing it does not (tests, the gallery source, eval runs, QA output, lockfiles, dev configs).
//
//   node scripts/pack-skill.mjs --out /abs/path/lumina-taste            # a folder
//   node scripts/pack-skill.mjs --out /abs/path/lumina-taste --zip      # and lumina-taste.zip beside it
//   options: --force (replace a non-empty --out)   --json (print the manifest)
//
// Scripts: the use-time entry points below plus everything they import or launch, found by reading the
// files (static and dynamic imports, and scripts/<name>.mjs paths they spawn), so a lib a script needs
// cannot be left behind. Prints the size before and after.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Scripts an agent runs while using the skill (SKILL.md and references name them). */
export const ENTRY_SCRIPTS = ['compose', 'install-taste', 'search', 'audit-ui', 'find-images', 'directions', 'sniff', 'export-tokens', 'sample-data', 'fonts', 'eval-score', 'lint-copy'].map((s) => `scripts/${s}.mjs`);
/** Whole folders and files copied as they are. */
export const COPY = ['SKILL.md', 'LICENSE', 'catalog.json', 'references', 'tokens', 'components', 'blueprints', 'engine', 'evals/evals.json', 'evals/fixtures'];
/** Never copied, even if something references them: development and maintenance only. */
const DEV_ONLY = new Set(['scripts/serve.mjs', 'scripts/build.mjs']);
const SKIP_NAMES = new Set(['node_modules', '.git', '.DS_Store', 'dist', 'generated', 'test-results', 'playwright-report', '.tmp']);

/** Every script file reachable from the entry points: relative imports, dynamic imports, spawned scripts. */
export function resolveScripts(entries = ENTRY_SCRIPTS, base = root) {
  const seen = new Set();
  const missing = [];
  const queue = [...entries];
  while (queue.length) {
    const rel = queue.shift();
    if (seen.has(rel) || DEV_ONLY.has(rel)) continue;
    const abs = join(base, rel);
    if (!existsSync(abs)) { missing.push(rel); continue; }
    seen.add(rel);
    const src = readFileSync(abs, 'utf8');
    const specs = [
      ...[...src.matchAll(/\bfrom\s+['"](\.{1,2}\/[^'"]+)['"]/g)].map((m) => m[1]),
      ...[...src.matchAll(/\bimport\s*\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g)].map((m) => m[1]),
      ...[...src.matchAll(/\bimport\s+['"](\.{1,2}\/[^'"]+)['"]/g)].map((m) => m[1]),
    ];
    for (const s of specs) {
      // Only module files: install-taste also holds import lines for code it writes into a project.
      if (s.includes('${') || !/\.(mjs|js)$/.test(s)) continue;
      const target = relative(base, resolve(dirname(abs), s));
      if (target.startsWith('scripts/')) queue.push(target);
    }
    // Scripts launched by path: join(root, 'scripts/x.mjs') and similar literals.
    for (const m of src.matchAll(/['"`](scripts\/[\w./-]+\.mjs)['"`]/g)) queue.push(m[1]);
  }
  return { scripts: [...seen].sort(), missing: missing.filter((m) => !DEV_ONLY.has(m)) };
}

function size(p) {
  if (!existsSync(p)) return { bytes: 0, files: 0 };
  const st = statSync(p);
  if (!st.isDirectory()) return { bytes: st.size, files: 1 };
  let bytes = 0, files = 0;
  for (const f of readdirSync(p)) {
    if (SKIP_NAMES.has(f)) continue;
    const s = size(join(p, f));
    bytes += s.bytes; files += s.files;
  }
  return { bytes, files };
}
/** The skill folder as a developer has it, without installed packages, build output or git data. */
const sourceSize = () => {
  let bytes = 0, files = 0;
  for (const f of readdirSync(root)) {
    if (SKIP_NAMES.has(f) || f === 'qa') continue;
    const s = size(join(root, f));
    bytes += s.bytes; files += s.files;
  }
  return { bytes, files };
};
const human = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(2)} MB` : `${(n / 1024).toFixed(1)} KB`);

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (name) => { const i = args.indexOf(`--${name}`); return i < 0 ? null : args[i + 1]; };
  const flag = (name) => args.includes(`--${name}`);
  const outArg = opt('out');
  if (!outArg) { console.error('Usage: node scripts/pack-skill.mjs --out <dir> [--zip] [--force] [--json]'); process.exit(2); }
  const out = resolve(outArg);
  if (out === root || root.startsWith(`${out}/`) || out.startsWith(`${root}/`) && !out.startsWith(`${root}/qa/`)) { console.error('--out must be outside the skill folder (or under qa/).'); process.exit(2); }
  if (existsSync(out) && readdirSync(out).length) {
    if (!flag('force')) { console.error(`${out} is not empty. Pass --force to replace it.`); process.exit(2); }
    rmSync(out, { recursive: true, force: true });
  }
  const { scripts, missing } = resolveScripts();
  if (missing.length) { console.error(`Missing script files: ${missing.join(', ')}`); process.exit(1); }
  mkdirSync(out, { recursive: true });
  const filter = (src) => !SKIP_NAMES.has(basename(src));
  for (const p of [...COPY, ...scripts]) {
    if (!existsSync(join(root, p))) continue;
    mkdirSync(dirname(join(out, p)), { recursive: true });
    cpSync(join(root, p), join(out, p), { recursive: true, filter });
  }
  // A package.json with no dependencies: marks the folder as ES modules and names the use-time commands.
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const keep = ['search', 'install-taste', 'audit', 'compose', 'lint:copy'];
  const lean = { name: pkg.name, version: pkg.version, private: true, type: 'module', description: pkg.description, license: pkg.license, engines: pkg.engines, scripts: Object.fromEntries(Object.entries(pkg.scripts ?? {}).filter(([k]) => keep.includes(k))) };
  if (!lean.scripts.compose) lean.scripts.compose = 'node scripts/compose.mjs';
  writeFileSync(join(out, 'package.json'), `${JSON.stringify(lean, null, 2)}\n`);

  const before = sourceSize(), after = size(out);
  let zipNote = '';
  if (flag('zip')) {
    const zipPath = `${out}.zip`;
    const hasZip = spawnSync('zip', ['-v'], { stdio: 'ignore' }).status === 0;
    if (!hasZip) zipNote = 'zip is not installed here; the folder is ready, zip it yourself.';
    else {
      rmSync(zipPath, { force: true });
      const z = spawnSync('zip', ['-r', '-q', '-X', zipPath, basename(out)], { cwd: dirname(out), stdio: 'inherit' });
      zipNote = z.status === 0 ? `Zip: ${zipPath} (${human(statSync(zipPath).size)})` : 'zip failed; the folder is ready.';
    }
  }
  const manifest = { out, before, after, scripts, copied: COPY };
  if (flag('json')) console.log(JSON.stringify(manifest, null, 2));
  else {
    console.log(`Packed lumina-taste into ${out}`);
    console.log(`  before: ${human(before.bytes)} in ${before.files} files (the skill folder without node_modules, git and build output)`);
    console.log(`  after:  ${human(after.bytes)} in ${after.files} files (${Math.round((1 - after.bytes / before.bytes) * 100)}% smaller)`);
    console.log(`  scripts (${scripts.length}): ${scripts.map((s) => s.replace('scripts/', '')).join(', ')}`);
    console.log('  left out: tests, preview (gallery), evals runs and history, qa, package-lock, dev configs, build and maintenance scripts');
    if (zipNote) console.log(`  ${zipNote}`);
  }
}
