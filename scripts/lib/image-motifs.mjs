// Reads the art panel's motif table from components/ui/data/art-panel/art-panel.ts, so Node scripts (find-images
// --fill) draw the same spot illustrations as the component. One motif per line: name: ['keywords', '<svg body>'],
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
let cache = null;

export function loadMotifs() {
  if (cache) return cache;
  const src = readFileSync(join(root, 'components/ui/data/art-panel/art-panel.ts'), 'utf8');
  cache = {};
  for (const m of src.matchAll(/^\s+'?([\w-]+)'?: \['([^']*)', '(.+)'\],$/gm)) cache[m[1]] = { words: m[2].split(' '), svg: m[3] };
  return cache;
}

// The matching rules live in art-panel.ts (rankMotifs); these are the same, kept in step by a unit test.
const NOT = /\b(house (blend|wine|special|music|plant|party|style|red|white|band)|key (lime|lime pie|points?|facts?|dates?|stage)|book (now|online|a|your|today|in)|chart (topping)|ticket (price|prices)|tool ?kit|phone (number|call|us)|box (set)|pin (number|code)|nursery (school|schools|class)|lock (in|down)|coach (trip|trips|holiday|holidays|travel|hire)|sound (advice|judgement)|file (a|your)|home (page|pages|screen|screens)|plant (hire))\b/g;
const ENDING = /^(s|es|er|ers|ies)$/;
// Words that are never a subject here: the instruction to build, a trainer at a gym.
const STOP = /^(build|trainer|trainers|training)$/;
const fold = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const fits = (k, w) => k === w || (k.length > 3 && w.startsWith(k) && ENDING.test(w.slice(k.length))) || (w.length > 3 && k.startsWith(w) && ENDING.test(k.slice(w.length)));

/** Motifs whose keywords match a brief, best first. Earlier words in the brief count more. */
export function rankMotifs(text) {
  const words = `${fold(text)} `.replace(/\bfood banks?\b/g, 'foodbank').replace(/\bbox offices?\b/g, 'boxoffice').replace(NOT, (m) => m.replace(/^\w+ /, '_ ')).split(/[^a-z]+/).filter((w) => w.length > 2 && !STOP.test(w));
  const scored = [];
  for (const [name, { words: keys }] of Object.entries(loadMotifs())) {
    const list = keys.map(fold);
    const s = words.reduce((acc, w, i) => acc + (list.some((k) => fits(k, w)) ? 1 / (1 + i * 0.08) : 0), 0);
    if (s > 0) scored.push([name, s]);
  }
  return scored.sort((a, b) => b[1] - a[1]).map(([n]) => n);
}

/** The motif whose keywords best match a brief, or null. Same rule as pickMotif() in art-panel.ts. */
export function pickMotif(text) {
  return rankMotifs(text)[0] ?? null;
}

/** The inline SVG the art panel expects as its first child. */
export function motifSvg(name) {
  const m = loadMotifs()[name];
  return m ? `<svg data-part="motif" viewBox="0 0 160 160" aria-hidden="true" focusable="false">${m.svg}</svg>` : '';
}
