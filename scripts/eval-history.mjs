#!/usr/bin/env node
// Keep a history of eval scores per agent and per brief, and print the trend.
//
//   node scripts/eval-history.mjs --add evals/runs/2026-11-26-10-00/scores.json --label agent-a
//   node scripts/eval-history.mjs --add <run dir> --label agent-b --date 2026-11-26
//   node scripts/eval-history.mjs                     # trend tables from evals/history.json
//   node scripts/eval-history.mjs --brief saas-landing-invoicing --agent agent-a   # one brief, one agent
//   options: --file <history.json>   --json   --last <n> (runs per agent shown, default 6)
//
// --add reads the summary eval-score.mjs writes (scores.json, or a --json file) and appends one row per
// brief: date, agent label, brief slug, total, sub-scores (audit, taste, checks, hygiene) and the skill's
// git commit. eval-run.mjs --label <agent> does this on its own after scoring.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i < 0 ? def : args[i + 1]; };
const flag = (name) => args.includes(`--${name}`);
const file = resolve(opt('file', process.env.LT_EVAL_HISTORY ?? join(root, 'evals/history.json')));

const load = () => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { version: 1, runs: [] });
const commit = () => { try { return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; } };

/** Rows from an eval-score summary: { generated, mean, results: [{ slug, total, audit, taste, checks, hygiene }] }. */
export function rowsFrom(summary, { label, date, skillCommit, run }) {
  return (summary.results ?? []).map((r) => ({
    date, agent: label, brief: r.slug, score: r.total,
    sub: { audit: r.audit?.score ?? null, errors: r.audit?.errors ?? null, taste: r.taste ?? null, checks: r.checks?.score ?? null, hygiene: r.hygiene?.score ?? null },
    commit: skillCommit, run,
  }));
}

/** Append a run; the same agent + run + brief replaces its earlier row, so re-scoring a run does not double it. */
export function append(history, rows) {
  const key = (r) => `${r.agent}\u0000${r.run}\u0000${r.brief}`;
  const fresh = new Set(rows.map(key));
  history.runs = [...history.runs.filter((r) => !fresh.has(key(r))), ...rows];
  return history;
}

const mean = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
const pad = (s, n) => String(s ?? '–').padEnd(n);
const arrow = (a, b) => (a == null || b == null ? '' : b > a ? ` ↑${b - a}` : b < a ? ` ↓${a - b}` : ' =');

/** Per agent: one line per run (date, commit, mean, taste mean, briefs), oldest first, with the change. */
export function agentTable(runs, last = 6) {
  const L = [];
  const agents = [...new Set(runs.map((r) => r.agent))].sort();
  for (const a of agents) {
    const byRun = new Map();
    for (const r of runs.filter((x) => x.agent === a)) { if (!byRun.has(r.run)) byRun.set(r.run, []); byRun.get(r.run).push(r); }
    const list = [...byRun.values()].map((rs) => ({ date: rs[0].date, commit: rs[0].commit, n: rs.length, mean: mean(rs.map((r) => r.score)), taste: mean(rs.map((r) => r.sub.taste).filter((x) => x != null)), clean: rs.filter((r) => r.sub.errors === 0).length }))
      .sort((x, y) => String(x.date).localeCompare(String(y.date))).slice(-last);
    L.push(`${a}`);
    L.push(`  ${pad('date', 12)}${pad('commit', 10)}${pad('briefs', 8)}${pad('mean', 10)}${pad('taste', 7)}0 errors`);
    list.forEach((r, i) => L.push(`  ${pad(r.date, 12)}${pad(r.commit, 10)}${pad(r.n, 8)}${pad(`${r.mean}${arrow(list[i - 1]?.mean, r.mean)}`, 10)}${pad(r.taste, 7)}${r.clean}/${r.n}`));
    L.push('');
  }
  return L.join('\n');
}

/** Per brief: the latest score of each agent and that agent's change since its previous run of the brief. */
export function briefTable(runs) {
  const agents = [...new Set(runs.map((r) => r.agent))].sort();
  const briefs = [...new Set(runs.map((r) => r.brief))].sort();
  const w = Math.max(10, ...agents.map((a) => a.length + 2));
  const L = [`${pad('brief', 30)}${agents.map((a) => pad(a, w)).join('')}`];
  for (const b of briefs) {
    const cells = agents.map((a) => {
      const rs = runs.filter((r) => r.agent === a && r.brief === b).sort((x, y) => String(x.date).localeCompare(String(y.date)));
      const lastTwo = rs.slice(-2).map((r) => r.score);
      return pad(rs.length ? `${lastTwo.at(-1)}${arrow(lastTwo.length > 1 ? lastTwo[0] : null, lastTwo.at(-1))}` : '–', w);
    });
    L.push(`${pad(b, 30)}${cells.join('')}`);
  }
  return L.join('\n');
}

// ---------------------------------------------------------------- CLI
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const add = opt('add', null);
  const history = load();
  if (add) {
    const label = opt('label', null);
    if (!label || !/^[\w.-]{1,40}$/.test(label)) { console.error('Usage: node scripts/eval-history.mjs --add <scores.json | run dir> --label <agent> [--date YYYY-MM-DD]\n--label is a short name for the agent that made the run (letters, digits, . _ -).'); process.exit(2); }
    const src = existsSync(add) && statSync(add).isDirectory() ? join(add, 'scores.json') : add;
    if (!existsSync(src)) { console.error(`No scores at ${src}. Score the run first: node scripts/eval-score.mjs --run <dir>`); process.exit(2); }
    const summary = JSON.parse(readFileSync(src, 'utf8'));
    const date = opt('date', (summary.generated ?? new Date().toISOString()).slice(0, 10));
    const run = opt('run', summary.generated ?? date);
    const rows = rowsFrom(summary, { label, date, skillCommit: opt('commit', commit()), run });
    if (!rows.length) { console.error(`${src} has no results.`); process.exit(1); }
    append(history, rows);
    writeFileSync(file, `${JSON.stringify(history, null, 1)}\n`);
    console.log(`Recorded ${rows.length} briefs for ${label} (mean ${mean(rows.map((r) => r.score))}) in ${file}\n`);
  }
  let runs = history.runs;
  if (opt('agent', null)) runs = runs.filter((r) => r.agent === opt('agent'));
  if (opt('brief', null)) runs = runs.filter((r) => r.brief === opt('brief'));
  if (flag('json')) { console.log(JSON.stringify(runs, null, 1)); process.exit(0); }
  if (!runs.length) { console.log(`No runs recorded in ${file} yet. Add one: node scripts/eval-history.mjs --add <run dir> --label <agent>`); process.exit(0); }
  console.log(`By agent (mean score per run, oldest first)\n\n${agentTable(runs, +opt('last', '6'))}\n`);
  console.log(`By brief (latest score per agent, change since that agent's previous run)\n\n${briefTable(runs)}`);
}
