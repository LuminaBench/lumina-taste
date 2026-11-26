// Builds the motion test pages in memory: a long page that uses every scroll moment in a real document
// (pinned story, sideways rail, product reveal, counts, slider, video hero) and two small pages that link
// to each other for cross-document view transitions. Each block's markup is read from its own .html file,
// so the tests always run against the shipped snippets. Used by tests/motion.spec.ts (served with
// page.route) and by local QA scripts (written to a folder with --out <dir>).
import { build } from 'esbuild';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ui = (fam, id, ext) => join(root, 'components/ui', fam, id, `${id}.${ext}`);
export const BLOCKS = [
  ['blocks', 'hero-video'], ['blocks', 'stats-band'], ['blocks', 'sticky-story'], ['blocks', 'side-scroll'],
  ['blocks', 'product-reveal'], ['blocks', 'before-after'], ['motion', 'number-settle'], ['motion', 'view-transition'],
];
const DEPS = [['controls', 'button'], ['data', 'device-frame'], ['data', 'art-panel'], ['navigation', 'navbar-simple']];

const snippet = (fam, id) => readFileSync(ui(fam, id, 'html'), 'utf8');

function entrySource() {
  const css = [...DEPS, ...BLOCKS].map(([f, id]) => `import ${JSON.stringify(ui(f, id, 'css'))};`).join('\n');
  const live = BLOCKS.filter(([f, id]) => existsSync(ui(f, id, 'ts')));
  const enh = live.map(([f, id], i) => `import { enhance as e${i} } from ${JSON.stringify(ui(f, id, 'ts').replace(/\.ts$/, ''))};`).join('\n');
  const reg = live.map(([, id], i) => `${JSON.stringify(id)}: e${i}`).join(', ');
  const tokens = ['tokens/base.css', 'tokens/layout.css', 'tokens/backdrops.css', 'tokens/composition.css', 'tokens/scroll.css', 'tokens/palettes/all.css', 'tokens/typography/typography.css', 'components/ui/_shared/shared.css']
    .map((t) => `import ${JSON.stringify(join(root, t))};`).join('\n');
  return `${tokens}\n${css}\n${enh}\nimport { autoEnhance } from ${JSON.stringify(join(root, 'components/ui/_shared/dom'))};\n` +
    `const registry = { ${reg} };\n(window as any).__lt = { registry, autoEnhance };\nautoEnhance(document, registry);\n`;
}

const shell = (title, body, { vt = false } = {}) => `<!doctype html><html lang="en" data-palette="slate-forest" data-mode="light" data-type="precision" data-density="spacious" data-radius="balanced" data-motion="snappy"${vt ? ' data-vt' : ''}>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<script>window.__reveal = []; addEventListener('pagereveal', (e) => window.__reveal.push(!!e.viewTransition));</script>
<link rel="stylesheet" href="./motion.css"><style>body{margin:0;background:var(--bg-canvas)} .spacer{height:40vh}</style></head>
<body>${body}<script type="module" src="./motion.js"></script></body></html>`;

/** Returns { 'motion.js': string, 'motion.css': string, 'index.html': string, 'list.html', 'detail.html' }. */
export async function motionFiles() {
  const res = await build({
    stdin: { contents: entrySource(), resolveDir: root, loader: 'ts', sourcefile: 'motion-entry.ts' },
    bundle: true, write: false, format: 'esm', target: 'es2022', outdir: '/out', entryNames: 'motion', loader: { '.html': 'text' }, logLevel: 'error',
  });
  const out = {};
  for (const f of res.outputFiles) out[f.path.split('/').pop()] = f.text;
  const page = ['hero-video', 'stats-band', 'sticky-story', 'side-scroll', 'product-reveal', 'before-after']
    .map((id) => snippet('blocks', id)).join('\n');
  out['index.html'] = shell('Motion test page', `<main data-scroll>${page}<div class="spacer"></div></main>`);
  // The same page with a film source on the video hero (the file itself is never there: the tests only watch the request).
  out['film.html'] = out['index.html'].replace('<source data-src=""', '<source data-src="film.mp4"');
  // Two pages for cross-document view transitions: the list's picture morphs into the detail page's.
  const card = `<a href="./detail.html" id="open" style="display:block;width:320px;margin:48px"><figure class="lt-art" data-tone="accent" data-ratio="4/5" data-vt-name="larkspur-chair" data-lt="view-transition"><p data-part="name">Larkspur chair</p><p data-part="fact">Ash and wool, £640</p></figure></a>`;
  const detail = `<a href="./list.html" id="back">Back</a><figure class="lt-art" data-tone="accent" data-ratio="16/9" data-vt-name="larkspur-chair" data-lt="view-transition" style="width:min(100%,960px);margin:24px auto"><p data-part="name">Larkspur chair</p><p data-part="fact">Ash and wool, £640</p></figure>`;
  out['list.html'] = shell('List', card, { vt: true });
  out['detail.html'] = shell('Detail', detail, { vt: true });
  out['plain.html'] = shell('Plain', `<a href="./plain-2.html" id="open">Next</a>`);
  out['plain-2.html'] = shell('Plain 2', `<p>Second page</p>`);
  return out;
}

/** The React harness: { 'react.js', 'react.css', 'react.html' }. */
export async function reactFiles() {
  const res = await build({
    entryPoints: [join(root, 'tests/motion/react-entry.tsx')], bundle: true, write: false, format: 'esm', target: 'es2022', jsx: 'automatic',
    outdir: '/out', entryNames: 'react', logLevel: 'error', define: { 'process.env.NODE_ENV': '"development"' },
  });
  const out = {};
  for (const f of res.outputFiles) out[f.path.split('/').pop()] = f.text;
  out['react.html'] = `<!doctype html><html lang="en" data-palette="slate-forest" data-mode="light" data-type="precision" data-density="balanced" data-radius="balanced" data-motion="snappy"><head><meta charset="utf-8"><title>React motion</title><link rel="stylesheet" href="./react.css"></head><body><div id="root"></div><script type="module" src="./react.js"></script></body></html>`;
  return out;
}

if (process.argv.includes('--out')) {
  const dir = process.argv[process.argv.indexOf('--out') + 1];
  mkdirSync(dir, { recursive: true });
  for (const [k, v] of Object.entries({ ...(await motionFiles()), ...(await reactFiles()) })) writeFileSync(join(dir, k), v);
  console.log('motion pages →', dir);
}
