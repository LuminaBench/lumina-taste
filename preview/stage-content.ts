// What the Moments and Before / after views play: every scroll moment and micro-interaction, and pairs of a
// generic assistant-written section beside the kit's version of the same section. One made-up business, a
// coffee roaster called Kestrel, carries the before-and-after pairs.
import { UI } from './generated/registry';
import { sceneSvg } from '../components/ui/data/art-panel/art-panel';

const html = (id: string) => (UI as Array<{ id: string; html: string }>).find((c) => c.id === id)?.html ?? '';
const ARROW = '<svg class="lt-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

// ------------------------------------------------------------------ the kit's sections for Kestrel
const hero = (entrance = false) => `<section class="lt-hero-split" aria-labelledby="k-hero"${entrance ? ' data-entrance' : ''}>
  <div data-part="copy">
    <h1 id="k-hero">Roasted on Tuesday, at your door by Thursday</h1>
    <p data-part="lede">Kestrel roasts three coffees a week in Leith and posts every bag the next morning.</p>
    <div data-part="cta"><a class="lt-btn" data-variant="primary" data-size="lg" href="#range">Choose a coffee ${ARROW}</a></div>
  </div>
  <div data-part="visual"><figure class="lt-art" data-frame data-ratio="1/1" data-scene="bag cup" data-shot="Bag of Huila beans and a cup on the roastery counter, window light, 1:1">${sceneSvg('bag cup')}<p data-part="name">Huila</p><p data-part="fact">Roasted Tuesday · 250 g · £11.50</p><figcaption class="lt-visually-hidden">A bag of Huila coffee beside a cup on the counter</figcaption></figure></div>
</section>`;

/** The kit's offer cards, each art panel with its own drawing. */
const range = () => html('offer-cards')
  .replace('data-shot="Bag of Huila', 'data-motif="bag" data-shot="Bag of Huila')
  .replace('data-shot="Bag of Sidamo', 'data-motif="cup" data-shot="Bag of Sidamo')
  .replace('data-shot="Bag of the house', 'data-motif="jar" data-shot="Bag of the house')
  .replace('<section class="lt-offers"', '<section class="lt-offers" data-lt="art-panel"');

const proof = () => `<section class="lt-stats-band" data-lt="stats-band" aria-labelledby="k-facts">
  <h2 id="k-facts" data-part="eyebrow">This week at the roastery</h2>
  <dl><div><dt>hours from roaster to your door</dt><dd data-count>48 h</dd></div><div><dt>coffees on the list this week</dt><dd data-count>3</dd></div><div><dt>whole beans in every bag</dt><dd data-count>250 g</dd></div><div><dt>for a bag, posted</dt><dd data-count>£11.50</dd></div></dl>
</section>`;

/** Proof as pictures: three true quantities, each set large on its own panel. */
const figures = () => `<section class="lt-band g-ba-figs" aria-labelledby="k-figs"><div class="lt-container">
  <h2 id="k-figs">From the roaster to your door in two days</h2>
  <ul>
    <li><figure class="lt-art" data-variant="figure" data-tone="accent" data-ratio="1/1" data-motif="van" data-lt="art-panel"><p data-part="figure">48<small>h</small></p><p data-part="name">Roaster to door</p><figcaption class="lt-visually-hidden">48 hours from roaster to your door</figcaption></figure></li>
    <li><figure class="lt-art" data-variant="figure" data-ratio="1/1" data-motif="bag" data-lt="art-panel"><p data-part="figure">250<small>g</small></p><p data-part="name">Whole beans in every bag</p><figcaption class="lt-visually-hidden">250 grams of whole beans in every bag</figcaption></figure></li>
    <li><figure class="lt-art" data-variant="figure" data-tone="ink" data-ratio="1/1"><p data-part="figure">3</p><p data-part="name">Coffees on the list this week</p><figcaption class="lt-visually-hidden">Three coffees on the list this week</figcaption></figure></li>
  </ul>
</div></section>`;

const close = () => `<section class="lt-cta-band" data-tone="dark" aria-labelledby="k-close">
  <div data-part="panel">
    <div><h2 id="k-close">The next roast is on Tuesday</h2><p data-part="lede">Order by Monday at six and your bag is in it.</p></div>
    <div data-part="cta"><a class="lt-btn" data-variant="primary" data-size="lg" href="#range">Choose a coffee</a></div>
  </div>
</section>`;

// ------------------------------------------------------------------ scroll moments
export interface Moment { id: string; name: string; line: string; api: string; kind: 'scroll' | 'load' | 'slider'; ms: number; reveal?: boolean; until?: number; body: () => string }
export const MOMENTS: Moment[] = [
  { id: 'entrance', name: 'Entrance', line: 'The headline rises line by line, then the lede and action, then the picture. Once, on load.', api: 'data-entrance', kind: 'load', ms: 1600, body: () => hero(true) },
  { id: 'reveal', name: 'Reveal', line: 'Each section’s heading and body rise into place as they arrive. Quiet, the same everywhere.', api: '<main data-scroll>', kind: 'scroll', ms: 4200, reveal: true, body: range },
  { id: 'pinned', name: 'Pinned scene', line: 'One frame holds still while three steps scroll past it, and changes with each.', api: 'sticky-story', kind: 'scroll', ms: 9000, body: () => html('sticky-story') },
  { id: 'sideways', name: 'Sideways scroll', line: 'Scrolling down slides a row of work sideways, then lets the page go on.', api: 'side-scroll', kind: 'scroll', ms: 8000, body: () => html('side-scroll') },
  { id: 'reveal-product', name: 'Product reveal', line: 'The strongest picture rises from lying back, like a lid, and stands upright.', api: 'product-reveal · data-zoom="open"', kind: 'scroll', ms: 4600, body: () => html('product-reveal') },
  { id: 'zoom', name: 'Zoom', line: 'A large picture settles to full size as it scrolls in.', api: 'media-band · data-zoom', kind: 'scroll', ms: 4600, until: 0.02, body: () => html('media-band') },
  { id: 'statement', name: 'Statement', line: 'The one claim of the page lights up word by word.', api: 'scroll-statement', kind: 'scroll', ms: 5200, until: 0.04, body: () => html('scroll-statement') },
  { id: 'stack', name: 'Stack', line: 'Steps as large cards that pin and slide over each other.', api: 'stack-cards', kind: 'scroll', ms: 8000, body: () => html('stack-cards') },
  { id: 'counts', name: 'Numbers that settle', line: 'True quantities count up once, then hold. The number is in the HTML.', api: 'data-count', kind: 'scroll', ms: 3400, body: proof },
  { id: 'before-after', name: 'Before and after', line: 'One picture in two states, on a native slider: drag, arrow keys or touch.', api: 'before-after', kind: 'slider', ms: 4200, body: () => html('before-after') },
];

// ------------------------------------------------------------------ micro-interactions
const CHECK = '<svg viewBox="0 0 16 16"><path data-part="tick" d="m3.5 8.5 3 3 6-7"/><path data-part="dash" d="M4 8h8"/></svg>';
const COPY = '<span data-part="icons" aria-hidden="true"><span data-part="copy"><svg class="lt-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/></svg></span><span data-part="done"><svg class="lt-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></span></span>';
export interface Micro { id: string; name: string; line: string; api: string; enhance: string[]; body: string }
export const MICROS: Micro[] = [
  { id: 'press', name: 'Press', line: 'Sinks a pixel and a half at once, springs back past its rest. Never grows on hover.', api: '--press-settle · --ease-release', enhance: [],
    body: '<div class="lt-btn-row"><button type="button" class="lt-btn" data-variant="primary">Place order</button><button type="button" class="lt-btn" data-variant="secondary">Save for later</button></div>' },
  { id: 'switch', name: 'Switch', line: 'The thumb stretches while held, crosses with a small overshoot and settles.', api: '--dur-toggle · --ease-overshoot', enhance: [],
    body: '<div class="lt-switch-list"><label class="lt-switch"><input type="checkbox" role="switch"><span data-part="track" aria-hidden="true"><span data-part="thumb"></span></span><span data-part="label">Grind the beans</span></label><label class="lt-switch"><input type="checkbox" role="switch" checked><span data-part="track" aria-hidden="true"><span data-part="thumb"></span></span><span data-part="label">Post on roast day</span></label></div>' },
  { id: 'tick', name: 'Tick', line: 'The box gives a little, fills, and the tick draws itself after it.', api: '--dur-draw · --delay-draw', enhance: ['checkbox'],
    body: `<fieldset class="lt-check-group" data-lt="checkbox"><legend>Send me</legend><label class="lt-check"><input type="checkbox"><span data-part="box" aria-hidden="true">${CHECK}</span>Roast-day reminders</label><label class="lt-check"><input type="checkbox"><span data-part="box" aria-hidden="true">${CHECK}</span>New coffees</label></fieldset>` },
  { id: 'shake', name: 'Field that fails', line: 'One gentle shake when the check fails, and the message arrives under it. Never while typing.', api: 'data-shake · --shake-x', enhance: ['text-field'],
    body: '<form class="lt-form-demo" data-lt="text-field" novalidate><div class="lt-field"><input id="g-mf-email" type="email" required placeholder=" " autocomplete="email" aria-describedby="g-mf-email-msg"><label for="g-mf-email">Email for roast-day reminders</label><span data-part="valid" aria-hidden="true"><svg class="lt-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></span><p id="g-mf-email-msg" data-part="message" data-help="One email on Monday, nothing else.">One email on Monday, nothing else.</p></div><button type="submit" class="lt-btn" data-variant="secondary">Remind me</button></form>' },
  { id: 'copy', name: 'Copy', line: 'The icon turns to a tick and “Copied” rolls up in the label’s place, which keeps its width.', api: 'copy-button · --dur-confirm', enhance: ['copy-button'],
    body: `<div class="lt-copy-field"><code>KESTREL-TUESDAY</code><button type="button" class="lt-copy" data-lt="copy-button" data-copy="KESTREL-TUESDAY" aria-label="Copy code">${COPY}<span data-part="text">Copy</span><span data-part="live" class="lt-visually-hidden" role="status" aria-live="polite"></span></button></div>` },
];

// ------------------------------------------------------------------ before and after
// The "before" side is what an assistant writes when nothing pushes it (tests/fixtures/ai-default-*.html):
// one stock sans, indigo, centred everything, icon tiles, invented figures, a purple band. Plain HTML and its
// own stylesheet, shown in a frame so none of it reaches the gallery.
const BEFORE_CSS = `
  :root { --ink: #0f172a; --muted: #64748b; --bg: #ffffff; --card: #ffffff; --line: #e2e8f0; --tile: #eef2ff; --indigo: #6366f1; color-scheme: light; }
  :root.dark { --ink: #f1f5f9; --muted: #94a3b8; --bg: #0b1120; --card: #111827; --line: #1f2937; --tile: #1e1b4b; color-scheme: dark; }
  body { margin: 0; font: 16px/1.5 Inter, system-ui, sans-serif; color: var(--ink); background: var(--bg); }
  section { padding: 88px max(24px, calc((100% - 1100px) / 2)); text-align: center; }
  h1 { margin: 18px auto 16px; max-width: 16ch; font-size: clamp(36px, 6vw, 60px); line-height: 1.05; letter-spacing: -0.02em; }
  h1 span { background: linear-gradient(90deg, #6366f1, #a855f7, #ec4899); -webkit-background-clip: text; background-clip: text; color: transparent; }
  h2 { margin: 0 0 8px; font-size: 36px; letter-spacing: -0.01em; }
  p { margin: 0 auto; max-width: 56ch; color: var(--muted); }
  .hero { background: radial-gradient(ellipse at top, rgba(99, 102, 241, 0.18), transparent 60%), var(--bg); }
  .pill { display: inline-block; padding: 6px 14px; border: 1px solid rgba(99, 102, 241, 0.35); border-radius: 999px; background: rgba(99, 102, 241, 0.08); color: var(--indigo); font-size: 14px; font-weight: 600; }
  .btns { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; margin-top: 28px; }
  .btn { display: inline-block; padding: 12px 22px; border-radius: 12px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; font-weight: 600; text-decoration: none; box-shadow: 0 10px 40px rgba(99, 102, 241, 0.45); }
  .btn.ghost { background: transparent; color: var(--ink); border: 1px solid var(--line); box-shadow: none; }
  .stats { display: flex; flex-wrap: wrap; gap: 48px; justify-content: center; margin-top: 48px; }
  .stats b { display: block; font-size: 36px; }
  .stats span { color: var(--muted); font-size: 14px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-top: 40px; text-align: left; }
  .card { padding: 28px; border: 1px solid var(--line); border-radius: 16px; background: var(--card); box-shadow: 0 20px 48px rgba(15, 23, 42, 0.12); transition: transform .2s; }
  .card:hover { transform: scale(1.05); }
  .card h3 { margin: 16px 0 6px; font-size: 20px; }
  .card p { margin: 0; }
  .tile { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 12px; background: var(--tile); color: var(--indigo); font-size: 22px; }
  .quote { max-width: 640px; margin: 40px auto 0; padding: 32px; border: 1px solid var(--line); border-radius: 16px; background: var(--card); }
  .quote p { color: var(--ink); font-size: 20px; }
  .who { display: flex; gap: 12px; align-items: center; justify-content: center; margin-top: 18px; color: var(--muted); font-size: 14px; }
  .face { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #cbd5e1, #94a3b8); }
  .band { margin: 0 max(24px, calc((100% - 1100px) / 2)); padding: 72px 24px; border-radius: 24px; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; }
  .band p { color: rgba(255, 255, 255, 0.85); }
  .band .btn { background: #fff; color: #4f46e5; box-shadow: none; }
  .wrap { padding: 72px 0; }
`;
const BEFORE: Record<string, string> = {
  hero: '<section class="hero"><span class="pill">✨ New: smart subscriptions</span><h1>Coffee, <span>reimagined</span> for the modern home</h1><p>Everything you need for the perfect cup, all in one place. Fresh, ethical and delivered fast.</p><div class="btns"><a class="btn" href="#a">Get started</a><a class="btn ghost" href="#b">Learn more</a></div></section>',
  range: '<section><h2>Why choose us?</h2><p>We make great coffee simple.</p><div class="grid"><div class="card"><span class="tile">☕</span><h3>Fresh</h3><p>Roasted with care for the perfect cup every time.</p></div><div class="card"><span class="tile">🌱</span><h3>Ethical</h3><p>Sourced responsibly from the best farms.</p></div><div class="card"><span class="tile">🚀</span><h3>Fast</h3><p>Lightning-fast delivery straight to your door.</p></div></div></section>',
  proof: '<section><h2>Loved by coffee fans</h2><div class="stats"><div><b>10x</b><span>fresher</span></div><div><b>99.9%</b><span>satisfaction</span></div><div><b>24/7</b><span>support</span></div><div><b>50k+</b><span>happy customers</span></div></div><div class="quote"><p>“Best coffee ever. Highly recommend to everyone!”</p><div class="who"><span class="face"></span>A happy customer</div></div></section>',
  close: '<div class="wrap"><div class="band"><h2>Ready to transform your mornings?</h2><p>Join thousands of happy customers today.</p><div class="btns"><a class="btn" href="#a">Get started now</a></div></div></div>',
};
export const beforeDoc = (id: string, dark: boolean) => `<!doctype html><html lang="en"${dark ? ' class="dark"' : ''}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Generic ${id}</title><style>${BEFORE_CSS}</style></head><body>${BEFORE[id]}</body></html>`;

export interface Pair { id: string; title: string; rule: string; body: () => string; enhance: string[] }
export const PAIRS: Pair[] = [
  { id: 'hero', title: 'The first screen', rule: 'Centred pill, gradient words, two equal buttons. Instead: the claim on the left edge with its own fact, one action, and the subject drawn large.', body: () => hero(), enhance: [] },
  { id: 'range', title: 'What is for sale', rule: 'Three icon tiles that would fit any business. Instead: the three coffees themselves, each with its price, at one ratio, toned plain, accent and ink.', body: range, enhance: ['art-panel'] },
  { id: 'proof', title: 'Proof', rule: 'Invented figures and a faceless quote. Instead: three true quantities with their units, each set large on its own panel.', body: figures, enhance: ['art-panel'] },
  { id: 'close', title: 'The close', rule: 'A purple band asking a question. Instead: the next date, and the same one action as the first screen.', body: close, enhance: [] },
];
