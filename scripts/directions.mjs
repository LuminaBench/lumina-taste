#!/usr/bin/env node
// Show, don't describe: three distinct looks for one brief on a single page, built from the real parts,
// so the person can point at the one they want before any page is built.
//
//   node scripts/directions.mjs "landing page for an invoicing tool called Tally"
//   node scripts/directions.mjs "dark agent desktop app" --out ./directions --styles pixel,trace,graphite
//
// Writes <out>/directions.html (plus lumina.css and lumina.js beside it; opens from disk) and prints the
// three options with the flags that reproduce each. Ask the person to pick A, B or C, then pass that
// style to compose.mjs / install-taste.mjs and lock it.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); if (i < 0) return def; const v = args[i + 1]; args.splice(i, 2); return v; };
const out = resolve(opt('out', 'lumina-directions'));
const pick = opt('styles', null)?.split(',').map((s) => s.trim()).filter(Boolean);
const brief = args.join(' ').trim();
if (!brief) { console.error('Usage: node scripts/directions.mjs "<one-line brief>" [--out dir] [--styles a,b,c]'); process.exit(2); }

const styles = JSON.parse(readFileSync(join(root, 'tokens/styles/source.json'), 'utf8')).styles;
const plan = JSON.parse(spawnSync(process.execPath, [join(root, 'scripts/compose.mjs'), brief, '--json'], { encoding: 'utf8' }).stdout);
let ids = pick ?? plan.directions.styles.map((s) => s.id);
const unknown = ids.filter((id) => !styles.some((s) => s.id === id));
if (unknown.length) { console.error(`Unknown style ${unknown.join(', ')}. See tokens/styles/source.json.`); process.exit(2); }
const chosen = ids.slice(0, 3).map((id) => styles.find((s) => s.id === id));

// ---------------------------------------------------------------- build
mkdirSync(out, { recursive: true });
const app = plan.pageType.kind === 'app' || ['dashboard', 'settings', 'admin-table', 'ai-chat', 'inbox'].includes(plan.pageType.id);
const parts = app ? ['app-topbar', 'stat-strip', 'data-table'] : ['navbar-simple', 'hero-split', 'stats-band', 'testimonial-grid'];
const inst = spawnSync(process.execPath, [join(root, 'scripts/install-taste.mjs'), '--project', out, '--dest', '.', '--framework', 'static', '--all-palettes', '--style', chosen[0].id, '--no-profile',
  '--components', [...parts, 'button', 'badge', 'backdrop-dither', 'backdrop-circuit'].join(',')], { encoding: 'utf8' });
if (inst.status !== 0) { console.error(inst.stderr || inst.stdout); process.exit(1); }
const snippet = (id) => readFileSync(join(out, 'snippets', `${id}.html`), 'utf8').replace(/<!--[\s\S]*?-->\n?/, '');
const product = /^not named/.test(plan.designBrief.product) ? null : plan.designBrief.product;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const body = (s) => {
  let html = parts.map(snippet).join('\n');
  if (product) html = html.replaceAll('Halyard', esc(product));
  // Script-drawn backdrops need their element inside the hero.
  if (!app && /dither/.test(s.backdrop ?? '')) html = html.replace('<section class="lt-hero-split"', '<section data-backdrop="dither" class="lt-hero-split"').replace(/(<section data-backdrop="dither" class="lt-hero-split"[^>]*>)/, '$1<div class="lt-dither" data-lt="backdrop-dither" aria-hidden="true"><canvas></canvas></div>');
  if (!app && s.id === 'trace') html = html.replace('<section class="lt-hero-split"', '<section data-backdrop="grid spot" class="lt-hero-split"').replace(/(<section data-backdrop="grid spot" class="lt-hero-split"[^>]*>)/, '$1<div class="lt-circuit" data-lt="backdrop-circuit"></div>');
  return app ? `<div class="lt-container lt-stack" style="--gap: var(--space-5); padding-block: var(--space-6)">${html}</div>` : html;
};
const flags = (s) => `--style ${s.id}`;
const letter = (i) => 'ABC'[i];
const page = `<!doctype html>
<html lang="en" data-palette="slate-forest" data-mode="light" data-type="precision" data-density="balanced" data-radius="balanced" data-motion="snappy">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Three directions</title>
<link rel="stylesheet" href="lumina.css"><script defer src="lumina.js"></script>
<style>
  body { margin: 0; background: var(--bg-surface-2); }
  .dir-top { position: sticky; top: 0; z-index: 50; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 20px; padding: 12px 24px; border-bottom: 1px solid var(--border-hairline); background: var(--bg-surface-1); font-size: var(--text-ui-sm); }
  .dir-top strong { font-weight: 650; }
  .dir-top span { color: var(--text-secondary); }
  .dir-top nav { display: flex; gap: 6px; margin-left: auto; }
  .dir { margin: 28px auto; width: min(1280px, 100% - 32px); }
  .dir-label { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 14px; margin: 0 0 10px; font-size: var(--text-ui-sm); color: var(--text-secondary); }
  .dir-label b { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; background: var(--text-primary); color: var(--bg-canvas); font-size: 13px; }
  .dir-label strong { color: var(--text-primary); font-size: var(--step-0); }
  .dir-label code { margin-left: auto; padding: 2px 8px; border-radius: 6px; background: var(--bg-surface-3); font: 12px var(--font-mono); color: var(--text-primary); }
  .dir-frame { border: 1px solid var(--border-hairline); border-radius: 14px; overflow: hidden; background: var(--bg-canvas); color: var(--text-primary); font-family: var(--font-body); }
</style>
</head>
<body>
<header class="dir-top"><strong>Three directions</strong><span>${esc(brief)}</span><nav aria-label="Jump to">${chosen.map((s, i) => `<a class="lt-btn" data-variant="secondary" data-size="sm" href="#dir-${letter(i)}"><span data-part="label">${letter(i)} · ${esc(s.name)}</span></a>`).join('')}</nav></header>
<main>
${chosen.map((s, i) => `<section class="dir" id="dir-${letter(i)}" aria-labelledby="dir-${letter(i)}-h">
  <p class="dir-label"><b aria-hidden="true">${letter(i)}</b><strong id="dir-${letter(i)}-h">${esc(s.name)}</strong><span>${esc(s.summary)}</span><code>${flags(s)}</code></p>
  <div class="dir-frame" data-palette="${s.palette}" data-mode="${s.mode}" data-type="${s.type}" data-radius="${s.radius}" data-density="balanced" data-style="${s.id}">
${body(s)}
  </div>
</section>`).join('\n')}
</main>
</body>
</html>
`;
writeFileSync(join(out, 'directions.html'), page);

console.log(`Three directions for: ${brief}\n`);
chosen.forEach((s, i) => console.log(`  ${letter(i)}  ${s.name.padEnd(12)} ${s.summary}\n     palette ${s.palette} (${s.mode}), type ${s.type}, radius ${s.radius}${s.backdrop ? `, backdrop ${s.backdrop}` : ''}   →  ${flags(s)}`));
console.log(`\nOpen ${join(out, 'directions.html')} and ask which one fits: A, B or C (or "A, but lighter").`);
console.log(`Then build with that look: add --style <id> --lock style,palette to the install command compose.mjs prints.`);
