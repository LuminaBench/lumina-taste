#!/usr/bin/env node
// Export a lumina-taste palette and type pairing for the stack an agent is already in.
//
//   node scripts/export-tokens.mjs --format shadcn    --palette navy-sand --type financial      > app/globals.css
//   node scripts/export-tokens.mjs --format tailwind4 --palette slate-forest                    > src/theme.css
//   node scripts/export-tokens.mjs --format tailwind3 --palette ice-cobalt                      > tailwind.preset.js
//   node scripts/export-tokens.mjs --format json      --palette paper-ink
//   (--profile taste-profile.json reads palette, type and radius from a profile instead)
//
// shadcn:    :root and .dark blocks with every shadcn/ui variable (background, card, primary, ring, chart-1…5…),
//            filled with this palette's contrast-checked OKLCH values, plus --radius and font stacks.
// tailwind4: an @theme block (colours, fonts, radii) with concrete values, and .dark overrides.
// tailwind3: a preset for tailwind.config.js (presets: [require('./tailwind.preset.js')]); colours read
//            CSS variables, so include the :root/.dark blocks it prints at the top as a comment.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i < 0 ? def : args[i + 1]; };
let profile = {};
if (opt('profile', null)) {
  if (!existsSync(opt('profile'))) { console.error(`No profile at ${opt('profile')}`); process.exit(2); }
  profile = JSON.parse(readFileSync(opt('profile'), 'utf8'));
}
const format = opt('format', 'shadcn');
const paletteId = opt('palette', profile.palette ?? 'slate-forest');
const typeId = opt('type', profile.typography ?? 'precision');
const radiusAxis = opt('radius', profile.radius ?? 'balanced');

const palettes = JSON.parse(readFileSync(join(root, 'tokens/palettes/palettes.json'), 'utf8')).palettes;
const pairings = JSON.parse(readFileSync(join(root, 'tokens/typography/source.json'), 'utf8')).pairings;
const pal = palettes.find((p) => p.id === paletteId);
const type = pairings.find((p) => p.id === typeId);
if (!pal) { console.error(`Unknown palette "${paletteId}". One of: ${palettes.map((p) => p.id).join(', ')}`); process.exit(2); }
if (!type) { console.error(`Unknown type pairing "${typeId}". One of: ${pairings.map((p) => p.id).join(', ')}`); process.exit(2); }
if (!['shadcn', 'tailwind4', 'tailwind3', 'json'].includes(format)) { console.error('--format must be shadcn, tailwind4, tailwind3 or json'); process.exit(2); }

const RADIUS = { sharp: '0.25rem', balanced: '0.5rem', soft: '0.875rem' }[radiusAxis] ?? '0.5rem';
const v = (mode, k) => pal.modes[mode].tokens[k].oklch;

// shadcn/ui variable names → lumina-taste tokens. shadcn's "accent" is a hover surface, not the brand colour.
const SHADCN = {
  background: 'bg-canvas', foreground: 'text-primary',
  card: 'bg-surface-1', 'card-foreground': 'text-primary',
  popover: 'bg-surface-1', 'popover-foreground': 'text-primary',
  primary: 'accent-solid', 'primary-foreground': 'accent-ink',
  secondary: 'bg-surface-2', 'secondary-foreground': 'text-primary',
  muted: 'bg-surface-2', 'muted-foreground': 'text-muted',
  accent: 'bg-surface-3', 'accent-foreground': 'text-primary',
  destructive: 'status-negative', 'destructive-foreground': 'bg-canvas',
  border: 'border-hairline', input: 'border-strong', ring: 'focus-ring',
  'chart-1': 'chart-1', 'chart-2': 'chart-2', 'chart-3': 'chart-3', 'chart-4': 'chart-4', 'chart-5': 'chart-5',
  sidebar: 'bg-surface-1', 'sidebar-foreground': 'text-primary', 'sidebar-primary': 'accent-solid', 'sidebar-primary-foreground': 'accent-ink',
  'sidebar-accent': 'bg-surface-3', 'sidebar-accent-foreground': 'text-primary', 'sidebar-border': 'border-hairline', 'sidebar-ring': 'focus-ring',
};
// Semantic Tailwind colour names, so classes read like the design: bg-canvas, bg-surface, text-ink, text-ink-muted, bg-accent…
const TW = {
  canvas: 'bg-canvas', surface: 'bg-surface-1', 'surface-2': 'bg-surface-2', 'surface-3': 'bg-surface-3',
  ink: 'text-primary', 'ink-2': 'text-secondary', 'ink-muted': 'text-muted',
  line: 'border-hairline', 'line-strong': 'border-strong',
  accent: 'accent-solid', 'accent-hover': 'accent-hover', 'accent-ink': 'accent-ink', 'accent-soft': 'accent-soft', 'accent-text': 'accent-text',
  positive: 'status-positive', 'positive-soft': 'status-positive-soft', negative: 'status-negative', 'negative-soft': 'status-negative-soft',
  warning: 'status-warning', 'warning-soft': 'status-warning-soft', info: 'status-info', 'info-soft': 'status-info-soft',
  ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`chart-${i + 1}`, `chart-${i + 1}`])),
};
const fonts = { sans: type.body, display: type.display, mono: type.mono };
const head = `/* lumina-taste · palette ${pal.id} (${pal.name}) · type ${type.id} · radius ${radiusAxis}. Every text/surface pair here passes WCAG AA (primary text AAA). */`;
const block = (sel, map, mode, prefix = '--') => `${sel} {\n${Object.entries(map).map(([k, t]) => `  ${prefix}${k}: ${v(mode, t)};`).join('\n')}\n}`;

let out = '';
if (format === 'shadcn') {
  out = `${head}\n${type.webfont ? `@import url("${type.webfont}");\n` : ''}\n${block(':root', SHADCN, 'light').replace(/\n}$/, `\n  --radius: ${RADIUS};\n  --font-sans: ${fonts.sans};\n  --font-display: ${fonts.display};\n  --font-mono: ${fonts.mono};\n}`)}\n\n${block('.dark', SHADCN, 'dark')}\n`;
} else if (format === 'tailwind4') {
  const theme = Object.entries(TW).map(([k, t]) => `  --color-${k}: ${v('light', t)};`).join('\n');
  out = `${head}\n${type.webfont ? `@import url("${type.webfont}");\n` : ''}@import "tailwindcss";\n\n@custom-variant dark (&:where(.dark, .dark *));\n\n@theme {\n${theme}\n  --font-sans: ${fonts.sans};\n  --font-display: ${fonts.display};\n  --font-mono: ${fonts.mono};\n  --radius-sm: calc(${RADIUS} * 0.75);\n  --radius-md: ${RADIUS};\n  --radius-lg: calc(${RADIUS} * 1.5);\n  --radius-xl: calc(${RADIUS} * 2);\n}\n\n${block('.dark', Object.fromEntries(Object.entries(TW).map(([k, t]) => [`color-${k}`, t])), 'dark')}\n`;
} else if (format === 'tailwind3') {
  const vars = (mode) => Object.entries(TW).map(([k, t]) => `     --lt-${k}: ${v(mode, t)};`).join('\n');
  out = `${head.replace('/*', '/**').replace('*/', '')}\n * Add these CSS variables to your global stylesheet:\n *   :root {\n${vars('light').replace(/^/gm, ' *')}\n *   }\n *   .dark {\n${vars('dark').replace(/^/gm, ' *')}\n *   }\n */\nmodule.exports = {\n  darkMode: 'class',\n  theme: {\n    extend: {\n      colors: {\n${Object.keys(TW).map((k) => `        '${k}': 'var(--lt-${k})',`).join('\n')}\n      },\n      fontFamily: {\n        sans: [${JSON.stringify(fonts.sans)}],\n        display: [${JSON.stringify(fonts.display)}],\n        mono: [${JSON.stringify(fonts.mono)}],\n      },\n      borderRadius: { sm: 'calc(${RADIUS} * 0.75)', DEFAULT: '${RADIUS}', md: '${RADIUS}', lg: 'calc(${RADIUS} * 1.5)', xl: 'calc(${RADIUS} * 2)' },\n    },\n  },\n};\n`;
} else {
  out = JSON.stringify({ palette: pal.id, type: type.id, radius: RADIUS, fonts, light: Object.fromEntries(Object.keys(pal.modes.light.tokens).map((k) => [k, v('light', k)])), dark: Object.fromEntries(Object.keys(pal.modes.dark.tokens).map((k) => [k, v('dark', k)])) }, null, 2) + '\n';
}
process.stdout.write(out);
