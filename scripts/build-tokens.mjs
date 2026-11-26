#!/usr/bin/env node
// Builds tokens/palettes/*.css, tokens/palettes/palettes.json, tokens/typography/typography.css
// and references/palettes.md from the curated seed files. Deterministic: same seeds, same bytes.
import { readFileSync, writeFileSync } from 'node:fs';
import { formatJson } from './lib/json.mjs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { clampChroma, contrast, oklchToRgb8, rgb8ToHex, round, toCss } from './lib/color.mjs';
import { CHART_SERIES, RULES, STATUS_NAMES } from './lib/contrast-rules.mjs';
import { parseWebfont } from './lib/webfont.mjs';
import { pickAccent } from '../engine/compose/accent.mjs';

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

  // Accent: find the lightness nearest the seed where ink-on-accent and accent-on-page both pass (engine/compose/accent.mjs).
  const [, aC, aH] = seed.accent;
  const best = pickAccent(seed.accent, { inks: seed.ink ? [fix(seed.ink)] : null, grounds: [t['bg-canvas'], t['bg-surface-1']] });
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
    // A band in the brand's own colour (data-tone="accent"): the accent is the ground, its ink the text, and
    // buttons invert (ink fill, accent label) so they stay the one solid thing in the band.
    {
      const solid = toCss(t['accent-solid']), ink = toCss(t['accent-ink']);
      // Sections only: badges and art panels use data-tone="accent" for their own small tint.
      css += `[data-palette="${p.id}"][data-mode="${mode}"] :is(section, header, footer, aside)[data-tone="accent"] {\n  --bg-canvas: ${solid};\n  --bg-surface-1: color-mix(in oklab, ${ink} 10%, ${solid});\n  --bg-surface-2: color-mix(in oklab, ${ink} 14%, ${solid});\n  --bg-surface-3: color-mix(in oklab, ${ink} 20%, ${solid});\n  --text-primary: ${ink};\n  --text-secondary: ${ink};\n  --text-muted: ${ink};\n  --border-hairline: color-mix(in oklab, ${ink} 26%, ${solid});\n  --border-strong: color-mix(in oklab, ${ink} 60%, ${solid});\n  --accent-solid: ${ink};\n  --accent-hover: color-mix(in oklab, ${ink} 88%, ${solid});\n  --accent-ink: ${solid};\n  --accent-text: ${ink};\n  --accent-soft: color-mix(in oklab, ${ink} 16%, ${solid});\n  --focus-ring: ${ink};\n}\n`;
    }
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
writeFileSync(join(root, 'tokens/palettes/palettes.json'), formatJson({ version: 1, palettes: out }));

// ---------- typography ----------
const { pairings } = JSON.parse(readFileSync(join(root, 'tokens/typography/source.json'), 'utf8'));
const VW_MIN = 360, VW_MAX = 1440;
const clampSize = (min, max) => {
  const slope = (max - min) / (VW_MAX - VW_MIN);
  const icpt = min - slope * VW_MIN;
  const rem = (px) => +(px / 16).toFixed(4);
  // Small steps can shrink as the viewport grows (ratio^-n); clamp() needs its bounds in order either way.
  return `clamp(${rem(Math.min(min, max))}rem, ${rem(icpt)}rem + ${+(slope * 100).toFixed(4)}vw, ${rem(Math.max(min, max))}rem)`;
};
checkPairings(pairings);
let tcss = '/* Typography pairings — generated by scripts/build-tokens.mjs from tokens/typography/source.json. Do not edit. */\n';
tcss += '/* Variable axes are exposed as --axis-<role>-<axis>-min/-max. Where a face has an opsz axis, optical sizing follows the\n   font size (font-optical-sizing: auto), so one family is sharper at headline size and sturdier in text. */\n';
for (const t of pairings) {
  tcss += `[data-type="${t.id}"] {\n`;
  tcss += `  --font-display: ${withFallback(t.display, t)};\n  --font-body: ${withFallback(t.body, t)};\n  --font-mono: ${withFallback(t.mono, t)};\n`;
  tcss += `  --weight-display: ${t.displayWeight};\n  --weight-body: ${t.bodyWeight};\n`;
  tcss += `  --tracking-display: ${t.displayTracking}em;\n  --leading-display: ${t.displayLeading};\n`;
  for (let n = -2; n <= 5; n++) {
    const min = t.base[0] * t.ratio[0] ** n;
    const max = t.base[1] * t.ratio[1] ** n;
    tcss += `  --step-${n < 0 ? 'n' + -n : n}: ${clampSize(min, max)};\n`;
  }
  // Axis ranges the webfont link (and scripts/fonts.mjs) actually loads, per role: a weight outside them
  // falls back to the nearest loaded one, so these are the values worth using.
  const loaded = parseWebfont(t.webfont);
  for (const f of t.fonts ?? []) {
    const req = loaded.find((x) => x.family === f.family);
    if (!f.axes || !req?.axes) continue;
    for (const role of f.roles) for (const [axis, [lo, hi]] of Object.entries(req.axes)) if (hi > lo) tcss += `  --axis-${role}-${axis}-min: ${lo};\n  --axis-${role}-${axis}-max: ${hi};\n`;
  }
  // A wide (or narrow) display cut: font-stretch selects it on the wdth axis. Only the display family has a
  // width axis in such a pairing (checkPairings enforces it), so setting it once leaves body text alone.
  if (t.displayStretch) tcss += `  --stretch-display: ${t.displayStretch}%;\n  font-stretch: var(--stretch-display);\n`;
  if (loaded.some((x) => x.axes?.opsz)) tcss += `  font-optical-sizing: auto;\n`;
  tcss += `}\n`;
}
writeFileSync(join(root, 'tokens/typography/typography.css'), tcss);

// Keep the profile schema's typography enum in step with the pairings.
{
  const schemaPath = join(root, 'engine/profiles/taste-profile.schema.json');
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
  if (schema.properties?.typography?.enum) {
    schema.properties.typography.enum = pairings.map((t) => t.id);
    writeFileSync(schemaPath, `${JSON.stringify(schema, null, 2)}\n`);
  }
}

/**
 * Put "<Family> Fallback" right after each web family in a stack. The name matches no installed font, so
 * it is skipped and the system faces after it show, until scripts/fonts.mjs self-hosts the pairing: its
 * fonts.css defines that name as a local face scaled to the web font's metrics, so the swap does not shift.
 */
function withFallback(stack, t) {
  let out = stack;
  for (const f of t.fonts ?? []) out = out.replace(`"${f.family}",`, `"${f.family}", "${f.family} Fallback",`);
  return out;
}

/** Refuse pairings that would ship the default font, a closed licence or a width axis on the body face. */
function checkPairings(list) {
  // The critic's stock-sans list (scripts/audit-ui.mjs, taste-default-font): never headline and body alike.
  const STOCK = /^(inter|inter display|geist|roboto|arial|helvetica|helvetica neue|system-ui|-apple-system|blinkmacsystemfont|segoe ui|space grotesk|open sans|poppins|montserrat)$/;
  const first = (s) => s.split(',')[0].replace(/["']/g, '').trim().toLowerCase();
  const ids = new Set();
  for (const t of list) {
    const where = `tokens/typography/source.json "${t.id}"`;
    if (ids.has(t.id)) throw new Error(`${where}: duplicate id`);
    ids.add(t.id);
    // appsOnly: one sans is right in an app screen; the critic flags it only on pages with a hero.
    if (!t.appsOnly && STOCK.test(first(t.display)) && first(t.display) === first(t.body)) throw new Error(`${where}: headline and body are both ${first(t.display)} (taste-default-font)`);
    for (const f of t.fonts ?? []) {
      if (!/^(OFL-1\.1|Apache-2\.0)$/.test(f.licence ?? '')) throw new Error(`${where}: ${f.family} needs an open licence (OFL-1.1 or Apache-2.0)`);
      if (!['sans', 'serif', 'mono'].includes(f.fallback)) throw new Error(`${where}: ${f.family} fallback must be sans, serif or mono`);
      // Headline and body faces must be in the webfont link; a mono face may be self-hosted only.
      if (f.roles.some((r) => r !== 'mono') && !new RegExp(`family=${f.family.replace(/ /g, '\\+')}(:|&|$)`).test(t.webfont ?? '')) throw new Error(`${where}: ${f.family} is not in the webfont URL`);
    }
    if (t.displayStretch) {
      const display = (t.fonts ?? []).find((f) => f.roles.includes('display'));
      const [lo, hi] = display?.axes?.wdth ?? [];
      if (!(t.displayStretch >= lo && t.displayStretch <= hi)) throw new Error(`${where}: displayStretch ${t.displayStretch} is outside the display face's wdth axis`);
      if (display.roles.length > 1 || t.fonts.some((f) => f !== display && f.axes?.wdth)) throw new Error(`${where}: font-stretch is set on the whole pairing, so only the display face may have a width axis`);
    }
  }
}

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
