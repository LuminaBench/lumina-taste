// The person's own film, made fit for a first screen: 8 to 20 seconds, no sound played, about 1600 px wide, under
// 3 MB, with a still for before it plays (and for reduced motion and Save-Data). ffmpeg when it is installed; on a
// Mac without it, the system's own avconvert and AVFoundation (nothing to install). Elsewhere, the exact command.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { imageSize } from './image-size.mjs';

const here = dirname(fileURLToPath(import.meta.url));
export const FILM_LIMITS = { min: 8, max: 20, seconds: 12, bytes: 3 * 1024 * 1024, width: 1600 };
const has = (cmd, args = ['-version']) => { try { return spawnSync(cmd, args, { stdio: 'ignore' }).status === 0; } catch { return false; } };

/** Which tool can trim a film here: 'ffmpeg', 'avconvert' (macOS) or null. */
export function filmTool() {
  if (has('ffmpeg')) return 'ffmpeg';
  if (process.platform === 'darwin' && existsSync('/usr/bin/avconvert') && has('swift', ['--version'])) return 'avconvert';
  return null;
}

/** The length to keep: what was asked, inside 8 to 20 seconds, never past the end of the film. */
export function keepSeconds(asked, length = Infinity, start = 0) {
  const want = Math.min(FILM_LIMITS.max, Math.max(FILM_LIMITS.min, asked ?? FILM_LIMITS.seconds));
  return Math.max(0, Math.min(want, length - start));
}

/** The ffmpeg commands (film, then still) for a trim; printed when nothing here can run them. */
export function ffmpegArgs(src, out, poster, { start = 0, seconds = FILM_LIMITS.seconds, width = FILM_LIMITS.width, crf = 28 } = {}) {
  return [
    ['-y', '-ss', String(start), '-i', src, '-t', String(seconds), '-an', '-vf', `scale='min(${width},iw)':-2`, '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out],
    ['-y', '-ss', String(start + seconds / 2), '-i', src, '-frames:v', '1', '-vf', `scale='min(${width},iw)':-2`, '-q:v', '3', poster],
  ];
}

const swift = (script, args) => spawnSync('swift', [join(here, 'macos', script), ...args], { encoding: 'utf8' });

/** How long a film is, in seconds (null when nothing here can read it). */
export function filmLength(src) {
  if (has('ffprobe')) {
    const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src], { encoding: 'utf8' });
    const n = parseFloat(r.stdout); if (Number.isFinite(n)) return n;
  }
  if (process.platform === 'darwin' && has('swift', ['--version'])) {
    const r = swift('film-length.swift', [src]);
    const n = parseFloat(r.stdout); if (r.status === 0 && Number.isFinite(n)) return n;
  }
  return null;
}

/**
 * Trim `src` into `outDir` as <name>.mp4 and <name>-poster.jpg. Returns { film, poster, bytes, seconds, start, tool,
 * sound, posterSize } or { tool: null, command } when nothing here can do it.
 */
export function trimFilm(src, outDir, { start = 0, seconds, name = 'film' } = {}) {
  const length = filmLength(src);
  const keep = keepSeconds(seconds, length ?? Infinity, start);
  mkdirSync(outDir, { recursive: true });
  const film = join(outDir, `${name}.mp4`), poster = join(outDir, `${name}-poster.jpg`);
  const tool = filmTool();
  if (!tool) return { tool: null, seconds: keep, command: ffmpegArgs(src, film, poster, { start, seconds: keep }).map((a) => `ffmpeg ${a.map((x) => (/\s|'/.test(x) ? `"${x}"` : x)).join(' ')}`) };
  let sound = false;
  if (tool === 'ffmpeg') {
    for (const crf of [28, 32, 36]) {
      const [a] = ffmpegArgs(src, film, poster, { start, seconds: keep, crf });
      const r = spawnSync('ffmpeg', a, { encoding: 'utf8' });
      if (r.status !== 0) throw new Error(`ffmpeg could not read the film: ${(r.stderr || '').trim().split('\n').at(-1)}`);
      if (statSync(film).size <= FILM_LIMITS.bytes) break;
    }
    const r = spawnSync('ffmpeg', ffmpegArgs(src, film, poster, { start, seconds: keep })[1], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error('ffmpeg could not take a still from the film');
  } else {
    // avconvert re-encodes to a preset size and keeps the sound track; the page never plays it (muted).
    for (const preset of ['Preset1920x1080', 'Preset1280x720', 'Preset960x540']) {
      const r = spawnSync('/usr/bin/avconvert', ['--source', src, '--output', film, '--preset', preset, '--start', String(start), '--duration', String(keep), '--replace'], { encoding: 'utf8' });
      if (r.status !== 0) throw new Error(`avconvert could not read the film: ${(r.stderr || r.stdout || '').trim().split('\n').at(-1)}`);
      if (statSync(film).size <= FILM_LIMITS.bytes) break;
    }
    sound = true;
    const p = swift('poster.swift', [film, poster, String(keep / 2), String(FILM_LIMITS.width)]);
    if (p.status !== 0) throw new Error(`Could not take a still from the film: ${(p.stderr || '').trim().split('\n').at(-1)}`);
  }
  const bytes = statSync(film).size;
  return { tool, film, poster, bytes, seconds: keep, start, sound, length, posterSize: imageSize(readFileSync(poster)), tooBig: bytes > FILM_LIMITS.bytes };
}
