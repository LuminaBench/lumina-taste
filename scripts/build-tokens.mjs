#!/usr/bin/env node
// Builds tokens/palettes/*.css, tokens/palettes/palettes.json, tokens/typography/typography.css
// and references/palettes.md from the curated seed files. Deterministic: same seeds, same bytes.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { clampChroma, contrast, oklchToRgb8, rgb8ToHex, round, toCss } from './lib/color.mjs';
import { CHART_SERIES, RULES, STATUS_NAMES } from './lib/contrast-rules.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MARGIN = 0.05; // solve slightly past each threshold so rounding never tips a pair under

const STATUS_HUES = { positive: [150, 0.13], negative: [27, 0.17], warning: [68, 0.14], info: [245, 0.11] };
// Okabe–Ito–inspired hues: distinguishable for the common colour-vision deficiencies.
const CHART_HUES = [[250, 0.13], [58, 0.15], [170, 0.11], [32, 0.16], [222, 0.09], [345, 0.12], [95, 0.13], [290, 0.09], [0, 0]];
const CHART_L = { light: [0.52, 0.64, 0.5, 0.58, 0.62, 0.55, 0.6, 0.54], dark: [0.74, 0.84, 0.7, 0.8, 0.86, 0.72, 0.88, 0.78] };

const fix = (lch) => round(clampChroma(lch));

/** Move L in `dir` (−1 darker, +1 lighter) until `lch` meets `min` against every background. */
function solve(lch, dir, against, min) {
  let c = fix(lch);
  for (let i = 0; i < 400; i++) {
    if (against.every((bg) => contrast(c, bg) >= min + MARGIN)) return c;
    const L = c[0] + dir * 0.005;
    if (L < 0 || L > 1) break;
    c = fix([L, lch[1], lch[2]]);
  }
  throw new Error(`Cannot satisfy ${min}:1 for ${JSON.stringify(lch)}`);
}

function derive(seed, mode) {
  const light = mode === 'light';
  const dir = light ? -1 : 1;
  const [nH, nC] = seed.neutral;
  const cl = seed.canvasL;
  const t = {};
  t['bg-canvas'] = fix([cl, nC, nH]);
  if (light) {
    t['bg-surface-1'] = fix([Math.min(0.997, cl + 0.016), nC * 0.5, nH]);
    t['bg-surface-2'] = fix([cl - 0.024, nC * 1.1, nH]);
    t['bg-surface-3'] = fix([cl - 0.05, nC * 1.25, nH]);
    t['border-hairline'] = fix([cl - 0.085, nC * 1.3, nH]);
  } else {
    t['bg-surface-1'] = fix([cl + 0.035, nC * 1.05, nH]);
    t['bg-surface-2'] = fix([cl + 0.065, nC * 1.1, nH]);
    t['bg-surface-3'] = fix([cl + 0.095, nC * 1.15, nH]);
    t['border-hairline'] = fix([cl + 0.115, nC * 1.2, nH]);
  }
  const surfaces = ['bg-canvas', 'bg-surface-1', 'bg-surface-2', 'bg-surface-3'].map((k) => t[k]);
  const reading = surfaces.slice(0, 3);
  const inkC = Math.min(nC * 1.6, 0.03);
  t['border-strong'] = solve([light ? cl - 0.3 : cl + 0.28, nC * 1.5, nH], dir, surfaces.slice(0, 2), 3);
  t['text-primary'] = solve([light ? 0.2 : 0.965, inkC, nH], dir, surfaces, 7);
  t['text-secondary'] = solve([light ? 0.42 : 0.8, inkC, nH], dir, surfaces, 4.5);
  t['text-muted'] = solve([light ? 0.53 : 0.7, inkC * 0.9, nH], dir, surfaces, 4.5);

  // Accent: find the lightness nearest the seed where ink-on-accent and accent-on-page both pass.
  const [aL, aC, aH] = seed.accent;
  const inks = seed.ink ? [fix(seed.ink)] : [fix([0.985, 0.008, aH]), fix([0.17, 0.02, aH])];
  let best = null;
  for (const ink of inks) {
    for (let L = 0.1; L <= 0.97; L += 0.005) {
      const solid = fix([L, aC, aH]);
      const away = ink[0] > solid[0] ? -1 : 1;
      const hover = fix([L + away * 0.045, aC, aH]);
      const ok =
        contrast(ink, solid) >= 4.5 + MARGIN &&
        contrast(ink, hover) >= 4.5 + MARGIN &&
        contrast(solid, t['bg-canvas']) >= 3 + MARGIN &&
        contrast(solid, t['bg-surface-1']) >= 3 + MARGIN;
      if (!ok) continue;
      const score = Math.abs(L - aL) - contrast(ink, solid) * 0.0005;
      if (!best || score < best.score) best = { score, ink, solid, hover };
    }
  }
  if (!best) throw new Error(`No accent solution for ${JSON.stringify(seed.accent)} (${mode})`);
  t['accent-solid'] = best.solid;
  t['accent-hover'] = best.hover;
  t['accent-ink'] = best.ink;
  const softC = seed.ink ? Math.min(seed.ink[1] * 0.3, 0.06) : Math.min(aC * 0.32, 0.05);
  t['accent-soft'] = fix([light ? Math.min(cl - 0.025, 0.945) : cl + 0.075, softC, seed.ink ? seed.ink[2] : aH]);
  t['accent-text'] = solve([best.solid[0], Math.max(aC, 0.02), aH], dir, [...surfaces, t['accent-soft']], 4.5);
  t['focus-ring'] = t['accent-text'];

  for (const s of STATUS_NAMES) {
    const [h, c] = STATUS_HUES[s];
    t[`status-${s}-soft`] = fix([light ? Math.min(cl - 0.02, 0.955) : cl + 0.06, light ? 0.035 : 0.04, h]);
    t[`status-${s}`] = solve([light ? 0.54 : 0.8, c, h], dir, [...reading, t[`status-${s}-soft`]], 4.5);
  }

  // Chart series: accent first, then the CVD-safe set minus any hue that collides with the accent.
  const hues = CHART_HUES.filter(([h, c]) => aC < 0.05 || c === 0 || Math.abs(((h - aH + 540) % 360) - 180) > 28);
  const series = [[aC < 0.05 ? CHART_HUES[0][1] : aC, aC < 0.05 ? CHART_HUES[0][0] : aH], ...hues.map(([h, c]) => [c, h])];
  const chartBgs = [t['bg-canvas'], t['bg-surface-1']];
  for (let i = 0; i < CHART_SERIES; i++) {
    const [c, h] = series[aC < 0.05 ? i + 1 : i] ?? series[i];
    t[`chart-${i + 1}`] = solve([CHART_L[mode][i], c, h], dir, chartBgs, 3);
  }
  return t;
}

function verify(tokens) {
  const results = [];
  for (const [fg, bgs, min] of RULES)
    for (const bg of bgs) results.push({ fg, bg, min, ratio: +contrast(tokens[fg], tokens[bg]).toFixed(2) });
  return results;
}

// ---------- palettes ----------
const { palettes } = JSON.parse(readFileSync(join(root, 'tokens/palettes/source.json'), 'utf8'));
const out = [];
const allCss = [];
for (const p of palettes) {
  const modes = {};
  let css = `/* ${p.name} — generated by scripts/build-tokens.mjs from tokens/palettes/source.json. Do not edit. */\n`;
  for (const mode of ['light', 'dark']) {
    const t = derive(p[mode], mode);
    const checks = verify(t);
    const fails = checks.filter((c) => c.ratio < c.min);
    if (fails.length) throw new Error(`${p.id}/${mode} fails: ${JSON.stringify(fails)}`);
    modes[mode] = {
      tokens: Object.fromEntries(Object.entries(t).map(([k, v]) => [k, { oklch: toCss(v), hex: rgb8ToHex(oklchToRgb8(v)) }])),
      minRatios: {
        textPrimary: Math.min(...checks.filter((c) => c.fg === 'text-primary' && c.min === 7).map((c) => c.ratio)),
        accentInk: Math.min(...checks.filter((c) => c.fg === 'accent-ink').map((c) => c.ratio)),
      },
    };
    css += `[data-palette="${p.id}"][data-mode="${mode}"] {\n  color-scheme: ${mode};\n`;
    for (const [k, v] of Object.entries(t)) css += k === 'focus-ring' ? `  --${k}: var(--accent-text);\n` : `  --${k}: ${toCss(v)};\n`;
    css += `}\n`;
    // A dark band inside a light page (data-tone="dark" on a section): the same palette's dark tokens, scoped.
    if (mode === 'dark') {
      css += `[data-palette="${p.id}"] [data-tone="dark"] {\n  color-scheme: dark;\n`;
      for (const [k, v] of Object.entries(t)) css += k === 'focus-ring' ? `  --${k}: var(--accent-text);\n` : `  --${k}: ${toCss(v)};\n`;
      css += `}\n`;
    }
  }
  writeFileSync(join(root, `tokens/palettes/${p.id}.css`), css);
  allCss.push(css);
  out.push({ id: p.id, name: p.name, category: p.category, mood: p.mood, modes });
}
writeFileSync(join(root, 'tokens/palettes/all.css'), allCss.join('\n'));
writeFileSync(join(root, 'tokens/palettes/palettes.json'), JSON.stringify({ version: 1, palettes: out }, null, 2) + '\n');

// ---------- typography ----------
const { pairings } = JSON.parse(readFileSync(join(root, 'tokens/typography/source.json'), 'utf8'));
const VW_MIN = 360, VW_MAX = 1440;
const clampSize = (min, max) => {
  const slope = (max - min) / (VW_MAX - VW_MIN);
  const icpt = min - slope * VW_MIN;
  const rem = (px) => +(px / 16).toFixed(4);
  return `clamp(${rem(min)}rem, ${rem(icpt)}rem + ${+(slope * 100).toFixed(4)}vw, ${rem(max)}rem)`;
};
let tcss = '/* Typography pairings — generated by scripts/build-tokens.mjs from tokens/typography/source.json. Do not edit. */\n';
for (const t of pairings) {
  tcss += `[data-type="${t.id}"] {\n`;
  tcss += `  --font-display: ${t.display};\n  --font-body: ${t.body};\n  --font-mono: ${t.mono};\n`;
  tcss += `  --weight-display: ${t.displayWeight};\n  --weight-body: ${t.bodyWeight};\n`;
  tcss += `  --tracking-display: ${t.displayTracking}em;\n  --leading-display: ${t.displayLeading};\n`;
  for (let n = -2; n <= 5; n++) {
    const min = t.base[0] * t.ratio[0] ** n;
    const max = t.base[1] * t.ratio[1] ** n;
    tcss += `  --step-${n < 0 ? 'n' + -n : n}: ${clampSize(min, max)};\n`;
  }
  tcss += `}\n`;
}
writeFileSync(join(root, 'tokens/typography/typography.css'), tcss);

// ---------- reference table ----------
let md = `# Palettes\n\nGenerated by \`npm run tokens\`. Every palette ships light and dark, and every pairing in \`scripts/lib/contrast-rules.mjs\` is verified on 8-bit sRGB output (\`npm run test:contrast\`).\n\n`;
md += `| Palette | id | Category | Mood | Light canvas / accent | Dark canvas / accent | Min text contrast (L / D) |\n| --- | --- | --- | --- | --- | --- | --- |\n`;
for (const p of out) {
  const l = p.modes.light, d = p.modes.dark;
  md += `| ${p.name} | \`${p.id}\` | ${p.category} | ${p.mood} | \`${l.tokens['bg-canvas'].hex}\` / \`${l.tokens['accent-solid'].hex}\` | \`${d.tokens['bg-canvas'].hex}\` / \`${d.tokens['accent-solid'].hex}\` | ${l.minRatios.textPrimary} / ${d.minRatios.textPrimary} |\n`;
}
md += `\n## Semantic tokens\n\n| Token | Role | Rule |\n| --- | --- | --- |\n`;
const roles = {
  'bg-canvas': 'Page background', 'bg-surface-1': 'Cards, panels, inputs', 'bg-surface-2': 'Recessed areas, table headers, wells',
  'bg-surface-3': 'Hover and pressed fills, selected rows', 'border-hairline': 'Dividers and card outlines (decorative)',
  'border-strong': 'Input borders, control outlines', 'text-primary': 'Headings and body text', 'text-secondary': 'Supporting copy, labels',
  'text-muted': 'Captions, placeholders, axis labels', 'accent-solid': 'Primary buttons, selected indicators', 'accent-hover': 'Hover state of accent-solid',
  'accent-ink': 'Text and icons on accent-solid', 'accent-soft': 'Selected chip / row tint', 'accent-text': 'Links and accent text on surfaces',
  'focus-ring': 'Keyboard focus outline', 'status-*': 'Positive, negative, warning, info text and icons', 'status-*-soft': 'Status tint backgrounds',
  'chart-1…8': 'Categorical series (colour-vision-deficiency-safe order)',
};
const ruleText = (fg) => RULES.filter((r) => r[0] === fg || (fg.includes('*') && r[0].startsWith(fg.replace('*', '').replace('-soft', '')) && !fg.endsWith('soft')) || (fg.startsWith('chart') && r[0] === 'chart-1')).map((r) => `≥ ${r[2]}:1 on ${r[1].length} backgrounds`)[0] ?? '—';
for (const [k, v] of Object.entries(roles)) md += `| \`--${k}\` | ${v} | ${ruleText(k)} |\n`;
writeFileSync(join(root, 'references/palettes.md'), md);

console.log(`Built ${out.length} palettes × 2 modes and ${pairings.length} typography pairings.`);

// ---------- profile option lists (consumed by engine/profiles and the CLI) ----------
const styleSrc = JSON.parse(readFileSync(join(root, 'tokens/styles/source.json'), 'utf8'));
const opts = {
  palettes: out.map((p) => ({ id: p.id, name: p.name, category: p.category })),
  typography: pairings.map((t) => ({ id: t.id, name: t.name, webfont: t.webfont })),
  styles: (styleSrc.styles ?? styleSrc).map((st) => ({ id: st.id, name: st.name, kind: st.kind, palette: st.palette, mode: st.mode, typography: st.type, radius: st.radius })),
};
writeFileSync(
  join(root, 'engine/profiles/options.mjs'),
  `// Generated by scripts/build-tokens.mjs. Do not edit.\nexport const PALETTES = ${JSON.stringify(opts.palettes, null, 2)};\nexport const TYPOGRAPHY = ${JSON.stringify(opts.typography, null, 2)};\nexport const STYLES = ${JSON.stringify(opts.styles, null, 2)};\n`,
);
