#!/usr/bin/env node
// What the person already has, read before anything is made or searched for: photographs, a logo, a short film, a
// menu or price list, fonts. It lists the folder, says what each file is, and (with --page) which picture goes in
// which slot, so the person can say yes or swap before the page is built.
//
//   node scripts/media-intake.mjs ./our-media                      # what is here, and a media.json to describe it
//   node scripts/media-intake.mjs ./our-media --page index.html    # where each picture would go on that page
//   node scripts/media-intake.mjs ./our-media --json
//
// media.json (beside the files) says what each picture shows and, if the person cares, where it goes:
//   [{ "file": "dining-room.jpg", "shows": "The dining room at dusk, six tables", "use": "hero" }]
// An agent writes it after looking at each picture; the person corrects it. Then:
//   node scripts/compose.mjs "<brief>" --media ./our-media --project ./site --write
// uses every photograph first (sized, cropped and graded as one set), the logo in the top bar and as every icon
// size, and a plain-text menu (one "name £price" a line) as the prices. Stock photographs stand in only where
// there is nothing of theirs, and only with --images.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { scanMedia, assignMine, menuFrom, checkMine } from './lib/media-intake.mjs';
import { formatJson } from './lib/json.mjs';

const args = process.argv.slice(2);
const opt = (n, d = null) => { const i = args.indexOf(`--${n}`); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const flag = (n) => { const i = args.indexOf(`--${n}`); if (i < 0) return false; args.splice(i, 1); return true; };
const pageArg = opt('page');
const asJson = flag('json');
const noCheck = flag('no-check'); // skip looking at the pixels (size, exposure, focus)
const dir = args[0];
if (!dir) { console.error('Usage: node scripts/media-intake.mjs <folder> [--page index.html] [--json] [--no-check]'); process.exit(2); }

let items;
try { items = scanMedia(resolve(dir)); } catch (e) { console.error(e.message); process.exit(2); }
if (!noCheck) items = await checkMine(items);
const menu = menuFrom(items);
const { filmTool, filmLength } = await import('./lib/film.mjs');
const trimWith = items.some((i) => i.kind === 'video') ? filmTool() : null;
let plan = null;
if (pageArg) {
  const html = readFileSync(resolve(pageArg), 'utf8');
  const slots = [...html.matchAll(/<figure\b[^>]*class="[^"]*\blt-art\b[^"]*"[^>]*data-shot="([^"]+)"[^>]*>/g)].map((m, i) => ({ key: m.index, shot: m[1], weight: i === 0 ? 2 : 1 }));
  const placed = assignMine(items, slots);
  plan = slots.map((s) => ({ slot: s.shot.replace(/,\s*[^,]*\d+:\d+$/, ''), file: placed.get(s.key)?.item.file ?? null, how: placed.get(s.key)?.how ?? null }));
}
const out = {
  folder: resolve(dir),
  photographs: items.filter((i) => i.kind === 'photo').map(({ file, width, height, orientation, shows, use, small, check }) => ({ file, size: width ? `${width}×${height}` : null, orientation, shows, use, small, ...(check ? { fit: check.fit, canLead: check.hero, issues: check.issues.map((i) => i.message) } : {}) })),
  logos: items.filter((i) => i.kind === 'logo').map((i) => i.file),
  films: items.filter((i) => i.kind === 'video').map((i) => i.file),
  menus: items.filter((i) => i.kind === 'menu').map((i) => i.file),
  menuItems: menu,
  other: items.filter((i) => !['photo', 'logo', 'video', 'menu'].includes(i.kind)).map((i) => `${i.file} (${i.kind})`),
  plan,
};
if (asJson) { console.log(formatJson(out)); process.exit(0); }

const L = [];
L.push(`# Your media: ${out.folder}`, '');
L.push(`**Photographs (${out.photographs.length})**`);
for (const p of out.photographs) {
  const verdict = p.fit === false ? '  ·  not used as it is' : p.canLead === false ? '  ·  fine inside the page, not as the first picture' : p.fit ? '  ·  good' : p.small ? '  ·  small: will look soft on a large screen' : '';
  L.push(`- ${p.file}  ·  ${p.size ?? '?'} ${p.orientation ?? ''}${p.use ? `  ·  use: ${p.use}` : ''}${verdict}\n  ${p.shows ? `shows: ${p.shows}` : 'shows: (not described yet: look at it and say what it shows in media.json)'}`);
  for (const i of p.issues ?? []) L.push(`  ! ${i}`);
}
if (out.logos.length) L.push('', `**Logo**: ${out.logos.join(', ')}. It goes in the top bar and becomes every icon size (favicons, apple-touch-icon, Android, maskable, a web manifest). A wide logo's icons use its symbol; add the symbol alone as mark.svg if that is wrong.`);
if (out.films.length) L.push('', `**Film**: ${items.filter((i) => i.kind === 'video').map((i) => { const n = filmLength(i.path); return `${i.file}${n ? ` (${Math.round(n)} s)` : ''}`; }).join(', ')}. The first screen becomes the film: compose --media trims it to 8 to 20 seconds (12 unless media.json says "start" and "seconds"), about 1600 px wide and under 3 MB, muted, with a still from its middle${trimWith === 'ffmpeg' ? ' (with ffmpeg)' : trimWith === 'avconvert' ? " (with the Mac's own avconvert: nothing to install)" : '. Nothing here can trim it: install ffmpeg, or trim it first (ffmpeg -i in.mov -t 12 -an -vf scale=1600:-2 -crf 28 film.mp4)'}.`);
if (out.menus.length) {
  const unread = items.filter((i) => i.kind === 'menu' && i.unreadable).map((i) => i.file);
  const pdfHint = unread.length ? ` ${unread.join(', ')} could not be read here: nothing on this machine reads PDF text. Install pdftotext (poppler-utils on Linux, poppler on Windows or macOS), or copy the prices into a .txt, one "name £price" a line.` : '';
  L.push('', `**Menu or prices**: ${out.menus.join(', ')}${menu.length ? `: ${menu.length} priced item(s) read (${menu.slice(0, 4).join(', ')}${menu.length > 4 ? ', …' : ''}).` : unread.length ? '.' : ': no "name £price" lines found (a scanned PDF has no text: type the prices into a .txt, one "name £price" a line).'}${pdfHint}`);
}
if (out.other.length) L.push('', `**Not used**: ${out.other.join(', ')}.`);
if (plan) {
  L.push('', `**Where each picture goes on ${pageArg}**`);
  for (const p of plan) L.push(`- ${p.slot.slice(0, 70)}  →  ${p.file ? `${p.file}${p.how === 'order' ? ' (no better match: placed in page order)' : p.how === 'named' ? ' (you said so)' : ''}` : 'nothing of yours: a drawing stays (or a stock photograph with --images)'}`);
  const left = out.photographs.filter((p) => !plan.some((x) => x.file === p.file));
  if (left.length) L.push(`- not placed (more photographs than slots): ${left.map((p) => p.file).join(', ')}`);
}
const mf = join(resolve(dir), 'media.json');
if (!existsSync(mf) && out.photographs.length) {
  writeFileSync(mf, formatJson(out.photographs.map((p) => ({ file: p.file, shows: '', use: null }))));
  L.push('', `Wrote ${mf}: say what each picture shows (and "use": "hero" for the one that leads), then compose with --media.`);
}
console.log(L.join('\n'));
