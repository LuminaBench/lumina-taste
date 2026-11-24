#!/usr/bin/env node
// Copy lint: flags hype words, clichés and generated-sounding phrases in UI text.
//
//   node scripts/lint-copy.mjs src/                 # every .html .tsx .jsx .ts .vue .svelte .md .json under src/
//   node scripts/lint-copy.mjs "Unlock the power of dashboards"   # lint a string
//   node scripts/lint-copy.mjs src/ --json
//
// Only user-facing text is checked: HTML text nodes and attributes people read (alt, title,
// aria-label, placeholder), string literals in JS/TS, and prose in Markdown. Exit code 1 on any hit.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { lintCopy } from './lib/copy-rules.mjs';

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const targets = args.filter((a) => a !== '--json');
if (!targets.length) { console.error('Usage: node scripts/lint-copy.mjs <file|dir|"text"> [...] [--json]'); process.exit(2); }

const EXT = new Set(['.html', '.htm', '.tsx', '.jsx', '.ts', '.js', '.mjs', '.vue', '.svelte', '.md', '.mdx', '.json']);
const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'qa']);
const files = [];
const walk = (p) => {
  const st = statSync(p);
  if (st.isDirectory()) { for (const n of readdirSync(p)) if (!SKIP.has(n) && !n.startsWith('.')) walk(join(p, n)); }
  else if (EXT.has(extname(p)) && st.size < 2_000_000) files.push(p);
};

/** Pull the human-readable text out of a source file, keeping line numbers. */
function readable(src, ext) {
  const out = [];
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    let text = '';
    if (ext === '.md' || ext === '.mdx') {
      if (/^\s*(```|\||<)/.test(line)) return;
      text = line.replace(/`[^`]*`/g, ' ');
    } else if (ext === '.html' || ext === '.htm' || ext === '.vue' || ext === '.svelte') {
      text = line.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]*?\b(alt|title|aria-label|placeholder)="([^"]*)"[^>]*>/gi, ' $2 ').replace(/<[^>]+>/g, ' ');
    } else if (ext === '.json') {
      text = [...line.matchAll(/"(?:summary|name|about|prompt|title|subtitle|text|use|useFor|brief|lede|description)"\s*:\s*"([^"]*)"/g)].map((m) => m[1]).join(' ');
    } else {
      // Strings in JS/TS and JSX text between tags.
      text = [...line.matchAll(/(["'`])((?:\\.|(?!\1).){6,}?)\1/g)].map((m) => m[2]).filter((s) => /\s/.test(s) && !/^[\w./@-]+$/.test(s)).join(' ');
      text += ' ' + [...line.matchAll(/>([^<>{}]{6,})</g)].map((m) => m[1]).join(' ');
    }
    if (text.trim()) out.push({ line: i + 1, text });
  });
  return out;
}

const findings = [];
for (const t of targets) {
  if (existsSync(t)) walk(t);
  else for (const h of lintCopy(t)) findings.push({ file: '(text)', line: 1, ...h });
}
for (const f of files) {
  for (const { line, text } of readable(readFileSync(f, 'utf8'), extname(f))) {
    // "!" only counts in prose, not in code like "!==" or "!important".
    for (const h of lintCopy(text)) {
      if (h.why === 'Exclamation mark' && (['.ts', '.js', '.mjs'].includes(extname(f)) || !/[a-z]!(\s|$)/i.test(text.slice(Math.max(0, h.index - 1), h.index + 2)))) continue;
      findings.push({ file: relative(process.cwd(), f), line, ...h });
    }
  }
}

if (asJson) console.log(JSON.stringify(findings, null, 2));
else if (!findings.length) console.log(`✓ copy: no hype, clichés or generated tics in ${files.length || targets.length} ${files.length ? 'files' : 'strings'}.`);
else {
  for (const f of findings) console.log(`${f.file}:${f.line}  “${f.match}”  ${f.why}. ${f.fix}`);
  console.log(`\n✗ copy: ${findings.length} finding${findings.length === 1 ? '' : 's'}.`);
}
process.exit(findings.length ? 1 : 0);
