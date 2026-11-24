#!/usr/bin/env node
// Re-reads the shipped CSS (not the solver's memory) and checks every contrast rule
// for every palette × mode. Exits 1 on any failure.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrast, parseOklch } from './lib/color.mjs';
import { RULES } from './lib/contrast-rules.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { palettes } = JSON.parse(readFileSync(join(root, 'tokens/palettes/source.json'), 'utf8'));
const REQUIRED = ['bg-canvas', 'bg-surface-1', 'bg-surface-2', 'bg-surface-3', 'border-hairline', 'border-strong',
  'text-primary', 'text-secondary', 'text-muted', 'accent-solid', 'accent-soft', 'accent-ink',
  'status-positive', 'status-negative', 'status-warning', 'status-info'];

let themes = 0, checks = 0;
const failures = [];
for (const p of palettes) {
  const css = readFileSync(join(root, `tokens/palettes/${p.id}.css`), 'utf8');
  for (const mode of ['light', 'dark']) {
    const block = new RegExp(`\\[data-palette="${p.id}"\\]\\[data-mode="${mode}"\\]\\s*\\{([^}]*)\\}`).exec(css);
    if (!block) { failures.push(`${p.id}/${mode}: block missing`); continue; }
    const vars = {};
    for (const [, k, v] of block[1].matchAll(/--([\w-]+):\s*([^;]+);/g)) vars[k] = v.trim();
    if (vars['focus-ring'] === 'var(--accent-text)') vars['focus-ring'] = vars['accent-text'];
    for (const k of REQUIRED) if (!vars[k]) failures.push(`${p.id}/${mode}: missing --${k}`);
    themes++;
    for (const [fg, bgs, min] of RULES)
      for (const bg of bgs) {
        checks++;
        const r = contrast(parseOklch(vars[fg]), parseOklch(vars[bg]));
        if (r < min) failures.push(`${p.id}/${mode}: --${fg} on --${bg} = ${r.toFixed(2)} (needs ${min})`);
      }
  }
}
if (failures.length) {
  console.error(failures.join('\n'));
  console.error(`\n✗ ${failures.length} contrast failures across ${themes} themes`);
  process.exit(1);
}
console.log(`✓ ${checks} contrast checks pass across ${themes} themes (${palettes.length} palettes × light/dark). Text ≥ 7:1 (AAA) primary, ≥ 4.5:1 (AA) secondary/muted/status/accent text, ≥ 3:1 UI marks.`);
