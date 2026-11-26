// Markup for treated pictures: one <img> with srcset, sizes, width and height, lazy or eager loading, and the
// focal point as object-position, plus the credits record. Shared by find-images.mjs and treat-images.mjs.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { formatJson } from './json.mjs';

export const SIZES = { hero: '(max-width: 760px) 100vw, 50vw', set: '(max-width: 760px) 100vw, 33vw' };
const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/**
 * The <img> for one treated picture. base is the folder of the files as seen from the page ("images").
 * first: the first picture on the first screen (eager, fetchpriority high); every other one is lazy.
 */
export function imgTag(result, { base = '', alt = '', first = false, sizes } = {}) {
  const url = (f) => (base ? `${base.replace(/\/$/, '')}/${f}` : f);
  const files = result.files;
  const top = files.at(-1);
  const a = [`src="${attr(url(files.length > 1 ? (files.find((f) => f.width >= 1000) ?? top).file : top.file))}"`];
  if (files.length > 1) a.push(`srcset="${files.map((f) => `${attr(url(f.file))} ${f.width}w`).join(', ')}"`, `sizes="${attr(sizes ?? (first ? SIZES.hero : SIZES.set))}"`);
  if (result.width && result.height) a.push(`width="${result.width}"`, `height="${result.height}"`);
  a.push(`alt="${attr(alt)}"`);
  a.push(first ? 'loading="eager" decoding="async" fetchpriority="high"' : 'loading="lazy" decoding="async"');
  const f = result.focus;
  if (f && (Math.abs(f.x - 0.5) > 0.02 || Math.abs(f.y - 0.5) > 0.02)) a.push(`style="object-position: ${Math.round(f.x * 100)}% ${Math.round(f.y * 100)}%"`);
  return `<img ${a.join(' ')}>`;
}

/** Is the figure starting at `index` on the first screen? Only when no more than one <section> opens before it. */
export function onFirstScreen(html, index) {
  const before = html.slice(0, index);
  const from = Math.max(0, before.search(/<main\b/i));
  return (before.slice(from).match(/<section\b/gi) ?? []).length <= 1;
}

/** credits.json is the record of every picture (source, licence, treatment, files); CREDITS.md is the same for people. */
export function writeCredits(out, entries) {
  const jf = join(out, 'credits.json');
  let list = [];
  if (existsSync(jf)) { try { list = JSON.parse(readFileSync(jf, 'utf8')); } catch { list = []; } }
  for (const e of entries) {
    const i = list.findIndex((x) => x.file === e.file);
    if (i >= 0) list[i] = { ...list[i], ...e }; else list.push(e);
  }
  writeFileSync(jf, formatJson(list));
  const md = ['# Picture credits', '', 'Openly licensed photographs used on this site. Public domain and CC0 pictures need no credit; it is given here anyway. CC BY pictures must be credited where they appear or on a credits page.', '',
    '| File | Picture | By | Licence | Source |', '| --- | --- | --- | --- | --- |',
    ...list.map((e) => `| ${e.file} | ${String(e.title ?? '').replace(/\|/g, '/')} | ${String(e.creator ?? '').replace(/\|/g, '/')} | ${e.licenceUrl ? `[${e.licence}](${e.licenceUrl})` : e.licence ?? ''}${e.creditRequired ? ' (credit required)' : ''} | ${e.source ? `[page](${e.source})` : ''} |`)];
  writeFileSync(join(out, 'CREDITS.md'), md.join('\n') + '\n');
  return list;
}
