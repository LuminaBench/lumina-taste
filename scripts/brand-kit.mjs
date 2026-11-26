#!/usr/bin/env node
// The brand around the page, in the page's own palette, type and subject: a wordmark, a lockup with the subject's
// drawing, a favicon drawn from the subject (no font needed at 16px), a social share image (1200×630), an email that
// matches the site, and one sheet that shows it all. Nothing is downloaded; PNGs are drawn in Playwright's Chromium
// when it is installed, otherwise the HTML sources are written and the PNGs skipped.
//
//   node scripts/brand-kit.mjs --name "Copper Hare" --subject "coffee shop" --palette petrol-peach --type stamped --out ./brand
//   node scripts/brand-kit.mjs --name "Granite Row" --line "Builders in Glasgow since 2006" --motif crane --palette arctic-red --type stencil --out ./brand
//   node scripts/brand-kit.mjs --profile ./taste-profile.json --name "Wren" --out ./brand --no-png
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { pickMotif, motifSvg, pickScene, sceneSvg } from './lib/image-motifs.mjs';
import { loadChromium } from './lib/browser.mjs';
import { formatJson } from './lib/json.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d = null) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; };

if (flag('help') || !opt('name')) {
  console.log('Usage: node scripts/brand-kit.mjs --name "<Business>" [--line "<one line>"] [--subject "<what it is>"] [--motif <name>] [--palette <id>] [--type <id>] [--profile taste-profile.json] [--out ./brand] [--no-png]');
  process.exit(opt('name') ? 0 : 2);
}

const profile = opt('profile') && existsSync(opt('profile')) ? JSON.parse(readFileSync(opt('profile'), 'utf8')) : {};
const axis = (k) => profile.axes?.[k]?.value ?? profile[k] ?? null;
const name = opt('name');
const line = opt('line', '');
const subject = opt('subject', line || name);
const paletteId = opt('palette', axis('palette') ?? 'paper-ink');
const typeId = opt('type', axis('type') ?? axis('typography') ?? 'humanist');
const out = resolve(opt('out', './brand'));
const logoFile = opt('logo') ? resolve(opt('logo')) : null; // the person's own logo: icons for the site and the app
const markFile = opt('mark') ? resolve(opt('mark')) : null; // the symbol alone, for square icons (else taken from a wide logo's start)

// ---------------------------------------------------------------- tokens
const palettes = JSON.parse(readFileSync(join(root, 'tokens/palettes/palettes.json'), 'utf8')).palettes;
const pal = palettes.find((p) => p.id === paletteId);
if (!pal) { console.error(`Unknown palette "${paletteId}". Try: ${palettes.map((p) => p.id).join(', ')}`); process.exit(2); }
const hex = (mode, t) => pal.modes[mode].tokens[t].hex;
const L = (t) => hex('light', t), D = (t) => hex('dark', t);

const typeCss = readFileSync(join(root, 'tokens/typography/typography.css'), 'utf8');
const block = new RegExp(`\\[data-type="${typeId}"\\]\\s*\\{([^}]*)\\}`).exec(typeCss);
if (!block) { console.error(`Unknown type pairing "${typeId}".`); process.exit(2); }
const tv = (k, d = '') => new RegExp(`--${k}:\\s*([^;]+);`).exec(block[1])?.[1].trim() ?? d;
const type = { display: tv('font-display', 'serif'), body: tv('font-body', 'sans-serif'), wDisplay: tv('weight-display', '700'), wBody: tv('weight-body', '400'), tracking: tv('tracking-display', '-0.01em') };

// ---------------------------------------------------------------- the subject's drawing, coloured inline
const motif = opt('motif') ?? pickMotif(subject) ?? 'document';
const scene = (pickScene?.(subject) ?? [motif]).slice(0, 3);
/** Mix two #rrggbb colours (t = share of the first), for the drawing's pale disc and floor. */
const mix = (x, y, t) => '#' + [0, 2, 4].map((i) => Math.round(parseInt(x.slice(1 + i, 3 + i), 16) * t + parseInt(y.slice(1 + i, 3 + i), 16) * (1 - t)).toString(16).padStart(2, '0')).join('');
/** Colour a kit drawing for use outside the page (email, favicon, image): fills and strokes become attributes. */
function paint(svg, { ink, a, b, ground, stroke = 3 }) {
  return svg
    .replace(/data-m="sky"/g, `fill="${mix(a, ground, 0.13)}"`).replace(/data-m="floor"/g, `fill="${mix(ink, ground, 0.07)}"`)
    .replace(/ data-part="[^"]*"/g, '').replace(/ aria-hidden="true"/g, '').replace(/ focusable="false"/g, '')
    .replace(/data-m="a"/g, `fill="${a}"`).replace(/data-m="b"/g, `fill="${b}"`).replace(/data-m="cut"/g, `fill="${ground}"`)
    .replace(/data-m="dot"/g, `fill="${ink}"`)
    .replace(/data-m="sil"/g, `fill="none" stroke="${ink}" stroke-width="${stroke * 2}" stroke-linecap="round" stroke-linejoin="round"`)
    .replace(/data-m="ink"/g, `fill="none" stroke="${ink}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"`)
    .replace(/<svg /, '<svg xmlns="http://www.w3.org/2000/svg" ');
}
const motifLight = paint(motifSvg(motif), { ink: L('text-primary'), a: L('accent-solid'), b: L('highlight-soft'), ground: L('bg-canvas') });
const motifOnAccent = paint(motifSvg(motif), { ink: L('accent-ink'), a: L('accent-ink'), b: L('accent-solid'), ground: L('accent-solid'), stroke: 6 });
const sceneLight = sceneSvg ? paint(sceneSvg(scene), { ink: L('text-primary'), a: L('accent-solid'), b: L('highlight-soft'), ground: L('bg-canvas') }) : motifLight;

// ---------------------------------------------------------------- the pieces
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const attrFont = (f) => esc(f.replace(/"/g, "'"));
// Width is estimated from the face's average advance (wide slabs and grotesks run wider than condensed faces).
const avg = /condensed|stencil|shoulders|barlow|oswald/i.test(type.display) ? 0.46 : /archivo|stadium|wide/i.test(type.display) ? 0.68 : 0.58;
const fs = 96, wmW = Math.ceil(name.length * fs * avg + 24), wmH = Math.ceil(fs * 1.25);
const wordmark = (fill) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${wmW} ${wmH}" width="${wmW}" height="${wmH}" role="img" aria-label="${esc(name)}"><text x="12" y="${Math.round(fs * 0.95)}" font-family="${attrFont(type.display)}" font-weight="${type.wDisplay}" font-size="${fs}" letter-spacing="${type.tracking}" fill="${fill}">${esc(name)}</text></svg>\n`;
const lockup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${wmW + 150} ${Math.max(wmH, 140)}" width="${wmW + 150}" height="${Math.max(wmH, 140)}" role="img" aria-label="${esc(name)}"><g transform="translate(0 ${Math.max(0, (wmH - 140) / 2)}) scale(0.875)">${motifLight.replace(/<svg[^>]*>/, '').replace('</svg>', '')}</g><text x="150" y="${Math.round(Math.max(wmH, 140) / 2 + fs * 0.34)}" font-family="${attrFont(type.display)}" font-weight="${type.wDisplay}" font-size="${fs}" letter-spacing="${type.tracking}" fill="${L('text-primary')}">${esc(name)}</text></svg>\n`;
// The favicon: the subject drawn in the accent's ink on the accent, on a rounded square. No text, so no font.
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" rx="36" fill="${L('accent-solid')}"/><g transform="translate(16 16) scale(0.8)">${motifOnAccent.replace(/<svg[^>]*>/, '').replace('</svg>', '')}</g></svg>\n`;

const fontLink = (() => { try { const cat = JSON.parse(readFileSync(join(root, 'catalog.json'), 'utf8')); return cat.typography.find((t) => t.id === typeId)?.webfont ?? null; } catch { return null; } })();
const og = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(name)}: share image</title>
<style>
  html, body { margin: 0; }
  body { width: 1200px; height: 630px; overflow: hidden; background: ${L('bg-canvas')}; color: ${L('text-primary')}; font-family: ${type.body}; }
  .og { box-sizing: border-box; height: 630px; display: grid; grid-template-columns: 1fr 470px; align-items: center; gap: 48px; padding: 72px 80px; position: relative; }
  .og::before { content: ""; position: absolute; inset: 0 0 auto; height: 14px; background: ${L('accent-solid')}; }
  h1 { margin: 0; font-family: ${type.display}; font-weight: ${type.wDisplay}; letter-spacing: ${type.tracking}; font-size: ${name.length > 14 ? 92 : 112}px; line-height: 0.98; }
  p { margin: 28px 0 0; font-size: 34px; line-height: 1.3; color: ${L('text-secondary')}; max-width: 18em; }
  p b { color: ${L('highlight-text')}; font-weight: 600; }
  .art { width: 470px; height: 470px; border-radius: 32px; background: ${L('bg-surface-2')}; display: grid; place-items: center; }
  .art svg { width: 82%; height: auto; }
</style></head><body><div class="og"><div><h1>${esc(name)}</h1>${line ? `<p>${esc(line)}</p>` : ''}</div><div class="art">${sceneLight}</div></div></body></html>\n`;

// The email: tables and inline styles, 600px, the site's colours and faces with safe fallbacks.
const btn = `display:inline-block;background:${L('accent-solid')};color:${L('accent-ink')};font-family:${attrFont(type.body)};font-weight:600;font-size:16px;line-height:1;padding:16px 24px;border-radius:8px;text-decoration:none`;
const email = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(name)}</title></head>
<body style="margin:0;padding:0;background:${L('bg-surface-2')};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${L('bg-surface-2')};"><tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${L('bg-canvas')};border-radius:12px;overflow:hidden;">
    <tr><td style="background:${D('bg-canvas')};padding:20px 32px;font-family:${attrFont(type.display)};font-weight:${type.wDisplay};font-size:22px;color:${D('text-primary')};letter-spacing:${type.tracking};">${esc(name)}</td></tr>
    <tr><td style="padding:40px 32px 8px;font-family:${attrFont(type.display)};font-weight:${type.wDisplay};font-size:34px;line-height:1.1;color:${L('text-primary')};letter-spacing:${type.tracking};">A headline that says what changed</td></tr>
    <tr><td style="padding:12px 32px 28px;font-family:${attrFont(type.body)};font-size:17px;line-height:1.55;color:${L('text-secondary')};">One or two sentences with the facts: what, when and what it costs. Write it the way you would say it at the counter.</td></tr>
    <tr><td style="padding:0 32px 36px;"><a href="#" style="${btn}">One clear action</a></td></tr>
    <tr><td style="padding:24px 32px;background:${L('bg-surface-1')};font-family:${attrFont(type.body)};font-size:13px;line-height:1.5;color:${L('text-muted')};">${esc(name)}${line ? ` · ${esc(line)}` : ''}<br>You are getting this because you asked to. <a href="#" style="color:${L('accent-text')};">Unsubscribe</a></td></tr>
  </table>
</td></tr></table>
</body></html>\n`;

const swatches = [['Ground', 'bg-canvas'], ['Ink', 'text-primary'], ['Accent', 'accent-solid'], ['Highlight', 'highlight'], ['Surface', 'bg-surface-2']];
const sheet = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(name)}: brand</title>${fontLink ? `<!-- Web fonts for this pairing: ${esc(fontLink)} -->` : ''}
<style>
  html, body { margin: 0; } body { background: ${L('bg-surface-2')}; color: ${L('text-primary')}; font-family: ${type.body}; }
  .s { width: 1200px; box-sizing: border-box; padding: 64px; display: grid; gap: 28px; grid-template-columns: repeat(6, 1fr); }
  .c { background: ${L('bg-canvas')}; border-radius: 20px; padding: 32px; }
  .wide { grid-column: span 4; } .side { grid-column: span 2; } .full { grid-column: 1 / -1; } .half { grid-column: span 3; }
  .ink { background: ${D('bg-canvas')}; }
  .c img { display: block; max-width: 100%; height: auto; }
  h2 { margin: 0 0 20px; font: 600 14px/1.2 ${type.body}; color: ${L('text-muted')}; }
  .ink h2 { color: ${D('text-muted')}; }
  .sw { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; }
  .sw div { border-radius: 14px; height: 120px; display: flex; align-items: flex-end; padding: 12px; font: 600 13px/1.3 ${type.body}; }
  .type b { display: block; font-family: ${type.display}; font-weight: ${type.wDisplay}; letter-spacing: ${type.tracking}; font-size: 64px; line-height: 1; }
  .type span { display: block; margin-top: 12px; font-size: 18px; color: ${L('text-secondary')}; }
  .fav { display: flex; gap: 20px; align-items: end; } .fav img:nth-child(1) { width: 96px; } .fav img:nth-child(2) { width: 48px; } .fav img:nth-child(3) { width: 24px; }
  .og { border-radius: 16px; overflow: hidden; } .og img { width: 100%; }
</style></head><body><div class="s">
  <div class="c wide"><h2>Wordmark</h2><img src="wordmark.svg" alt="${esc(name)} wordmark"></div>
  <div class="c side ink"><h2>On ink</h2><img src="wordmark-on-ink.svg" alt="${esc(name)} wordmark on ink"></div>
  <div class="c half"><h2>With the drawing</h2><img src="lockup.svg" alt="${esc(name)} lockup"></div>
  <div class="c half"><h2>Favicon</h2><div class="fav"><img src="favicon.svg" alt=""><img src="favicon.svg" alt=""><img src="favicon.svg" alt=""></div></div>
  <div class="c full"><h2>Colours</h2><div class="sw">${swatches.map(([n, t]) => `<div style="background:${L(t)};color:${['bg-canvas', 'bg-surface-2', 'highlight'].includes(t) ? L('text-primary') : L('bg-canvas')};box-shadow: inset 0 0 0 1px ${L('border-hairline')}">${n}<br>${L(t)}</div>`).join('')}</div></div>
  <div class="c half type"><h2>Lettering</h2><b>${esc(name)}</b><span>${esc(line || 'Body text in the site\'s own face, set for reading.')}</span></div>
  <div class="c half og"><h2>Share image</h2><img src="og.png" alt="Share image" onerror="this.replaceWith(Object.assign(document.createElement('p'),{textContent:'og.html'}))"></div>
</div></body></html>\n`;

// ---------------------------------------------------------------- write
mkdirSync(out, { recursive: true });
const files = {
  'wordmark.svg': wordmark(L('text-primary')),
  'wordmark-on-ink.svg': wordmark(D('text-primary')),
  'lockup.svg': lockup,
  'favicon.svg': favicon,
  'og.html': og,
  'email.html': email,
  'brand.html': sheet,
};
for (const [f, body] of Object.entries(files)) writeFileSync(join(out, f), body);
writeFileSync(join(out, 'brand.json'), formatJson({
  name, line, subject, palette: paletteId, type: typeId, motif, scene,
  colours: Object.fromEntries(swatches.map(([n, t]) => [n.toLowerCase(), { light: L(t), dark: D(t) }])),
  fonts: { display: type.display, body: type.body, webfont: fontLink },
  head: [`<link rel="icon" href="/favicon.svg" type="image/svg+xml">`, `<meta property="og:image" content="/og.png">`, `<meta property="og:image:width" content="1200">`, `<meta property="og:image:height" content="630">`],
}));

let pngs = [];
if (!flag('no-png')) {
  const chromium = await loadChromium(pathToFileURL(join(root, 'package.json')).href);
  if (!chromium) console.warn('Playwright is not installed: og.png, favicon PNGs and brand.png were skipped (the SVG and HTML sources are written).');
  else {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(join(out, 'og.html')).href); await page.waitForTimeout(150);
    await page.screenshot({ path: join(out, 'og.png') }); pngs.push('og.png');
    for (const size of [32, 180, 512]) {
      const p = await browser.newPage({ viewport: { width: size, height: size } });
      await p.setContent(`<html><body style="margin:0">${favicon.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
      await p.screenshot({ path: join(out, `favicon-${size}.png`), omitBackground: true }); pngs.push(`favicon-${size}.png`); await p.close();
    }
    // --logo: the person's own mark, made into every size a site and an app ask for. It is placed, never redrawn.
    if (logoFile) {
      const ext = extname(logoFile).toLowerCase();
      const mime = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }[ext];
      if (!mime) throw new Error(`--logo must be an SVG, PNG, JPEG or WebP file (got ${ext || 'no extension'})`);
      const src = `data:${mime};base64,${readFileSync(logoFile).toString('base64')}`;
      mkdirSync(join(out, 'icons'), { recursive: true });
      // How dark is the mark? A dark mark on the ink top bar needs a paper tile behind it.
      const probe = await browser.newPage();
      const tone = await probe.evaluate(async (u) => { const im = new Image(); im.src = u; await im.decode(); const c = document.createElement('canvas'); c.width = 96; c.height = Math.max(1, Math.round(96 * im.naturalHeight / im.naturalWidth)); const x = c.getContext('2d'); x.drawImage(im, 0, 0, c.width, c.height); const d = x.getImageData(0, 0, c.width, c.height).data; let sum = 0, n = 0, clear = 0; for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 40) { clear++; continue; } sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; n++; } return { light: n ? sum / n / 255 : 0.5, transparent: clear / (d.length / 4) > 0.15, ratio: im.naturalWidth / im.naturalHeight }; }, src);
      await probe.close();
      // A square icon holds the symbol alone: a separate --mark, else the start of a wide logo (a symbol usually sits
      // left of the name), never the whole wide logo shrunk until the name is a smudge.
      const markSrc = markFile ? `data:${markFile.endsWith('.svg') ? 'image/svg+xml' : 'image/png'};base64,${readFileSync(markFile).toString('base64')}` : src;
      const wide = !markFile && tone.ratio > 1.6;
      const tile = (size, { pad, bg, radius = 0 }) => { const inner = Math.round(size * (1 - 2 * pad)); return `<html><body style="margin:0;background:transparent"><div style="width:${size}px;height:${size}px;display:grid;place-items:center;background:${bg};border-radius:${radius}px">${wide ? `<div style="width:${inner}px;height:${inner}px;overflow:hidden;display:flex;align-items:center"><img src="${markSrc}" style="height:${inner}px;width:auto;max-width:none;display:block"></div>` : `<img src="${markSrc}" style="width:${inner}px;height:${inner}px;object-fit:contain;display:block">`}</div></body></html>`; };
      const shots = [
        ['favicon-16.png', 16, { pad: 0, bg: 'transparent' }], ['favicon-32.png', 32, { pad: 0, bg: 'transparent' }], ['favicon-48.png', 48, { pad: 0.04, bg: 'transparent' }],
        ['apple-touch-icon.png', 180, { pad: 0.16, bg: L('bg-canvas') }],
        ['icon-192.png', 192, { pad: 0.14, bg: L('bg-canvas'), radius: 36 }], ['icon-512.png', 512, { pad: 0.14, bg: L('bg-canvas'), radius: 96 }],
        // Android crops a maskable icon to a circle: the mark stays inside the middle 60%.
        ['icon-maskable-512.png', 512, { pad: 0.22, bg: tone.light < 0.5 ? L('bg-canvas') : L('accent-solid') }],
      ];
      for (const [f, size, o] of shots) {
        const p = await browser.newPage({ viewport: { width: size, height: size } });
        await p.setContent(tile(size, o)); await p.waitForTimeout(50);
        await p.screenshot({ path: join(out, 'icons', f), omitBackground: o.bg === 'transparent' || !!o.radius }); await p.close(); pngs.push(`icons/${f}`);
      }
      // The mark on the site's two grounds, to check it reads on both before it goes in the top bar.
      const pair = await browser.newPage({ viewport: { width: 800, height: 200 } });
      await pair.setContent(`<html><body style="margin:0;display:grid;grid-template-columns:1fr 1fr;height:200px"><div style="display:grid;place-items:center;background:${L('bg-canvas')}"><img src="${src}" style="height:80px;width:auto;max-width:340px"></div><div style="display:grid;place-items:center;background:${D('bg-canvas')}">${tone.light < 0.45 ? `<div style="padding:14px 18px;background:${L('bg-canvas')};border-radius:10px"><img src="${src}" style="height:68px;width:auto;max-width:300px;display:block"></div>` : `<img src="${src}" style="height:80px;width:auto;max-width:340px">`}</div></body></html>`);
      await pair.waitForTimeout(50); await pair.screenshot({ path: join(out, 'icons', 'logo-on-grounds.png') }); await pair.close(); pngs.push('icons/logo-on-grounds.png');
      writeFileSync(join(out, 'icons', 'site.webmanifest'), formatJson({ name, short_name: name.length <= 12 ? name : name.split(/\s+/)[0], icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }, { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }], theme_color: L('bg-canvas'), background_color: L('bg-canvas'), display: 'standalone' }));
      const bj = JSON.parse(readFileSync(join(out, 'brand.json'), 'utf8'));
      bj.logo = { file: basename(logoFile), light: Math.round(tone.light * 100) / 100, transparent: tone.transparent, onInk: tone.light < 0.45 ? 'a dark mark: on the ink top bar it sits on a paper tile (icons/logo-on-grounds.png)' : 'reads on the ink top bar as it is' };
      bj.head = [`<link rel="icon" href="/icons/favicon-32.png" sizes="32x32" type="image/png">`, `<link rel="icon" href="/icons/favicon-16.png" sizes="16x16" type="image/png">`, `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">`, `<link rel="manifest" href="/icons/site.webmanifest">`, ...bj.head.filter((h) => !/rel="icon"/.test(h))];
      writeFileSync(join(out, 'brand.json'), formatJson(bj));
      if (wide) console.log('Your logo is wide: the square icons use its start (the symbol). Pass --mark <file> with the symbol alone if that is not right.');
      console.log(`Your logo: ${tone.transparent ? 'transparent ground' : 'solid ground (a transparent PNG or an SVG sits better on coloured bars)'}, ${bj.logo.onInk}.`);
    }
    const s = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    await s.goto(pathToFileURL(join(out, 'brand.html')).href); await s.waitForTimeout(200);
    await s.screenshot({ path: join(out, 'brand.png'), fullPage: true }); pngs.push('brand.png');
    await browser.close();
  }
}

console.log(`Brand kit for ${name} (${pal.name}, ${typeId}, drawing: ${motif}) in ${out}:`);
console.log(`  ${[...Object.keys(files), 'brand.json', ...pngs].join(', ')}`);
console.log('  Put favicon.svg and og.png at the site root and paste brand.json "head" into <head>. The wordmark is set in the site\'s display face: it reads correctly where that face is loaded (or self-hosted with scripts/fonts.mjs).');
