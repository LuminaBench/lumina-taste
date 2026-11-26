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

const fold = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** The motif whose keywords best match a brief, or null. Same rule as pickMotif() in art-panel.ts. */
export function pickMotif(text) {
  const words = fold(text).split(/[^a-z]+/).filter((w) => w.length > 2);
  let best = null, score = 0;
  for (const [name, { words: keys }] of Object.entries(loadMotifs())) {
    const list = keys.map(fold);
    const s = words.reduce((acc, w, i) => acc + (list.some((k) => k === w || (k.length > 3 && w.startsWith(k)) || (w.length > 3 && k.startsWith(w) && k.length - w.length <= 2)) ? 1 / (1 + i * 0.08) : 0), 0);
    if (s > score) { score = s; best = name; }
  }
  return best;
}

/** The inline SVG the art panel expects as its first child. */
export function motifSvg(name) {
  const m = loadMotifs()[name];
  return m ? `<svg data-part="motif" viewBox="0 0 160 160" aria-hidden="true" focusable="false">${m.svg}</svg>` : '';
}
