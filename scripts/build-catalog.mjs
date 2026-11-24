#!/usr/bin/env node
// Builds catalog.json: one machine-readable index of every UI pattern, chart, blueprint, palette
// and typography pairing, with plain-English aliases, ARIA pattern, states, files and dependencies.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const files = (dir) => (existsSync(join(root, dir)) ? readdirSync(join(root, dir)).filter((f) => !f.startsWith('.')).sort().map((f) => `${dir}/${f}`) : []);

const ui = [];
const families = [];
for (const fam of readdirSync(join(root, 'components/ui')).sort()) {
  const fp = `components/ui/${fam}/family.json`;
  if (!existsSync(join(root, fp))) continue;
  const f = read(fp);
  families.push({ id: fam, title: f.title, summary: f.summary, order: f.order, count: f.components.length });
  for (const c of f.components) {
    const dir = `components/ui/${fam}/${c.id}`;
    ui.push({
      id: c.id, kind: 'ui', family: fam, name: c.name, summary: c.summary, aliases: c.aliases, pattern: c.pattern, states: c.states,
      react: c.react, deps: c.deps ?? [], files: files(dir), path: dir,
    });
  }
}
families.sort((a, b) => a.order - b.order);

const charts = existsSync(join(root, 'components/charts'))
  ? readdirSync(join(root, 'components/charts')).filter((d) => existsSync(join(root, 'components/charts', d, 'meta.json'))).map((d) => {
      const m = read(`components/charts/${d}/meta.json`);
      return { id: m.id, kind: 'chart', name: m.name, group: m.group, summary: m.summary, aliases: m.aliases, bestFor: m.bestFor, avoidFor: m.avoidFor, dataShape: m.dataShape, react: m.react, order: m.order, files: files(`components/charts/${d}`), path: `components/charts/${d}` };
    }).sort((a, b) => a.order - b.order)
  : [];

const blueprints = existsSync(join(root, 'blueprints'))
  ? readdirSync(join(root, 'blueprints')).filter((d) => existsSync(join(root, 'blueprints', d, 'meta.json'))).map((d) => {
      const m = read(`blueprints/${d}/meta.json`);
      return { ...m, kind: 'blueprint', files: files(`blueprints/${d}`), path: `blueprints/${d}` };
    }).sort((a, b) => a.order - b.order)
  : [];

const pal = read('tokens/palettes/palettes.json').palettes.map((p) => ({
  id: p.id, kind: 'palette', name: p.name, category: p.category, summary: p.mood,
  aliases: [p.name.toLowerCase(), ...p.name.toLowerCase().split(/\s*&\s*/)],
  swatches: Object.fromEntries(['light', 'dark'].map((m) => [m, { canvas: p.modes[m].tokens['bg-canvas'].hex, accent: p.modes[m].tokens['accent-solid'].hex, text: p.modes[m].tokens['text-primary'].hex }])),
  minTextContrast: { light: p.modes.light.minRatios.textPrimary, dark: p.modes.dark.minRatios.textPrimary },
  files: [`tokens/palettes/${p.id}.css`],
}));
const typo = read('tokens/typography/source.json').pairings.map((t) => ({ id: t.id, kind: 'typography', name: t.name, summary: t.use, aliases: [t.name.toLowerCase()], webfont: t.webfont, files: ['tokens/typography/typography.css'] }));

const catalog = {
  name: 'lumina-taste',
  version: read('package.json').version,
  generated: 'scripts/build-catalog.mjs',
  counts: { ui: ui.length, charts: charts.length, blueprints: blueprints.length, palettes: pal.length, themes: pal.length * 2, typography: typo.length },
  families,
  ui,
  charts,
  blueprints,
  palettes: pal,
  typography: typo,
};
writeFileSync(join(root, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
console.log(`catalog.json: ${ui.length} UI patterns, ${charts.length} charts, ${blueprints.length} blueprints, ${pal.length} palettes, ${typo.length} type pairings`);
