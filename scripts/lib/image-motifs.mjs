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

// Scenes: the same composition as sceneSvg() and pickScene() in art-panel.ts, which also holds the table
// (SCENE_KIT: each motif's box, size, pose, ground and companion). Kept in step by a unit test that runs both.
let kit = null;
function sceneKit() {
  if (kit) return kit;
  const src = readFileSync(join(root, 'components/ui/data/art-panel/art-panel.ts'), 'utf8');
  const table = /export const SCENE_KIT = `([^`]*)`/.exec(src)[1];
  kit = Object.fromEntries(table.trim().split('\n').map((l) => {
    const [n, x0, y0, x1, y1, size, pose, ground, w] = l.trim().split(/\s+/);
    return [n, { box: [+x0, +y0, +x1, +y1], size: +size, float: pose === 'float', ground, with: w }];
  }));
  return kit;
}

/** The motifs for a scene from a brief, the subject first, or null. Same rule as pickScene() in art-panel.ts. */
export function pickScene(text) {
  const k = sceneKit();
  const out = rankMotifs(text).filter((n) => k[n]).slice(0, 3);
  if (!out.length) return null;
  if (out.length === 1) out.push(k[out[0]].with);
  if (out.every((n) => k[n].float)) {
    const w = [k[out[0]].with, ...out.map((n) => k[n].with)].find((n) => !k[n].float && !out.includes(n));
    if (w) out.splice(Math.min(out.length - 1, 2), out.length === 3 ? 1 : 0, w);
  }
  return out;
}

const r1 = (v) => String(Math.round(v * 10) / 10);
const r3 = (v) => String(Math.round(v * 1000) / 1000);
const GROUND = 176;
const WAVE = 'q10 -6 20 0t20 0'.repeat(110);
const FLOORS = {
  counter: `<rect data-m="floor" x="-2000" y="${GROUND}" width="4320" height="2000"/><path data-m="ink" d="M-2000 ${GROUND}H2320"/>`,
  line: `<path data-m="ink" d="M-2000 ${GROUND}H2320"/>`,
  road: `<rect data-m="floor" x="-2000" y="${GROUND}" width="4320" height="2000"/><path data-m="ink" d="M-2000 ${GROUND}H2320"/><path data-m="ink" data-g="dash" d="M-1996 ${GROUND + 14}H2320"/>`,
  water: `<path data-m="ink" d="M-2000 ${GROUND}${WAVE}"/><path data-m="ink" data-g="thin" d="M-1990 ${GROUND + 12}${WAVE}"/>`,
};

/** A scene's inline SVG from motif names ("cup bag" or ['crane', 'house']). Same drawing as sceneSvg() in art-panel.ts. */
export function sceneSvg(list) {
  const k = sceneKit();
  const motifs = loadMotifs();
  const names = (typeof list === 'string' ? list.trim().split(/[\s,]+/) : list).filter((n, i, a) => k[n] && motifs[n] && a.indexOf(n) === i).slice(0, 3);
  if (!names.length) return '';
  const all = names.map((n, i) => ({ n, i, ...k[n], s: 1, cx: 0, cy: 0 }));
  const w = (t) => (t.box[2] - t.box[0]) * t.s;
  const h = (t) => (t.box[3] - t.box[1]) * t.s;
  const stand = all.filter((t) => !t.float).sort((a, b) => b.size - a.size || a.i - b.i);
  const float = all.filter((t) => t.float);
  const top = stand.length ? stand[0].size : 0;
  stand.forEach((t, j) => { t.s = j === 0 ? 1 : (top === t.size ? 0.8 : top - t.size === 1 ? 0.64 : 0.48) * (j === 2 ? 0.86 : 1); });
  let L = 0, R = 0;
  stand.forEach((t, j) => {
    if (j === 0) { L = -w(t) / 2; R = w(t) / 2; return; }
    const ov = 0.3 * w(t);
    if (j === 1) { t.cx = R - ov + w(t) / 2; R = Math.max(R, t.cx + w(t) / 2); } else { t.cx = L + ov - w(t) / 2; L = Math.min(L, t.cx - w(t) / 2); }
  });
  const room = float.length ? 230 : 288;
  const f = R - L > room ? room / (R - L) : 1;
  const mid = float.length ? 142 : 160;
  stand.forEach((t) => { t.s *= f; t.cx = mid + (t.cx - (L + R) / 2) * f; t.cy = GROUND - h(t) / 2; });
  [L, R] = [mid - ((R - L) / 2) * f, mid + ((R - L) / 2) * f];
  const tall = stand.length ? Math.max(...stand.map(h)) : 0;
  float.forEach((t, j) => {
    if (!stand.length) { t.s = j === 0 ? 1 : 0.5; t.cx = j === 0 ? 150 : 246; t.cy = j === 0 ? 104 : 50; return; }
    // The subject is drawn larger than anything else that floats.
    t.s = t.i === 0 ? Math.min(0.74, 100 / Math.max(t.box[2] - t.box[0], t.box[3] - t.box[1])) : Math.min(0.56, 76 / Math.max(t.box[2] - t.box[0], t.box[3] - t.box[1]));
    const right = (j === 0) === (320 - R >= L);
    t.cx = right ? Math.min(316 - w(t) / 2, R + w(t) * 0.2) : Math.max(4 + w(t) / 2, L - w(t) * 0.2);
    t.cy = Math.max(6 + h(t) / 2, GROUND - tall * 0.92 - h(t) * 0.2);
  });
  const back = stand[0];
  const sky = back ? `<circle data-m="sky" cx="${r1(back.cx + w(back) * 0.18)}" cy="${r1(GROUND - h(back) * 0.62)}" r="${r1(h(back) * 0.5)}"/>` : '';
  const floor = back ? FLOORS[(all[0].float ? back : all[0]).ground] ?? FLOORS.line : '';
  const g = (t) => `<g data-role="${t.i === 0 ? 'lead' : 'rest'}" transform="translate(${r1(t.cx - t.s * (t.box[0] + t.box[2]) / 2)} ${r1(t.cy - t.s * (t.box[1] + t.box[3]) / 2)}) scale(${r3(t.s)})" style="--k:${r3(t.s)}">${motifs[t.n].svg}</g>`;
  // Crop the frame to the things (the ground and the sky run past it), so a tall panel shows them large.
  const xs = all.flatMap((t) => [t.cx - w(t) / 2, t.cx + w(t) / 2]);
  const vw = Math.max(232, Math.max(...xs) - Math.min(...xs) + 40);
  const vx = (Math.max(...xs) + Math.min(...xs)) / 2 - vw / 2;
  // And the empty sky above them (the disc behind the biggest thing included), so they draw larger.
  const tops = [...all.map((t) => t.cy - h(t) / 2), ...(back ? [GROUND - h(back) * 1.12] : [])];
  const vy = Math.max(0, Math.round(Math.min(...tops) - 10));
  return `<svg data-part="scene" viewBox="${r1(vx)} ${vy} ${r1(vw)} ${200 - vy}" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">${sky}${floor}${stand.map(g).join('')}${float.map(g).join('')}</svg>`;
}
