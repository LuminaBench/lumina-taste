// Dev helper: assemble a page from section snippets the way an agent would, to look at it and audit it.
// Usage: node qa/compose-page.mjs <out-dir> "<install flags>" "<main attributes>" id[@layout][+well][~space] …
//   node qa/compose-page.mjs qa/artifacts/x "--palette paper-ink --type editorial" 'data-numbered data-separators="rules"' navbar-simple hero-statement feature-grid@rail stats-band+well
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [,, outArg, flags = '', mainAttrs = '', ...specs] = process.argv;
const out = resolve(outArg);
mkdirSync(out, { recursive: true });
const parts = specs.map((s) => { const m = s.match(/^([a-z0-9-]+)(?:@([a-z]+))?(\+well)?(?:~([a-z]+))?$/); return { id: m[1], layout: m[2], well: !!m[3], space: m[4] }; });
const r = spawnSync(process.execPath, [join(root, 'scripts/install-taste.mjs'), '--project', out, '--dest', '.', '--framework', 'static', '--no-profile', ...flags.split(/\s+/).filter(Boolean), '--components', [...new Set([...parts.map((p) => p.id), 'button'])].join(',')], { encoding: 'utf8' });
if (r.status !== 0) { console.error(r.stderr || r.stdout); process.exit(1); }
const attrs = r.stdout.match(/<html ([^>]+)>/)?.[1] ?? 'data-palette="slate-forest" data-mode="light"';
const snip = (p) => {
  let html = readFileSync(join(out, 'snippets', `${p.id}.html`), 'utf8').replace(/<!--[\s\S]*?-->\n?/, '');
  const add = [p.layout && `data-layout="${p.layout}"`, p.well && 'data-tone="well"', p.space && `data-space="${p.space}"`].filter(Boolean).join(' ');
  if (add) html = html.replace(/^<(section|div|footer)\b/, `<$1 ${add}`);
  return html;
};
const isChrome = (id) => /^(navbar|footer|site-footer|floating)/.test(id);
const top = parts.filter((p) => /^navbar|^floating/.test(p.id)).map(snip).join('\n');
const bottom = parts.filter((p) => /footer/.test(p.id)).map(snip).join('\n');
const body = parts.filter((p) => !isChrome(p.id)).map(snip).join('\n');
writeFileSync(join(out, 'index.html'), `<!doctype html>\n<html lang="en" ${attrs}>\n<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Composed page</title><link rel="stylesheet" href="lumina.css"><script defer src="lumina.js"></script><style>body{margin:0;background:var(--bg-canvas);color:var(--text-primary);font-family:var(--font-body)}</style></head>\n<body>\n${top}\n<main ${mainAttrs}>\n${body}\n</main>\n${bottom}\n</body>\n</html>\n`);
console.log(join(out, 'index.html'));
