#!/usr/bin/env node
// Score what an agent built for one of the briefs in evals/evals.json.
//
//   node scripts/eval-score.mjs <output-dir | index.html | url> --brief saas-landing-invoicing
//   node scripts/eval-score.mjs --run evals/runs/2026-11-24      # every <slug>/ folder in a run
//   node scripts/eval-score.mjs --reference                       # score the blueprints as reference answers
//   options: --quick (desktop + light only)   --json out.json   --baseline old-scores.json
//
// Score (0–100) = 35% audit (errors) + 35% taste (audit-ui --taste, which includes the designer's measures:
// sections with nothing to look at, the same layout twice, density, type jump, motion budget, app checks)
// + 20% brief checks + 10% hygiene (copy lint hits, raw hex colours in the output's own CSS, and load speed
// from audit-ui --perf: a lazy largest picture, layout shift, heavy fonts, JS or CSS, unsized or oversized
// images). Requires Playwright.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); if (i < 0) return def; const v = args[i + 1]; args.splice(i, 2); return v; };
const flag = (name) => { const i = args.indexOf(`--${name}`); if (i < 0) return false; args.splice(i, 1); return true; };
const briefId = opt('brief', null);
const runDir = opt('run', null);
const jsonOut = opt('json', null);
const baseline = opt('baseline', null);
const quick = flag('quick');
const reference = flag('reference');
const target = args.find((a) => !a.startsWith('--'));
const evals = JSON.parse(readFileSync(join(root, 'evals/evals.json'), 'utf8')).evals;
const findBrief = (id) => evals.find((e) => e.slug === id || String(e.id) === String(id));

let chromium;
for (const base of [import.meta.url, pathToFileURL(join(process.cwd(), 'package.json')).href]) {
  for (const name of ['@playwright/test', 'playwright']) {
    try { const mod = await import(pathToFileURL(createRequire(base).resolve(name)).href); chromium = mod.chromium ?? mod.default?.chromium; if (chromium) break; } catch { /* next */ }
  }
  if (chromium) break;
}
if (!chromium) { console.error('eval-score needs Playwright: npm i -D @playwright/test && npx playwright install chromium'); process.exit(2); }

// ---------------------------------------------------------------- one output
const toUrl = (t) => {
  if (/^(https?|file):/.test(t)) return t;
  const p = resolve(t);
  if (existsSync(p) && statSync(p).isDirectory()) return pathToFileURL(join(p, 'index.html')).href;
  return pathToFileURL(p).href;
};
const walk = (dir, out = []) => { for (const f of readdirSync(dir)) { if (f === 'node_modules' || f.startsWith('.') || f === 'tokens') continue; const p = join(dir, f); if (statSync(p).isDirectory()) walk(p, out); else out.push(p); } return out; };

function hygiene(localDir, inputs = [], perf = 0) {
  if (!localDir) return { copy: 0, hex: 0, perf, score: Math.max(0, 100 - perf * 10) };
  // The brief's own input files (e.g. the page to restyle) are not the agent's work.
  const skipNames = new Set(inputs.map((f) => f.split('/').pop()));
  const mine = walk(localDir).filter((f) => !skipNames.has(f.split('/').pop()) && !f.includes('/snippets/') && !/lumina\.(css|js)$/.test(f));
  const lint = mine.length ? spawnSync(process.execPath, [join(root, 'scripts/lint-copy.mjs'), ...mine, '--json'], { encoding: 'utf8' }) : { stdout: '[]' };
  let copy = 0; try { const j = JSON.parse(lint.stdout); copy = Array.isArray(j) ? j.length : (j.findings?.length ?? j.count ?? 0); } catch { copy = (lint.stdout.match(/“/g) ?? []).length; }
  // Raw colours in the output's own CSS (tokens/ is the kit's and is skipped).
  let hex = 0;
  for (const f of mine.filter((f) => ['.css', '.html', '.tsx', '.jsx', '.vue', '.svelte'].includes(extname(f)))) {
    const src = readFileSync(f, 'utf8').replace(/<script[\s\S]*?<\/script>/gi, '');
    if (/--accent-solid\s*:/.test(src)) continue; // a bundle of the kit's own tokens, not the agent's CSS
    const css = extname(f) === '.css' ? src : (src.match(/<style[\s\S]*?<\/style>|style="[^"]*"/gi) ?? []).join('\n');
    hex += (css.match(/(?<![\w&])#[0-9a-f]{3,8}\b|\brgba?\(\s*\d/gi) ?? []).length;
  }
  return { copy, hex, perf, score: Math.max(0, 100 - copy * 15 - Math.min(40, hex * 4) - Math.min(40, perf * 10)) };
}

async function structure(browser, url, brief) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const results = await page.evaluate((checks) => checks.map((c) => {
    let n = 0;
    if (c.selector) n = [...document.querySelectorAll(c.selector)].filter((e) => !e.closest('[hidden]')).length;
    else if (c.text) n = (document.body.innerText.match(new RegExp(c.text, 'gi')) ?? []).length;
    const ok = n >= (c.min ?? 1) && (c.max == null || n <= c.max);
    return { name: c.name, ok, found: n };
  }), brief.checks);
  await page.close();
  const passed = results.filter((r) => r.ok).length;
  return { passed, total: results.length, failed: results.filter((r) => !r.ok).map((r) => `${r.name} (found ${r.found})`), score: results.length ? Math.round((passed / results.length) * 100) : 100 };
}

function audit(url, product = null) {
  const out = join(mkdtempSync(join(tmpdir(), 'lt-eval-')), 'a.json');
  const extra = quick ? ['--viewports', 'desktop', '--modes', 'light'] : [];
  // With a product name the critic also fails pages that still carry the kit's sample brands and people.
  spawnSync(process.execPath, [join(root, 'scripts/audit-ui.mjs'), url, '--taste', '--perf', '--quiet', '--json', out, ...(product ? ['--product', product] : []), ...extra], { encoding: 'utf8' });
  const j = JSON.parse(readFileSync(out, 'utf8'));
  const rules = {};
  for (const r of j.report) for (const f of r.findings) rules[f.rule] = (rules[f.rule] ?? 0) + 1;
  // Speed is hygiene, not taste or a broken page: taken out of the audit's errors and scored there, once per rule.
  const perfRules = Object.keys(rules).filter((k) => k.startsWith('perf-'));
  const perfErrors = j.report.flatMap((r) => r.findings).filter((f) => f.rule.startsWith('perf-') && f.severity === 'error').length;
  // What the page gives the eye, from the designer's measures (desktop run): for the report, not the score.
  const m = j.report.find((r) => r.viewport === 'desktop' && r.measures)?.measures;
  const look = m ? { sections: m.sections.length, bare: m.sections.filter((s) => !s.looks.length && !s.use).length, typeJump: m.type.ratio, moments: m.sections.filter((s) => s.moment).length } : null;
  return { errors: j.errors - perfErrors, warnings: j.warnings, taste: j.score, rules, perf: perfRules.length, look };
}

async function scoreOne(browser, t, brief) {
  const url = toUrl(t);
  const local = !/^https?:/.test(t) ? (statSync(resolve(t)).isDirectory() ? resolve(t) : dirname(resolve(t))) : null;
  const named = brief.prompt.match(/["“]([^"”]{2,40})["”]/)?.[1];
  const a = audit(url, reference ? null : (named ?? 'this product'));
  const s = await structure(browser, url, brief);
  const h = hygiene(local, brief.files ?? [], a.perf);
  const auditScore = Math.max(0, 100 - a.errors * 10);
  const total = Math.round(0.35 * auditScore + 0.35 * a.taste + 0.2 * s.score + 0.1 * h.score);
  return { slug: brief.slug, url, total, audit: { errors: a.errors, warnings: a.warnings, score: auditScore }, taste: a.taste, checks: s, hygiene: h, rules: a.rules, look: a.look };
}

// ---------------------------------------------------------------- modes
const browser = await chromium.launch();
const results = [];
let server = null;
try {
  if (reference) {
    const port = 4412;
    server = spawn(process.execPath, [join(root, 'scripts/serve.mjs'), '--port', String(port)], { stdio: 'ignore' });
    await new Promise((r) => setTimeout(r, 600));
    const kb = JSON.parse(readFileSync(join(root, 'engine/compose/page-types.json'), 'utf8'));
    for (const e of evals) {
      const bp = kb.pageTypes.find((p) => p.id === e.pageType)?.blueprint;
      if (!bp || !existsSync(join(root, 'blueprints', bp))) continue;
      const r = await scoreOne(browser, `http://127.0.0.1:${port}/blueprints/${bp}/`, e);
      results.push({ ...r, reference: bp });
    }
  } else if (runDir) {
    for (const slug of readdirSync(runDir).filter((d) => statSync(join(runDir, d)).isDirectory())) {
      const brief = findBrief(slug);
      if (!brief) { console.error(`skip ${slug}: no brief with that slug`); continue; }
      results.push(await scoreOne(browser, join(runDir, slug), brief));
    }
  } else {
    const brief = findBrief(briefId);
    if (!target || !brief) { console.error('Usage: node scripts/eval-score.mjs <dir|file|url> --brief <slug>   |   --run <dir>   |   --reference'); process.exit(2); }
    results.push(await scoreOne(browser, target, brief));
  }
} finally { await browser.close(); server?.kill(); }

// ---------------------------------------------------------------- report
const prev = baseline && existsSync(baseline) ? Object.fromEntries(JSON.parse(readFileSync(baseline, 'utf8')).results.map((r) => [r.slug, r.total])) : {};
const pad = (s, n) => String(s).padEnd(n);
console.log(`${pad('brief', 26)}${pad('total', 8)}${pad('errors', 8)}${pad('taste', 7)}${pad('checks', 9)}hygiene`);
for (const r of results) {
  const delta = prev[r.slug] != null ? ` (${r.total - prev[r.slug] >= 0 ? '+' : ''}${r.total - prev[r.slug]})` : '';
  console.log(`${pad(r.slug, 26)}${pad(r.total + delta, 8)}${pad(r.audit.errors, 8)}${pad(r.taste, 7)}${pad(`${r.checks.passed}/${r.checks.total}`, 9)}${r.hygiene.score}${r.reference ? `   ← blueprint ${r.reference}` : ''}`);
  if (r.checks.failed.length) console.log(`${''.padEnd(26)}missing: ${r.checks.failed.join('; ')}`);
  const top = Object.entries(r.rules).sort((a, b) => b[1] - a[1]).slice(0, 4);
  if (top.length) console.log(`${''.padEnd(26)}findings: ${top.map(([k, v]) => `${k} ×${v}`).join(', ')}`);
  if (r.look) console.log(`${''.padEnd(26)}look: ${r.look.sections} sections, ${r.look.bare} with nothing to look at, type jump ${r.look.typeJump}, ${r.look.moments} scroll moments${r.hygiene.perf ? ` · ${r.hygiene.perf} speed finding${r.hygiene.perf > 1 ? 's' : ''}` : ''}`);
}
const mean = results.length ? Math.round(results.reduce((a, r) => a + r.total, 0) / results.length) : 0;
const firstTry = results.filter((r) => r.audit.errors === 0).length;
console.log(`\nMean score ${mean}/100 over ${results.length} briefs · ${firstTry}/${results.length} with zero audit errors · ${results.filter((r) => r.taste >= 90).length} with taste ≥ 90`);
const summary = { generated: new Date().toISOString(), mean, results };
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(summary, null, 2));
else if (runDir) writeFileSync(join(runDir, 'scores.json'), JSON.stringify(summary, null, 2));
