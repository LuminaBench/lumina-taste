#!/usr/bin/env node
// Run an agent on every brief in evals/evals.json, one fresh folder per brief, then score the run.
//
//   node scripts/eval-run.mjs --agent 'claude -p {prompt} --permission-mode acceptEdits' --only saas-landing-invoicing,pricing-dev-api
//   node scripts/eval-run.mjs --agent '<your agent command>' --out evals/runs/my-run --limit 5
//
// {prompt} is replaced with the brief (shell-quoted) and {dir} with the output folder; the command runs
// inside that folder. The skill's own path is appended to the prompt so the agent can find it.
// Nothing runs without --agent: this script never picks an agent or spends credits on its own.
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); if (i < 0) return def; const v = args[i + 1]; args.splice(i, 2); return v; };
const agent = opt('agent', null);
const only = opt('only', null)?.split(',');
const limit = +opt('limit', '999');
const out = opt('out', join(root, 'evals/runs', new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')));
const timeout = +opt('timeout', '1200') * 1000;
if (!agent) {
  console.error("Usage: node scripts/eval-run.mjs --agent '<command with {prompt}>' [--only slug,slug] [--limit n] [--out dir] [--timeout seconds]");
  process.exit(2);
}
const q = (s) => `'${s.replace(/'/g, `'\\''`)}'`;
const evals = JSON.parse(readFileSync(join(root, 'evals/evals.json'), 'utf8')).evals.filter((e) => !only || only.includes(e.slug)).slice(0, limit);
for (const e of evals) {
  const dir = join(out, e.slug);
  mkdirSync(dir, { recursive: true });
  for (const f of e.files ?? []) copyFileSync(join(root, f), join(dir, basename(f)));
  const prompt = `${e.prompt.replace(/evals\/fixtures\//g, '')}\n\nThe lumina-taste skill is at ${root} (read its SKILL.md first). Work only inside this folder.`;
  const cmd = agent.replaceAll('{prompt}', q(prompt)).replaceAll('{dir}', q(dir));
  console.log(`\n▶ ${e.slug}`);
  const r = spawnSync(cmd, { cwd: dir, shell: true, stdio: 'inherit', timeout });
  if (r.status !== 0) console.log(`  agent exited with ${r.status ?? r.signal}`);
}
spawnSync(process.execPath, [join(root, 'scripts/eval-score.mjs'), '--run', out], { stdio: 'inherit' });
