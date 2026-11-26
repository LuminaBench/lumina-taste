// Art-direct a set of photographs for one page: one aspect ratio, one colour grade taken from the page's palette,
// contrast and saturation brought to the same level, a focal point for phone crops, and small WebP files at
// three widths. The pixel work runs in headless Chromium through Playwright (canvas, createImageBitmap,
// convertToBlob), so no image library is needed. Without Playwright the original is copied and a warning given.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { oklchToRgb8, parseOklch, rgb8ToHex } from './color.mjs';
import { imageSize } from './image-size.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const WIDTHS = [640, 1080, 1600];
export const GRADES = ['tint', 'duotone', 'mono', 'warm', 'cool', 'natural', 'none'];
export const DEFAULT_PALETTE = 'slate-forest';

/** "4/5", "4:5", "0.8" → width / height. */
export function parseRatio(s, fallback = 4 / 5) {
  if (s == null || s === '') return fallback;
  const m = /^\s*([\d.]+)\s*[/:x]\s*([\d.]+)\s*$/.exec(String(s));
  const v = m ? +m[1] / +m[2] : +s;
  return Number.isFinite(v) && v > 0.2 && v < 5 ? v : fallback;
}

/** "50,30" (per cent) or "0.5,0.3" → { x, y } in 0..1, or null. */
export function parseFocus(s) {
  if (!s) return null;
  const n = String(s).split(/[,\s]+/).map(Number);
  if (n.length !== 2 || n.some((v) => !Number.isFinite(v) || v < 0)) return null;
  const pct = n.some((v) => v > 1);
  const [x, y] = n.map((v) => Math.min(1, pct ? v / 100 : v));
  return { x, y };
}

const toHex = (v) => {
  if (!v) return null;
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
  try { return rgb8ToHex(oklchToRgb8(parseOklch(v))); } catch { return null; }
};

/**
 * The page's colours for grading: ink (darkest text), paper (canvas) and accent, from a palette id, a
 * taste-profile.json (palette plus overrides) or a page's <html data-palette>. Light-mode values: a
 * photograph is graded once and has to sit on both grounds.
 */
export function paletteColours({ palette, profile, page } = {}) {
  let id = palette, overrides = {};
  const prof = profile ?? (page ? findProfile(dirname(resolve(page))) : null);
  if (!id && prof && existsSync(prof)) {
    try { const p = JSON.parse(readFileSync(prof, 'utf8')); id = p.palette; overrides = p.overrides ?? {}; } catch { /* not a profile */ }
  }
  if (!id && page && existsSync(page)) id = /<html\b[^>]*\bdata-palette="([a-z-]+)"/.exec(readFileSync(page, 'utf8'))?.[1];
  const all = JSON.parse(readFileSync(join(root, 'tokens/palettes/palettes.json'), 'utf8')).palettes;
  const p = all.find((x) => x.id === id) ?? all.find((x) => x.id === DEFAULT_PALETTE);
  const t = p.modes.light.tokens;
  const pick = (k) => toHex(overrides[k]) ?? t[k].hex;
  return { id: p.id, ink: pick('text-primary'), paper: pick('bg-canvas'), accent: pick('accent-solid') };
}

function findProfile(dir) {
  for (let d = dir, i = 0; i < 4; i++, d = dirname(d)) { const f = join(d, 'taste-profile.json'); if (existsSync(f)) return f; if (dirname(d) === d) break; }
  return null;
}

/** Playwright's Chromium, or null when it is not installed (the caller copies originals instead). */
async function launch() {
  if (process.env.LT_NO_BROWSER === '1') return null;
  for (const name of ['@playwright/test', 'playwright']) {
    try { const m = await import(name); return await (m.chromium ?? m.default?.chromium).launch(); } catch { /* try the next */ }
  }
  return null;
}

/**
 * Treat a set of pictures for one page.
 * jobs: [{ input: path, name: 'file-stem', focus?: { x, y } }]
 * opts: { out, ratio (w/h), widths, quality, grade, colours: { ink, paper, accent }, strength }
 * Returns one result per job: { name, files: [{ file, width, height, bytes }], width, height, focus, ratio, grade, treated, warning? }
 */
export async function treatImages(jobs, opts = {}) {
  const { out, ratio = 4 / 5, widths = WIDTHS, quality = 0.8, grade = 'tint', colours = paletteColours(), strength = 1 } = opts;
  mkdirSync(out, { recursive: true });
  const browser = await launch();
  if (!browser) return jobs.map((j) => copyOriginal(j, out, 'Playwright is not installed, so the picture was copied as it is (no crop, grade or WebP). Install it with npm install in the kit.'));
  const results = [];
  try {
    const page = await browser.newPage();
    const origin = 'http://lt-treat.invalid';
    await page.route(`${origin}/**`, (route) => {
      const u = new URL(route.request().url());
      if (u.pathname === '/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>treat</title>' });
      const job = jobs[Number(u.pathname.slice(1))];
      return job ? route.fulfill({ path: job.input }) : route.fulfill({ status: 404 });
    });
    await page.goto(`${origin}/`);
    for (const [i, job] of jobs.entries()) {
      try {
        const r = await page.evaluate(treatInPage, { url: `${origin}/${i}`, ratio, widths, quality, grade, colours, strength, focus: job.focus ?? null });
        const files = r.files.map((f) => {
          const file = join(out, `${job.name}-${f.width}.${f.ext}`);
          const buf = Buffer.from(f.data, 'base64');
          writeFileSync(file, buf);
          return { file: basename(file), width: f.width, height: f.height, bytes: buf.length };
        });
        results.push({ name: job.name, input: job.input, files, width: files.at(-1).width, height: files.at(-1).height, focus: r.focus, focusFrom: job.focus ? 'manual' : 'detected', ratio: +ratio.toFixed(4), grade, palette: colours.id, source: { width: r.source.width, height: r.source.height }, treated: true });
      } catch (e) {
        results.push(copyOriginal(job, out, `Could not treat ${basename(job.input)} (${String(e.message).split('\n')[0]}); copied as it is.`));
      }
    }
  } finally { await browser.close(); }
  return results;
}

function copyOriginal(job, out, warning) {
  const ext = extname(job.input) || '.jpg';
  const file = join(out, `${job.name}${ext}`);
  if (resolve(file) !== resolve(job.input)) copyFileSync(job.input, file);
  const buf = readFileSync(file);
  const size = imageSize(buf) ?? { width: 0, height: 0 };
  return { name: job.name, input: job.input, files: [{ file: basename(file), width: size.width, height: size.height, bytes: buf.length }], width: size.width, height: size.height, focus: job.focus ?? { x: 0.5, y: 0.5 }, focusFrom: job.focus ? 'manual' : 'centre', ratio: size.width && size.height ? +(size.width / size.height).toFixed(4) : null, grade: 'none', treated: false, warning };
}

/* ------------------------------------------------------------------ runs inside Chromium */
// Kept free of closures: Playwright sends this function's source to the page.
async function treatInPage({ url, ratio, widths, quality, grade, colours, strength, focus }) {
  const blob = await (await fetch(url)).blob();
  const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' });
  const W = bmp.width, H = bmp.height;
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

  // 1. Where the subject is, on a small copy of the picture.
  const S = 96, sc = S / Math.max(W, H);
  const gw = Math.max(8, Math.round(W * sc)), gh = Math.max(8, Math.round(H * sc));
  const g = new OffscreenCanvas(gw, gh), gx = g.getContext('2d', { willReadFrequently: true });
  gx.drawImage(bmp, 0, 0, gw, gh);
  const px = gx.getImageData(0, 0, gw, gh).data;
  const n = gw * gh, Y = new Float32Array(n), R = new Float32Array(n), G = new Float32Array(n), B = new Float32Array(n);
  for (let i = 0; i < n; i++) { R[i] = px[i * 4] / 255; G[i] = px[i * 4 + 1] / 255; B[i] = px[i * 4 + 2] / 255; Y[i] = 0.2126 * R[i] + 0.7152 * G[i] + 0.0722 * B[i]; }
  // Saliency: edge energy plus centre-surround colour contrast (a cell against the blurred cells around it),
  // so a compact subject scores and a large flat region (a wall, the sky) does not.
  const blur = (A, r) => {
    const I = new Float64Array((gw + 1) * (gh + 1));
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) I[(y + 1) * (gw + 1) + x + 1] = A[y * gw + x] + I[y * (gw + 1) + x + 1] + I[(y + 1) * (gw + 1) + x] - I[y * (gw + 1) + x];
    const O = new Float32Array(n);
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(gw, x + r + 1), y0 = Math.max(0, y - r), y1 = Math.min(gh, y + r + 1);
      O[y * gw + x] = (I[y1 * (gw + 1) + x1] - I[y0 * (gw + 1) + x1] - I[y1 * (gw + 1) + x0] + I[y0 * (gw + 1) + x0]) / ((x1 - x0) * (y1 - y0));
    }
    return O;
  };
  const rad = Math.max(3, Math.round(Math.max(gw, gh) / 12));
  const bR = blur(R, rad), bG = blur(G, rad), bB = blur(B, rad);
  const E = new Float32Array(n), C = new Float32Array(n), Sal = new Float32Array(n);
  let emax = 0, cmax = 0;
  for (let y = 1; y < gh - 1; y++) for (let x = 1; x < gw - 1; x++) {
    const i = y * gw + x;
    E[i] = Math.abs(Y[i + 1] - Y[i - 1]) + Math.abs(Y[i + gw] - Y[i - gw]);
    C[i] = Math.hypot(R[i] - bR[i], G[i] - bG[i], B[i] - bB[i]);
    emax = Math.max(emax, E[i]); cmax = Math.max(cmax, C[i]);
  }
  for (let y = 1; y < gh - 1; y++) for (let x = 1; x < gw - 1; x++) {
    const i = y * gw + x, u = x / gw - 0.5, v = y / gh - 0.5;
    const bias = Math.max(0.35, 1 - 1.2 * (u * u + v * v));
    Sal[i] = (0.45 * (emax ? E[i] / emax : 0) + 0.55 * (cmax ? C[i] / cmax : 0)) ** 2 * bias;
  }

  // 2. One ratio: the largest window of that shape. A manual focus centres it; otherwise it slides along the
  // free side to hold the most saliency (ties go to the centre).
  let cw = W, ch = H;
  if (W / H > ratio) cw = H * ratio; else ch = W / ratio;
  let cx = (W - cw) / 2, cy = (H - ch) / 2;
  if (focus) { cx = Math.min(W - cw, Math.max(0, focus.x * W - cw / 2)); cy = Math.min(H - ch, Math.max(0, focus.y * H - ch / 2)); }
  else {
    const free = cw < W ? 'x' : ch < H ? 'y' : null;
    if (free) {
      const span = free === 'x' ? gw : gh, win = Math.round(free === 'x' ? (cw / W) * gw : (ch / H) * gh);
      const line = new Float32Array(span);
      for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) line[free === 'x' ? x : y] += Sal[y * gw + x];
      let best = -1, bestAt = Math.round((span - win) / 2);
      for (let o = 0; o + win <= span; o++) {
        let sum = 0; for (let k = o; k < o + win; k++) sum += line[k];
        const score = sum * (1 - 0.15 * Math.abs((o + win / 2) / span - 0.5));
        if (score > best) { best = score; bestAt = o; }
      }
      if (free === 'x') cx = Math.min(W - cw, (bestAt / gw) * W); else cy = Math.min(H - ch, (bestAt / gh) * H);
    }
  }
  // The focal point inside the crop: the manual one, or the saliency centroid inside the window, eased towards
  // the middle so a phone crop never cuts hard to one side.
  let fx = 0.5, fy = 0.5;
  if (focus) { fx = (focus.x * W - cx) / cw; fy = (focus.y * H - cy) / ch; } else {
    let sw = 0, sx = 0, sy = 0;
    for (let y = 1; y < gh - 1; y++) for (let x = 1; x < gw - 1; x++) {
      const X = (x + 0.5) / gw * W, Yp = (y + 0.5) / gh * H;
      if (X < cx || X > cx + cw || Yp < cy || Yp > cy + ch) continue;
      const s = Sal[y * gw + x] ** 1.5; sw += s; sx += s * (X - cx) / cw; sy += s * (Yp - cy) / ch;
    }
    if (sw > 0) { fx = 0.5 + (sx / sw - 0.5) * 0.85; fy = 0.5 + (sy / sw - 0.5) * 0.85; }
  }
  const focusOut = { x: Math.round(Math.min(1, Math.max(0, fx)) * 100) / 100, y: Math.round(Math.min(1, Math.max(0, fy)) * 100) / 100 };

  // 3. Sizes: the given widths that the crop can fill without upscaling, plus the crop's own width when it
  // falls between two of them.
  const max = Math.max(...widths);
  let ladder = widths.filter((w) => w <= cw).sort((a, b) => a - b);
  if (!ladder.length) ladder = [Math.max(1, Math.floor(cw))];
  else if (ladder.at(-1) < max && cw > ladder.at(-1) * 1.15) ladder.push(Math.floor(Math.min(cw, max)));
  const tw = ladder.at(-1), th = Math.max(1, Math.round(tw / ratio));
  const top = new OffscreenCanvas(tw, th), tx = top.getContext('2d', { willReadFrequently: true });
  tx.imageSmoothingQuality = 'high';
  tx.drawImage(bmp, cx, cy, cw, ch, 0, 0, tw, th);

  // 4. The grade. Statistics come from the crop, so every picture in a set lands on the same contrast,
  // brightness and colour strength before the palette's tone goes on.
  if (grade !== 'none') {
    const img = tx.getImageData(0, 0, tw, th), d = img.data;
    const hist = new Uint32Array(256);
    let satSum = 0, count = 0;
    const step = Math.max(1, Math.floor((tw * th) / 40000));
    for (let p = 0; p < tw * th; p += step) {
      const r = d[p * 4], gg = d[p * 4 + 1], b = d[p * 4 + 2];
      hist[Math.round(0.2126 * r + 0.7152 * gg + 0.0722 * b)]++;
      satSum += (Math.max(r, gg, b) - Math.min(r, gg, b)) / 255; count++;
    }
    const pct = (q) => { let acc = 0; for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= q * count) return i / 255; } return 1; };
    const lo = pct(0.01), hi = pct(0.99), med = pct(0.5), sat = satSum / count;
    // Levels: stretch to 4%..96%, at most 1.4×; a picture that already spans the range is left as it is.
    const nlo = Math.min(lo, 0.04), nhi = Math.max(hi, 0.96);
    const k = Math.min(1.4, (nhi - nlo) / Math.max(0.05, hi - lo)), lift = nlo - lo * k;
    const medL = Math.min(0.97, Math.max(0.03, med * k + lift));
    // Mid-tones towards 0.48, gently.
    const gam = Math.min(1.25, Math.max(0.8, 1 + (Math.log(0.48) / Math.log(Math.max(0.05, Math.min(0.95, medL))) - 1) * 0.6));
    // Colour strength to one level for the set.
    const satTarget = grade === 'mono' ? 0 : grade === 'duotone' ? 0.12 : 0.2;
    const sf = grade === 'mono' ? 0 : Math.min(1.15, Math.max(0.55, satTarget / Math.max(0.02, sat)));
    const ink = hex(colours.ink), paper = hex(colours.paper), accent = hex(colours.accent);
    // The tone ramp: shadows towards the ink, highlights towards the paper, mid-tones towards the accent.
    const ramp = grade === 'duotone' ? [mix(ink, accent, 0.35), mix(mix(accent, paper, 0.45), ink, 0.08), paper]
      : [ink, mix(mix(accent, [0.5, 0.5, 0.5], 0.35), paper, 0.15), paper];
    const amount = Math.min(1, (grade === 'duotone' ? 0.86 : grade === 'mono' ? 0.18 : grade === 'tint' ? 0.16 : grade === 'natural' ? 0 : 0.07) * strength);
    const cast = grade === 'warm' ? [1.035, 1, 0.95] : grade === 'cool' ? [0.96, 1, 1.04] : [1, 1, 1];
    const lut = new Float32Array(256);
    for (let i = 0; i < 256; i++) lut[i] = Math.min(1, Math.max(0, i / 255 * k + lift)) ** gam;
    for (let p = 0; p < d.length; p += 4) {
      let r = lut[d[p]] * cast[0], gg = lut[d[p + 1]] * cast[1], b = lut[d[p + 2]] * cast[2];
      const y = Math.min(1, Math.max(0, 0.2126 * r + 0.7152 * gg + 0.0722 * b));
      // Raised gently on dull pixels only (vibrance), lowered evenly.
      const f = sf > 1 ? 1 + (sf - 1) * (1 - Math.min(1, Math.max(r, gg, b) - Math.min(r, gg, b))) : sf;
      r = y + (r - y) * f; gg = y + (gg - y) * f; b = y + (b - y) * f;
      if (amount > 0) {
        const t = y < 0.5 ? mix(ramp[0], ramp[1], y * 2) : mix(ramp[1], ramp[2], (y - 0.5) * 2);
        r += (t[0] - r) * amount; gg += (t[1] - gg) * amount; b += (t[2] - b) * amount;
      }
      d[p] = Math.round(Math.min(1, Math.max(0, r)) * 255); d[p + 1] = Math.round(Math.min(1, Math.max(0, gg)) * 255); d[p + 2] = Math.round(Math.min(1, Math.max(0, b)) * 255);
    }
    tx.putImageData(img, 0, 0);
  }

  // 5. Encode each width as WebP (JPEG if this browser cannot write WebP).
  const files = [];
  for (const w of ladder) {
    const h = Math.max(1, Math.round(w / ratio));
    let c = top;
    if (w !== tw) {
      // Halve in steps for a clean downscale, then draw at the exact size.
      let src = top, sw = tw, sh = th;
      while (sw / 2 >= w * 1.2) { const nx = new OffscreenCanvas(Math.round(sw / 2), Math.round(sh / 2)); const nc = nx.getContext('2d'); nc.imageSmoothingQuality = 'high'; nc.drawImage(src, 0, 0, nx.width, nx.height); src = nx; sw = nx.width; sh = nx.height; }
      c = new OffscreenCanvas(w, h); const cc = c.getContext('2d'); cc.imageSmoothingQuality = 'high'; cc.drawImage(src, 0, 0, w, h);
    }
    let out = await c.convertToBlob({ type: 'image/webp', quality });
    if (out.type !== 'image/webp') out = await c.convertToBlob({ type: 'image/jpeg', quality: Math.min(0.86, quality + 0.04) });
    const bytes = new Uint8Array(await out.arrayBuffer());
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    files.push({ width: w, height: h, ext: out.type === 'image/webp' ? 'webp' : 'jpg', data: btoa(bin) });
  }
  return { files, focus: focusOut, source: { width: W, height: H } };
}
