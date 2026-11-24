#!/usr/bin/env node
// Authoring helper: expands {{icon:name[:size]}} placeholders in component and blueprint HTML in place,
// so every shipped .html file is plain, dependency-free markup with inline SVG.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expandIcons, loadIcons } from './lib/icons.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const icons = loadIcons(root);
let changed = 0;
const walk = (dir) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { if (f !== 'node_modules' && f !== 'dist') walk(p); continue; }
    if (!f.endsWith('.html')) continue;
    const src = readFileSync(p, 'utf8');
    const out = expandIcons(src, icons);
    if (out !== src) { writeFileSync(p, out); changed++; }
  }
};
for (const d of ['components', 'blueprints']) walk(join(root, d));
if (changed) console.log(`Expanded icons in ${changed} file(s).`);
