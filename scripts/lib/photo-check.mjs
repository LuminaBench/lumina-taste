// Is this photograph good enough for where it goes? The person's own pictures are used first, so each one is looked
// at before it lands in a slot: its size against the slot, its exposure (too dark, washed out, black or white areas
// with no detail) and its focus. The numbers come from the pixels (PHOTO_PROBE, run in a browser); the judgement
// (judgePhoto) is plain Node so the thresholds are testable, and says what to do in words a business owner follows.

/** In-page: decode one picture (a data: URL) and measure it. Serialised into the page, so nothing from outside. */
export const PHOTO_PROBE = async (src) => {
  const img = new Image();
  img.decoding = 'sync';
  img.src = src;
  await img.decode();
  const W = img.naturalWidth, H = img.naturalHeight;
  // Measured at a fixed size (long edge 1024, or the picture's own if smaller) so focus is comparable across files.
  const k = Math.min(1, 1024 / Math.max(W, H));
  const w = Math.max(1, Math.round(W * k)), h = Math.max(1, Math.round(H * k));
  const c = new OffscreenCanvas(w, h);
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data;
  const Y = new Float32Array(w * h);
  const hist = new Uint32Array(256);
  let sum = 0, dark = 0, bright = 0;
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    Y[p] = y; sum += y; hist[Math.min(255, Math.round(y))]++;
    if (y < 10) dark++; else if (y > 248) bright++;
  }
  const n = w * h;
  const pct = (q) => { let acc = 0; for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= n * q) return v / 255; } return 1; };
  // Focus: the variance of the Laplacian, over the busiest tenth of 32 px tiles (a sharp subject on a soft
  // background is in focus; a photograph soft everywhere is not).
  const T = 32, tiles = [];
  for (let ty = 1; ty + T < h - 1; ty += T) for (let tx = 1; tx + T < w - 1; tx += T) {
    let s = 0, s2 = 0, m = 0;
    for (let y = ty; y < ty + T; y++) for (let x = tx; x < tx + T; x++) {
      const i = y * w + x;
      const L = Y[i - 1] + Y[i + 1] + Y[i - w] + Y[i + w] - 4 * Y[i];
      s += L; s2 += L * L; m++;
    }
    tiles.push(s2 / m - (s / m) ** 2);
  }
  tiles.sort((a, b) => b - a);
  const top = tiles.slice(0, Math.max(1, Math.ceil(tiles.length / 10)));
  const sharp = top.length ? top.reduce((a, b) => a + b, 0) / top.length : 0;
  return { width: W, height: H, mean: sum / n / 255, p05: pct(0.05), p95: pct(0.95), dark: dark / n, bright: bright / n, sharp: Math.round(sharp) };
};

/** The smallest long edge for a picture to look crisp at each use, on a 2× screen at common widths. */
export const PHOTO_LIMITS = {
  hero: 1600, wide: 1600, card: 800, any: 640,
  dim: 0.2, flat: 0.55, crushed: 0.3, blown: 0.18, soft: 100, verySoft: 25,
};

/**
 * Judge one photograph's measures for a use ('hero' | 'wide' | 'card'). Returns { fit, hero, issues } where
 * fit is false when the picture should not be used as it is, and hero is whether it can lead the first screen.
 */
export function judgePhoto(m, { use = 'card', limits = PHOTO_LIMITS } = {}) {
  const issues = [];
  const add = (rule, severity, message) => issues.push({ rule, severity, message });
  const long = Math.max(m.width, m.height);
  const need = limits[use] ?? limits.card;
  if (long < limits.any) add('photo-tiny', 'error', `Only ${m.width}×${m.height}: too small for any large picture. Find the original file (phones keep it at full size), or use it no bigger than a thumbnail.`);
  else if (long < need) add('photo-small', 'warning', `${m.width}×${m.height} looks soft ${use === 'card' ? 'in a card' : 'across a large screen'}; ${need} px on the long side is enough. The original file from the camera or phone will be bigger.`);
  if (m.mean < limits.dim && m.p95 < 0.62) add('photo-dark', 'warning', 'Dark all over: most of it reads as shadow on a screen. Brighten it (exposure or shadows up), or take it again with the lights on or nearer a window.');
  else if (m.dark > limits.crushed) add('photo-crushed', 'warning', `${Math.round(m.dark * 100)}% of it is solid black with no detail. Lift the shadows, or crop the black away.`);
  if (m.p05 > 0.33 && m.p95 - m.p05 < limits.flat) add('photo-washed', 'warning', 'Washed out: pale and flat, with no deep tones. Add contrast, or lower the exposure a little.');
  else if (m.bright > limits.blown) add('photo-blown', 'warning', `${Math.round(m.bright * 100)}% of it is pure white with no detail (a window or the sky burnt out). Lower the highlights, or crop it out.`);
  if (m.sharp < limits.verySoft) add('photo-blurred', 'error', 'Out of focus or shaken: nothing in it is sharp. Take it again holding still, or tap the subject on the phone screen to focus first.');
  else if (m.sharp < limits.soft) add('photo-soft', 'warning', 'A little soft: fine in a small card, not as the large first picture.');
  const errors = issues.some((i) => i.severity === 'error');
  // The first screen is landscape: its picture needs the width, whatever the long side.
  const hero = !errors && m.width >= limits.wide * 0.75 && m.sharp >= limits.soft && !issues.some((i) => /dark|washed/.test(i.rule));
  if (!hero && !errors && !issues.length) add('photo-small', 'warning', `${m.width}×${m.height} is enough inside the page; to lead the first screen it needs ${limits.wide} px across.`);
  return { fit: !errors, hero, issues };
}

/**
 * Measure and judge a list of picture files in one browser. items: [{ path, ... }]; returns the same items with
 * `check` ({ measures, fit, hero, issues }) added. Without a browser (Playwright missing), items come back unchanged.
 */
export async function checkPhotos(items, { chromium, use = (it) => (it.use === 'hero' ? 'hero' : 'card') } = {}) {
  if (!items.length || !chromium) return items;
  const { readFileSync } = await import('node:fs');
  const { extname } = await import('node:path');
  const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const out = [];
    for (const it of items) {
      const type = MIME[extname(it.path).toLowerCase()];
      if (!type) { out.push(it); continue; }
      try {
        const m = await page.evaluate(PHOTO_PROBE, `data:${type};base64,${readFileSync(it.path).toString('base64')}`);
        out.push({ ...it, check: { measures: m, ...judgePhoto(m, { use: use(it) }) } });
      } catch {
        out.push({ ...it, check: { measures: null, fit: false, hero: false, issues: [{ rule: 'photo-unreadable', severity: 'error', message: 'The browser could not open this file: it may be damaged, or a format browsers do not show (HEIC: export it as JPEG).' }] } });
      }
    }
    return out;
  } finally { await browser.close(); }
}
