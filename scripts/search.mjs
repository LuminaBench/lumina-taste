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
const kind = opt('kind', null);
const limit = +opt('limit', '8');
const asJson = flag('json');
const query = args.join(' ').trim();
if (!query) {
  console.error('Usage: node scripts/search.mjs "<words>" [--kind ui|chart|blueprint|palette|typography|style] [--limit 8] [--json]');
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
