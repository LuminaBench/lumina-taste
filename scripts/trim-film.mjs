#!/usr/bin/env node
// A film made fit for a first screen: 8 to 20 seconds, muted, about 1600 px wide, under 3 MB, with a still from its
// middle. ffmpeg when installed; on a Mac without it, the system's own avconvert (nothing to install).
//
//   node scripts/trim-film.mjs ./media/harbour.mov --out ./site/images [--start 4] [--seconds 12] [--name film]
//
// Then: <video data-part="video" muted loop playsinline poster="images/film-poster.jpg"><source data-src="images/film.mp4" type="video/mp4"></video>
// (compose.mjs --media does all of this when the media folder holds a film.)
import { resolve } from 'node:path';
import { trimFilm } from './lib/film.mjs';

const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(`--${n}`); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const out = opt('out') ?? './images', start = +(opt('start') ?? 0), seconds = opt('seconds'), name = opt('name') ?? 'film';
const src = args[0];
if (!src) { console.error('Usage: node scripts/trim-film.mjs <film> --out ./images [--start s] [--seconds 8-20] [--name film]'); process.exit(2); }
try {
  const r = trimFilm(resolve(src), resolve(out), { start, seconds: seconds == null ? undefined : +seconds, name });
  if (!r.tool) { console.log(`Nothing here can trim a film. Install ffmpeg, or run:\n  ${r.command.join('\n  ')}`); process.exit(1); }
  console.log(`${r.film}: ${r.seconds} s from ${r.start} s${r.length ? ` (of ${Math.round(r.length)})` : ''}, ${Math.round(r.bytes / 1024)} KB, ${r.tool}${r.sound ? ', any sound is kept in the file but the page plays it muted' : ', no sound'}${r.tooBig ? '. Still over 3 MB: choose a shorter or calmer clip' : ''}\n${r.poster}: ${r.posterSize?.width}×${r.posterSize?.height}`);
} catch (e) { console.error(e.message); process.exit(1); }
