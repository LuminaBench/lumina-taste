#!/usr/bin/env node
// Fast local search across UI patterns, charts, blueprints, palettes, type pairings and styles.
// BM25 over names, ids, sloppy aliases and summaries, plus trigram fuzzy matching for typos.
//
//   node scripts/search.mjs "rotating arrow"
//   node scripts/search.mjs "9 dots menu" --kind ui
//   node scripts/search.mjs "long labels ranking" --kind chart --limit 3
//   node scripts/search.mjs "dark finance palette" --json
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { search, installHint } from './lib/search-core.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); if (i < 0) return def; const v = args[i + 1]; args.splice(i, 2); return v; };
const flag = (name) => { const i = args.indexOf(`--${name}`); if (i < 0) return false; args.splice(i, 1); return true; };
const card = opt('card', null);
const kind = opt('kind', null);
const limit = +opt('limit', '8');
const asJson = flag('json');
const query = args.join(' ').trim();
if (card) { printCard(card); process.exit(0); }
if (!query) {
  console.error('Usage: node scripts/search.mjs "<words>" [--kind ui|chart|blueprint|palette|typography|style] [--limit 8] [--json]\n       node scripts/search.mjs --card <id>     everything about one item on one screen');
  process.exit(2);
}

const cat = JSON.parse(readFileSync(join(root, 'catalog.json'), 'utf8'));
const scored = search(cat, query, { kind, limit });

if (asJson) {
  console.log(JSON.stringify(scored.map(({ d, s }) => ({ kind: d.kind, id: d.id, name: d.name, score: +s.toFixed(2), summary: d.summary, path: d.path ?? d.files?.[0], install: installHint(d) })), null, 2));
} else if (!scored.length) {
  console.log(`No matches for “${query}”. Try fewer or plainer words, e.g. "dropdown", "toggle", "line chart", "pricing".`);
  process.exit(1);
} else {
  for (const { d, s } of scored) {
    console.log(`${d.kind.padEnd(10)} ${d.id.padEnd(24)} ${d.name}  (${s.toFixed(1)})`);
    console.log(`${''.padEnd(11)}${d.summary}`);
    if (d.aliases?.length) console.log(`${''.padEnd(11)}aka: ${d.aliases.slice(0, 4).join(', ')}`);
    console.log(`${''.padEnd(11)}${installHint(d)}\n`);
  }
}

// One compact card per item: what it is, when to pick it (and its look-alikes), its parts, states,
// the agent prompt, files and the install line. Read this instead of opening the source files.
function printCard(id) {
  const c = JSON.parse(readFileSync(join(root, 'catalog.json'), 'utf8'));
  const all = [...c.ui, ...c.charts.map((x) => ({ ...x, kind: 'chart' })), ...c.blueprints.map((x) => ({ ...x, kind: 'blueprint' })), ...c.palettes.map((x) => ({ ...x, kind: 'palette' })), ...c.typography.map((x) => ({ ...x, kind: 'typography' })), ...(c.styles ?? []).map((x) => ({ ...x, kind: 'style' }))];
  const d = all.find((x) => x.id === id);
  if (!d) { console.error(`No item "${id}". Search first: node scripts/search.mjs "<words>"`); process.exit(1); }
  const kind = d.kind ?? 'ui';
  const L = [`${d.name}  (${kind} · ${d.id})`, '', d.summary];
  if (d.aliases?.length) L.push(`Also called: ${d.aliases.join(', ')}`);
  if (kind === 'ui') {
    const fam = JSON.parse(readFileSync(join(root, 'components/ui', d.family, 'family.json'), 'utf8'));
    const doc = (fam.components ?? fam.items ?? []).find((x) => x.id === id) ?? {};
    if (d.pattern) L.push(`Pattern: ${d.pattern}`);
    if (d.states?.length) L.push(`States: ${d.states.join(', ')}`);
    const pairs = JSON.parse(readFileSync(join(root, 'components/ui/compare.json'), 'utf8')).pairs.filter((p) => p.ids.includes(id));
    for (const p of pairs) L.push('', `${p.title} ${p.rule}`, `  This one: ${p.use[id]}`);
    if (doc.anatomy?.length) { L.push('', 'Parts:'); for (const a of doc.anatomy) L.push(`  ${a.name} (${a.sel})${a.api ? ` · ${a.api}` : ''}${a.text ? ` · ${a.text}` : ''}`); }
    if (doc.prompt) L.push('', `Prompt: ${doc.prompt}`);
    if (doc.debug) L.push(`Debug prompt: ${Array.isArray(doc.debug) ? doc.debug.join(' ') : doc.debug}`);
    if (d.react) L.push(`React: <${d.react} />`);
  }
  if (kind === 'chart') L.push(`Best for: ${d.bestFor}`, `Avoid for: ${d.avoidFor}`, `Data: ${d.dataShape}`, `React: <${d.react} />`);
  if (kind === 'blueprint') L.push(`Anatomy: ${d.anatomy}`, `Uses: ${(d.uses ?? []).join(', ')}`);
  if (kind === 'blueprint' && d.states?.length) L.push(`Other states: open with ?state=${d.states.join(' | ?state=')}`);
  if (kind === 'style') L.push(`Palette ${d.palette} (${d.mode}), type ${d.typography}, radius ${d.radius}`, `Use for: ${d.useFor}`, `Not: ${d.notTo}`);
  if (d.files?.length) L.push('', `Files: ${d.files.join(', ')}`);
  L.push(`Install: ${installHint({ ...d, kind })}`);
  console.log(L.join('\n'));
}
