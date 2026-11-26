// Planned rhythm: the order of a page's sections decided as a rhythm before any code is written. Each
// band gets a density (quiet or busy), a ground (plain, well, dark, brand or picture) and a type scale
// (display for the first screen and the close, large for a statement or a figure, normal otherwise).
//
// The rules, all enforced by construction and checked by checkRhythm():
//   1. Never three busy bands in a row.
//   2. At most one dark band and at most one brand band (the critic's accent budget allows one).
//   3. The first screen and the close are the loudest: only they are set at display scale.
//   4. No two neighbours share a ground, unless one of them is a picture.
//   5. No two neighbours share a layout (art-direction.mjs assigns layouts over this order).
// An app screen (dashboard, settings, inbox, sign-in…) is one ground and as dense as its work: it gets a
// "screen" rhythm that names its regions, and the band rules do not apply to it.
//
// Pure functions, no I/O.
import { fixedShape } from '../../scripts/lib/art-direction.mjs';

/** Parts that are page chrome, not bands. */
export const CHROME = /^(navbar|footer|site-footer|floating-pill-nav|hide-on-scroll|breadcrumbs|sticky-action|app-sidebar|subnav|mobile-app-bar|bottom-nav|bottom-sheet|switcher-menu|scrollspy-toc|tree-view|doc-pager|backdrop-)/;
/** Parts that sit inside the next band rather than making one (a billing toggle above its tiers). */
const ATTACHED = new Set(['billing-toggle', 'badge']);
/** Proof from other people: never planned into a draft unless the user gave it. */
export const PROOF = new Set(['logo-cloud', 'testimonial-grid', 'quote-feature', 'review-summary']);

/** density, scale and ground each part brings; `flex` parts can be kept quiet by keeping them to three things. */
const BEAT = {
  'hero-split': { d: 'busy' }, 'hero-centered': { d: 'busy' }, 'hero-statement': { d: 'quiet' },
  'scroll-statement': { d: 'quiet', s: 'large' }, 'stats-band': { d: 'quiet', s: 'large' }, 'quote-feature': { d: 'quiet', s: 'large' },
  'media-band': { d: 'quiet', s: 'large', g: 'picture' }, 'gallery-rail': { d: 'quiet', g: 'picture' },
  'cta-band': { d: 'quiet', s: 'large' }, 'newsletter-signup': { d: 'quiet' }, 'logo-cloud': { d: 'quiet' }, 'booking-bar': { d: 'quiet' },
  'faq-section': { d: 'quiet' }, 'not-found': { d: 'quiet', s: 'large' },
  'bento-grid': { d: 'busy', flex: true }, 'feature-grid': { d: 'busy', flex: true }, 'offer-cards': { d: 'busy', flex: true },
  'team-grid': { d: 'busy', flex: true }, 'how-it-works': { d: 'busy', flex: true }, 'description-list': { d: 'busy', flex: true },
  'integrations-grid': { d: 'busy', flex: true }, 'blog-grid': { d: 'busy', flex: true }, 'project-grid': { d: 'busy', flex: true },
};
/** Bands that can close a page: the one action, said again. */
const CLOSERS = ['cta-band', 'booking-bar', 'newsletter-signup', 'contact-section', 'pricing-tiers'];
/** Where the page's one dark band suits best, most suitable first. */
const DARK_FIT = ['visit-info', 'stats-band', 'scroll-statement', 'stack-cards', 'how-it-works', 'quote-feature', 'team-grid', 'terminal-window', 'code-block', 'sticky-story', 'showcase-tabs', 'feature-split', 'booking-bar'];
/** The part to put between three busy bands when none of them can be made quiet. */
const BREATHERS = [
  { id: 'scroll-statement', role: 'The one claim', copy: 'The bold idea as one sentence of 12 to 25 words, its second half in data-part="quiet".' },
  { id: 'stats-band', role: 'Figures', copy: 'Two to four figures from the brief, each with its unit and period. No figures, no band.' },
];
const SHORT = { 'hero-split': 'hero', 'hero-centered': 'hero', 'hero-statement': 'hero', 'scroll-statement': 'statement', 'stats-band': 'figures', 'quote-feature': 'quote', 'media-band': 'picture', 'gallery-rail': 'gallery', 'cta-band': 'close', 'faq-section': 'questions', 'visit-info': 'visit', 'booking-bar': 'booking', 'bento-grid': 'tiles', 'stack-cards': 'steps', 'how-it-works': 'steps', 'offer-cards': 'offers', 'team-grid': 'people', 'pricing-tiers': 'pricing', 'feature-split': 'features', 'feature-grid': 'features', 'service-list': 'list', 'contact-section': 'contact', 'project-grid': 'work', 'newsletter-signup': 'newsletter', 'terminal-window': 'terminal', 'code-block': 'code', 'api-endpoint': 'api', 'comparison-table': 'compare', 'description-list': 'details', 'logo-cloud': 'logos', 'testimonial-grid': 'quotes', 'integrations-grid': 'integrations', 'blog-grid': 'posts', 'review-summary': 'reviews', 'radio-cards': 'options', 'carousel': 'more', 'data-table': 'table', 'filter-bar': 'filters', 'stat-strip': 'figures' };
const labelOf = (s) => SHORT[s.id] ?? String(s.role ?? s.id ?? 'section').toLowerCase().replace(/^the\s+/, '');

/** Is this page a run of bands (a marketing page) or one screen (an app, a flow, a reading view)? */
export const isBanded = (type) => type.kind === 'marketing';

/** The sections that make bands, in order. */
export function bandsOf(sections, { draft = true } = {}) {
  return sections.filter((s) => (s.id || s.role) && !CHROME.test(s.id ?? '') && !ATTACHED.has(s.id ?? '') && !(draft && s.optional && PROOF.has(s.id ?? '')));
}

/**
 * Plan the rhythm of a page.
 * @param {{ type: any, sections: any[], canInsert?: boolean, draft?: boolean }} input
 *   sections: [{ n, id, role, tone?, optional? }] in page order. canInsert: may add a breather part.
 * @returns {{ banded: boolean, beats: any[], moved: string[], inserted: any[] }}
 */
export function planRhythm({ type, sections, canInsert = true, draft = true }) {
  const bands = bandsOf(sections, { draft }).map((s) => ({ ...s }));
  if (!isBanded(type)) {
    const beats = bands.map((s) => ({ n: s.n, id: s.id ?? null, role: s.role, label: labelOf(s), density: BEAT[s.id]?.d ?? 'busy', ground: 'screen', scale: 'normal' }));
    if (beats[0]) beats[0].scale = 'large';
    return { banded: false, beats, moved: [], inserted: [] };
  }
  const moved = [], inserted = [];
  // The close: the last band says the one action again. Move a closer there if one sits earlier.
  if (bands.length >= 3 && !CLOSERS.includes(bands[bands.length - 1].id)) {
    const i = bands.map((b) => b.id).findLastIndex((id, k) => k > 0 && CLOSERS.includes(id));
    if (i > 0) { const [c] = bands.splice(i, 1); bands.push(c); moved.push(c.id); }
  }
  // Two parts that can only be laid out one way, and the same way, never stand side by side: the second
  // trades places with the band after it (the first screen and the close stay where they are).
  for (let i = /^hero-/.test(bands[0]?.id ?? '') ? 2 : 1; i < bands.length - 1; i++) {
    const a = fixedShape(bands[i - 1].id), b = fixedShape(bands[i].id);
    if (!a || a !== b) continue;
    const j = i + 1 < bands.length - 1 ? i + 1 : null;
    if (j != null && fixedShape(bands[j].id) !== a) { [bands[i], bands[j]] = [bands[j], bands[i]]; moved.push(bands[j].id); }
  }
  let beats = bands.map((s) => ({ n: s.n, id: s.id ?? null, role: s.role, label: labelOf(s), density: BEAT[s.id]?.d ?? 'busy', scale: BEAT[s.id]?.s ?? 'normal', ground: BEAT[s.id]?.g ?? null, flex: !!BEAT[s.id]?.flex, hint: s.tone ?? null, note: null }));

  // 1. Never three busy in a row: quieten a flexible band (three things, no sentences), else add a breather.
  for (let i = 2; i < beats.length; i++) {
    const run = [beats[i - 2], beats[i - 1], beats[i]];
    if (!run.every((b) => b.density === 'busy')) continue;
    const quiet = [i - 1, i, i - 2].map((k) => beats[k]).find((b) => b.flex && b !== beats[0]);
    if (quiet) { quiet.density = 'quiet'; quiet.note = 'Keep it quiet: three things at most, a name and a figure each, no sentences.'; continue; }
    const br = canInsert && BREATHERS.find((x) => !beats.some((b) => b.id === x.id));
    if (br) {
      const b = { n: null, id: br.id, role: br.role, label: labelOf(br), density: 'quiet', scale: BEAT[br.id].s ?? 'large', ground: null, flex: false, hint: null, note: br.copy, inserted: true };
      beats.splice(i, 0, b); inserted.push(br.id);
      continue;
    }
    // Nothing to add: the middle band is cut down to its essentials.
    beats[i - 1].density = 'quiet'; beats[i - 1].note = 'Cut this band to its essentials so it reads as a pause: one row, no sentences.';
  }

  // 3. Scale: the first screen and the close are the loudest; nothing else is set at display size.
  for (const b of beats) if (b.scale === 'display') b.scale = 'large';
  beats[0].scale = 'display';
  const close = beats.length >= 3 ? beats[beats.length - 1] : null;
  if (close) close.scale = 'display';

  // 2. Grounds: one brand band (the close, when it is a closing band), one picture or dark band from the middle on.
  if (close && ['cta-band', 'newsletter-signup'].includes(close.id)) close.ground = 'brand';
  for (const b of beats) if (b.ground === 'picture' && beats.filter((x) => x.ground === 'picture').indexOf(b) > 0) b.ground = null;
  const strong = (b) => ['dark', 'brand', 'picture'].includes(b?.ground);
  if (!beats.some((b) => b.ground === 'picture') && beats.length >= 5) {
    const mid = beats.slice(1, close ? -1 : undefined).filter((b, k, a) => !strong(b) && !strong(beats[beats.indexOf(b) - 1]) && !strong(beats[beats.indexOf(b) + 1]));
    const hinted = mid.find((b) => b.hint === 'dark');
    const from = Math.floor(beats.length / 3);
    const fit = hinted ?? DARK_FIT.map((id) => mid.find((b) => b.id === id && beats.indexOf(b) >= from)).find(Boolean);
    if (fit) fit.ground = 'dark';
  }
  // 4. Light grounds alternate: plain after anything that is not plain, well after plain.
  let prev = null;
  for (const b of beats) {
    if (!b.ground) b.ground = prev === 'plain' ? 'well' : 'plain';
    prev = b.ground;
  }
  // A well right before the brand close or the dark band reads as a third ground in two steps: plain is calmer.
  for (let i = 1; i < beats.length; i++) if (beats[i].ground === 'well' && strong(beats[i + 1]) && beats[i - 1].ground !== 'plain') beats[i].ground = 'plain';

  beats = beats.map(({ flex, hint, ...b }) => b);
  return { banded: true, beats, moved, inserted };
}

/**
 * Every rule the rhythm breaks, as sentences. `shapes` (optional) are the layouts in beat order.
 * @param {{ banded: boolean, beats: any[] }} rhythm
 * @param {string[]} [shapes]
 */
export function checkRhythm(rhythm, shapes = null) {
  const out = [];
  const { beats } = rhythm;
  if (!rhythm.banded) {
    if (beats.some((b) => b.ground !== 'screen')) out.push('an app screen has one ground');
    return out;
  }
  for (let i = 2; i < beats.length; i++) if (beats.slice(i - 2, i + 1).every((b) => b.density === 'busy')) out.push(`three busy bands in a row ending at ${beats[i].label}`);
  if (beats.filter((b) => b.ground === 'dark').length > 1) out.push('more than one dark band');
  if (beats.filter((b) => b.ground === 'brand').length > 1) out.push('more than one brand band');
  if (beats.filter((b) => b.ground === 'picture').length > 1) out.push('more than one picture band');
  const loud = beats.map((b, i) => (b.scale === 'display' ? i : -1)).filter((i) => i >= 0);
  if (beats.length && !loud.includes(0)) out.push('the first screen is not the loudest');
  if (beats.length >= 3 && !loud.includes(beats.length - 1)) out.push('the close is not the loudest');
  if (loud.some((i) => i !== 0 && i !== beats.length - 1)) out.push('a band in the middle is set as loud as the first screen');
  for (let i = 1; i < beats.length; i++) {
    const a = beats[i - 1], b = beats[i];
    if (a.ground === b.ground && a.ground !== 'picture') out.push(`${a.label} and ${b.label} share the ${a.ground} ground`);
    if (shapes && shapes[i] && shapes[i] === shapes[i - 1]) out.push(`${a.label} and ${b.label} share the ${shapes[i]} layout`);
  }
  return out;
}

const GLYPH = { busy: '▇', quiet: '▁' };
const SIZE = { display: ' XL', large: ' L', normal: '' };
/** The rhythm as one compact line: `hero ▇ XL · statement ▁ L well · fees ▇ · visit ▇ dark · close ▁ XL brand`. */
export function rhythmStrip(rhythm) {
  return rhythm.beats.map((b) => `${b.label} ${GLYPH[b.density] ?? '▇'}${SIZE[b.scale] ?? ''}${b.ground && !['plain', 'screen'].includes(b.ground) ? ` ${b.ground}` : ''}`).join(' · ');
}
export const STRIP_KEY = '▇ busy, ▁ quiet; XL display type (first screen and close only), L large type; the ground is named when it is not plain.';

/** The attributes a band carries in a draft: its tone for the ground, and the rhythm as data. */
export function beatAttrs(b) {
  const tone = { well: 'well', dark: 'dark', brand: 'accent' }[b.ground] ?? null;
  return { tone, attrs: [`data-rhythm="${b.density}"`, b.scale !== 'normal' ? `data-scale="${b.scale}"` : null].filter(Boolean).join(' ') };
}

/**
 * The page's sections in rhythm order, renumbered from 1: chrome stays where it was, bands follow the beats
 * (a band moved to the close, a breather added), and a part that is not a band (an optional quote, a
 * billing toggle) travels with the band it stood before. Beats are renumbered to match.
 * @returns {{ sections: any[], rhythm: any }}
 */
export function orderSections(sections, rhythm) {
  const bandNs = new Set(rhythm.beats.map((b) => b.n).filter((n) => n != null));
  const head = [], prefix = new Map(), tail = [];
  let pending = [], seenBand = false;
  for (const s of sections) {
    if (bandNs.has(s.n)) { prefix.set(s.n, pending); pending = []; seenBand = true; continue; }
    if (!seenBand) head.push(s); else pending.push(s);
  }
  tail.push(...pending);
  const out = [...head];
  const byN = new Map(sections.map((s) => [s.n, s]));
  const beatOf = new Map();
  for (const b of rhythm.beats) {
    if (b.n != null) { out.push(...(prefix.get(b.n) ?? []), byN.get(b.n)); beatOf.set(byN.get(b.n), b); }
    else { const s = { id: b.id, role: b.role, copy: b.note, rule: 'Added by the rhythm plan as a pause between busy bands.', inserted: true }; out.push(s); beatOf.set(s, b); }
  }
  out.push(...tail);
  const renumbered = out.map((s, i) => ({ ...s, n: i + 1, exists: s.exists ?? true }));
  const beats = rhythm.beats.map((b) => ({ ...b }));
  out.forEach((s, i) => { const b = beatOf.get(s); if (b) beats[rhythm.beats.indexOf(b)].n = i + 1; });
  return { sections: renumbered, rhythm: { ...rhythm, beats } };
}
