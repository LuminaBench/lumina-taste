// Art direction for a page plan: the decisions that make one page look designed for its subject instead of
// assembled from parts. Given the page type, the domain, the profile and the sections, it picks one
// signature, a hero, the page-level attributes, a layout for every section (never the same shape twice
// in a row), and says where the accent colour and the type sizes are allowed to go.
//
// Pure functions, no I/O: compose.mjs calls direct(); tests call it directly.
import { chooseHero, chooseChrome, sectionComposition } from '../../engine/compose/compositions.mjs';

/** How a section block is laid out, and the visual shape that layout has (what must not repeat next door). */
const LAYOUTS = {
  // id: [preferred layouts, most distinctive first]. `default` is the block as it ships.
  'feature-grid': ['rail', 'split', 'default'],
  'offer-cards': ['split', 'default', 'rail'],
  'how-it-works': ['default', 'rail', 'centre'],
  'stats-band': ['default', 'centre'],
  'service-list': ['default'],
  'testimonial-grid': ['centre', 'rail', 'default'],
  'pricing-tiers': ['centre'],
  'integrations-grid': ['rail', 'default'],
  'team-grid': ['default', 'rail', 'centre'],
  'blog-grid': ['split', 'default'],
  'project-grid': ['split', 'default'],
  'logo-cloud': ['default'],
};
/** Parts from other families that a page type places as a section of their own: drafted inside a plain section. */
export const SECTION_PARTS = new Set(['bento-grid', 'description-list', 'comparison-table', 'code-block', 'terminal-window', 'api-endpoint', 'review-summary', 'device-frame', 'invoice-sheet']);
/** The shape each (block, layout) presents: neighbours with the same shape read as one repeated section. */
const SHAPE = {
  rail: 'rail', centre: 'centre', split: 'left', default: 'left',
};
const FIXED_SHAPE = {
  'scroll-statement': 'statement', 'stack-cards': 'stack', 'media-band': 'band', 'gallery-rail': 'rail-x', 'bento-grid': 'grid',
  'faq-section': 'rail', 'feature-split': 'alternating', 'quote-feature': 'split', 'cta-band': 'panel', 'logo-cloud': 'centre', 'pricing-tiers': 'centre',
  'hero-split': 'split', 'hero-centered': 'centre', 'hero-statement': 'left', 'hero-board': 'split', 'hero-cover': 'left', 'hero-mosaic': 'split', 'hero-video': 'left', 'visit-info': 'split', 'booking-bar': 'panel', 'sticky-story': 'rail',
  'terminal-window': 'split', 'code-block': 'left', 'api-endpoint': 'left', 'contact-section': 'split', 'newsletter-signup': 'panel', 'comparison-table': 'left', 'showcase-tabs': 'centre',
};

/** The one shape a part always has, or null when it can take more than one layout. */
export const fixedShape = (id) => {
  if (!id) return null;
  if (LAYOUTS[id]) return LAYOUTS[id].length > 1 ? null : (FIXED_SHAPE[id] ?? 'left');
  return FIXED_SHAPE[id] ?? null;
};

/** Styles and domains whose pages read as print: untinted bands, set apart by space and scale. */
const PRINTLIKE_STYLES = new Set(['editorial', 'swiss', 'minimal', 'atelier', 'newsprint', 'zen', 'noir', 'linen', 'paper', 'mono', 'bauhaus', 'ledger', 'graph', 'kraft']);
const PRINTLIKE_DOMAINS = new Set(['editorial', 'creative', 'beauty', 'hospitality', 'finance', 'public', 'professional', 'events']);
/** Styles that set the words first. */
const STATEMENT_STYLES = new Set(['editorial', 'swiss', 'minimal', 'noir', 'newsprint', 'bauhaus', 'zen', 'mono']);

const SIGNATURES = {
  devtool: { name: 'Code that runs', how: 'A grid backdrop with circuit traces behind the hero (data-backdrop="grid spot" + backdrop-circuit), the install command beside the one button (command-chip), and a terminal-window that types the real setup. Nothing else on the page moves.' },
  finance: { name: 'The real thing, with real numbers', how: 'Put the artefact itself in the hero: the document the product makes (an invoice-sheet, a statement) or one chart with the finding as its title (forecast-chart, multi-line-chart with highlight). Tabular figures everywhere; ruled rows instead of cards.' },
  trading: { name: 'Density, in order', how: 'A dense first screen: a ticker-style stat-strip and one candlestick or multi-line chart. Mono numbers, hairline grids, no decoration.' },
  analytics: { name: 'The product, working', how: 'A live chart or a device-frame with the product\'s real screen in the hero, then showcase-tabs to show three views of the same data.' },
  productivity: { name: 'The product, working', how: 'A device-frame (browser or phone) holding the real screen in the hero, then a sticky-story that walks through one task in three steps.' },
  enterprise: { name: 'Proof before promise', how: 'A calm split hero, then figures and one named customer (quote-feature) before any feature list. Compliance facts as a description-list, not badges.' },
  health: { name: 'Calm and close', how: 'Large readable type, generous space, one soft-toned art panel or photograph, and the booking action always in reach. No stock smiles.' },
  public: { name: 'The task, first', how: 'A statement hero that names the task in plain words, then numbered steps. Underlined links, strong focus rings, nothing ornamental.' },
  commerce: { name: 'The objects as a set', how: 'Art panels or photographs at one ratio, toned plain, accent and ink across the set, with prices in full. The range is the layout.' },
  beauty: { name: 'The objects as a set', how: 'A quiet statement or split hero, then three art panels or photographs at one ratio with a didone headline. Wide margins and large pictures; no boxes.' },
  hospitality: { name: 'A place you can find', how: 'A type-led hero with one large art panel or photograph, "open now" said in words on the one dark band, and the booking bar closing the page.' },
  editorial: { name: 'Set like print', how: 'A statement hero and one reading column; pull one figure or quote out large per screen, and let space, not rules, divide the sections.' },
  creative: { name: 'The work, large', how: 'A statement hero and a project grid where the first project spans two columns. Captions small and mono; almost no chrome.' },
  playful: { name: 'One friendly object', how: 'Big rounded shapes, one bright accent, a chunky primary button and a device-frame or illustration-free art panel. Motion only on press.' },
  media: { name: 'The thing itself', how: 'The player or the latest episode is the hero. Dark canvas, one accent, chapter rows, no feature grid.' },
  property: { name: 'Plain numbers', how: 'A calculator or a figure in the hero that answers the visitor\'s first question, then facts as a description-list. Reassuring tone, no urgency.' },
  social: { name: 'People, not chrome', how: 'Real-looking content (a thread, a list of people) in a device-frame carries the hero. One loud accent, used on actions only.' },
  professional: { name: 'Plain terms', how: 'The first fee set large in the hero, fees as tiles with each price large, named people with the registration that matters. Nothing decorative: the plainness is the reassurance.' },
  trades: { name: 'The job, the price, the phone', how: 'The phone number in the bar and under the headline, call-out fees and common jobs as ruled rows with prices, the area covered said in words. Bold, plain type; one photograph of real work or an art panel.' },
  events: { name: 'The date, large', how: 'A statement hero with the date and the place above the headline and three figures under it, then the programme as timed rows. One dark band for the venue; no countdown.' },
  travel: { name: 'Dates and a place', how: 'A booking bar in the hero with dates and guests, art panels or photographs at one ratio, prices in full.' },
};
SIGNATURES.construction = { name: 'The job, the price, the phone', how: 'The fixed price of the main job set large in the hero, the jobs as tiles with their prices, the steps from site visit to start date, the phone number in the bar. Stencilled headings; one photograph of finished work or an art panel.' };
SIGNATURES.education = { name: 'Plain and friendly', how: 'One large, friendly headline that says what children do here, the day or the steps as big numbered rows, and the times and place said plainly for parents. No mascots, no confetti.' };
SIGNATURES.transport = { name: 'The timetable', how: 'Times and places set like a departure board: the next thing that matters set large, routes and times as ruled rows in one column, nothing decorative between them.' };
SIGNATURES.cause = { name: 'The claim and the proof', how: 'A statement hero that says what you do as a plain fact with three true figures under it, then one bar that shows where each pound goes. Space and one dark band set the sections apart; no photographs of people in distress.' };
/** Some pages have their signature whatever the subject's domain; others accept only the domains that suit them. */
SIGNATURES.about = { name: 'Who, since when, and why', how: 'A statement hero that makes a claim someone could disagree with, the story as prose beside a rail, then the people by name. Dates and places, not adjectives; no stock team photographs.' };
const TYPE_SIGNATURE = { about: 'about', event: 'events', cause: 'cause', venue: 'hospitality', portfolio: 'creative', 'dev-landing': 'devtool' };
const TYPE_DOMAINS = { 'service-landing': ['health', 'professional', 'trades', 'beauty', 'construction', 'education'], 'brand-landing': ['commerce', 'beauty'] };
const signatureFor = (type, domain) => {
  if (TYPE_SIGNATURE[type.id]) return SIGNATURES[TYPE_SIGNATURE[type.id]];
  const allowed = TYPE_DOMAINS[type.id];
  if (allowed) return SIGNATURES[allowed.includes(domain?.id) ? domain.id : allowed[allowed.length > 2 ? 1 : 0]];
  return SIGNATURES[domain?.id] ?? DEFAULT_SIGNATURE;
};
const DEFAULT_SIGNATURE = { name: 'One clear picture', how: 'Choose one thing to show large in the first screen (the product\'s real screen in a device-frame, one chart, or a statement headline) and let every other section be quieter than it.' };

/**
 * @param {{ type: any, domain: any, profile: any, sections: any[], uiIds: Set<string>, facts?: any, items?: any[], software?: boolean }} input
 */
export function direct({ type, domain, profile, sections, uiIds, facts = null, items = [], software = false }) {
  const marketing = type.kind === 'marketing';
  const style = profile.style ?? null;
  const printlike = (style && PRINTLIKE_STYLES.has(style)) || (!style && (PRINTLIKE_DOMAINS.has(domain?.id) || ['event', 'cause'].includes(type.id)));
  const signature = signatureFor(type, domain);

  // The first screen's composition, from the subject and the brief's facts: never the kit's default split by habit.
  const heroSection = sections.find((s) => /^hero-/.test(s.id ?? ''));
  let hero = heroSection?.id ?? null, heroWhy = null, composition = null, chrome = null;
  if (marketing && heroSection) {
    composition = chooseHero({ type, domain, facts: facts ?? { brief: '' }, items, software });
    // A statement style (swiss, editorial…) keeps the words first when the subject has no shape of its own.
    if (STATEMENT_STYLES.has(style) && ['overlap', 'edge', 'product', 'wide'].includes(composition.id) && type.id !== 'dev-landing' && type.id !== 'landing') composition = { ...composition, id: 'tucked', block: 'hero-statement', variant: 'tucked', name: 'huge type with a small picture tucked in', why: `the ${style} style sets the words first; one small picture beside them` };
    if (!uiIds.has(composition.block)) composition = { id: 'split', block: 'hero-split', variant: null, name: 'split', why: 'the composition this subject needs is not installed' };
    hero = composition.block;
    heroWhy = composition.why;
    chrome = chooseChrome({ type, domain, facts: facts ?? {}, hero: composition });
  }
  // A marketing page with no hero (pricing, a status page) still gets a bar that contrasts with its ground.
  if (marketing && !chrome) chrome = chooseChrome({ type, domain, facts: facts ?? {}, hero: { id: 'none' } });

  // Layouts: walk the sections in order, taking each block's most distinctive layout whose shape differs
  // from the section before it; then repair any pair of neighbours that still share a shape by changing
  // whichever of the two has another layout to give. Rails are capped at two a page and never touch.
  const shapeOf = (id, l) => (l === 'default' ? (FIXED_SHAPE[id] ?? 'left') : SHAPE[l]);
  const slots = [];
  for (const s of sections) {
    // A section with no ready-made part is a plain section; the page type may say how it is laid out.
    if (!s.id && marketing && s.layout) { slots.push({ n: s.n, id: null, role: s.role, options: [s.layout === 'default' ? 'default' : s.layout, ...(s.layout === 'rail' ? ['default'] : ['rail'])], plain: true }); continue; }
    if (!s.id || /^(navbar|hero|footer|site-footer|floating|breadcrumbs|sticky-action)/.test(s.id)) { slots.push(null); continue; }
    if (!marketing) { slots.push({ n: s.n, id: s.id, options: ['default'] }); continue; }
    // A part that is not a section block sits in a plain section (heading on top) and can take the rail.
    const options = LAYOUTS[s.id] ?? (FIXED_SHAPE[s.id] ? ['default'] : ['default', 'rail']);
    slots.push({ n: s.n, id: s.id, options });
  }
  const live = slots.filter(Boolean);
  const heroShape = hero ? (FIXED_SHAPE[hero] ?? 'left') : null;
  // A small search over each section's layouts in order of preference: the first assignment in which no
  // two neighbours share a shape and at most two rails are used. Pages are short, so this is instant.
  const solve = (i, before, rails) => {
    if (i === live.length) return [];
    const x = live[i];
    for (const l of x.options) {
      const sh = shapeOf(x.id, l);
      if (marketing && sh === before) continue;
      const r = rails + (l === 'rail' ? 1 : 0);
      if (r > 2) continue;
      const rest = solve(i + 1, sh, r);
      if (rest) return [l, ...rest];
    }
    return null;
  };
  const picks = solve(0, heroShape, 0) ?? solve(0, null, 0) ?? live.map((x) => x.options[0]);
  live.forEach((x, i) => { x.pick = picks[i]; x.shape = shapeOf(x.id, picks[i]); });
  const layouts = slots.map((x) => (x ? { n: x.n, id: x.id, ...(x.role ? { role: x.role } : {}), layout: x.pick === 'default' ? null : x.pick, shape: x.shape, composition: sectionComposition(x.id, null, x.pick === 'default' ? null : x.pick) } : null));

  // Space: the hero and a lone quote breathe; proof strips sit tight against what they support.
  const space = (id) => (id === 'logo-cloud' ? 'tight' : id === 'quote-feature' ? 'open' : null);
  const sectionLayouts = layouts.filter(Boolean).map((l) => ({ ...l, space: space(l.id) }));

  // Rules between sections and numbered labels read as a generated broadsheet: sections are set apart by space,
  // scale and a change of ground instead. (data-separators and data-numbered remain for a real publication.)
  const mainAttrs = marketing ? ['data-scroll'] : [];
  const motion = marketing
    ? 'The hero enters once (data-entrance on it); every section rises into place as it arrives (data-scroll on <main>). Add at most two scroll moments where they carry the subject: a scroll-statement for the one claim, stack-cards for steps, data-zoom on the strongest picture. Nothing else moves; everything is still under reduced motion.'
    : 'Motion only answers the person: hover, press, open, a toast. No scroll effects on app screens.';
  const words = marketing
    ? 'Words are a caption to something you can see. Headline 6 to 10 words; each section one heading and at most one sentence; a card or row one line. Every section shows something (the product, a document, a chart, one figure set large); never two word-only sections in a row. The critic checks this (taste-text-wall).'
    : 'Labels and values, not sentences. Help text one line, under the field it explains.';
  const accent = marketing
    ? 'The accent appears on the primary button and at most one thing in the hero (a chart series, an art panel, a figure). Everything else is ink and secondary ink; sections differ by ground and scale, not by lines.'
    : 'The accent marks the one primary action and the current selection. Status colours mean status only. Everything else is ink and hairlines.';
  const type_ = marketing
    ? 'Three sizes carry the page: the headline, section headings (one size, every section) and body. Labels are the fourth, small and uppercase. If a fifth size appears, remove it.'
    : 'Two sizes carry the screen: 14–15px for everything people read and scan, one larger size for the page title and key figures.';
  const rhythm = marketing
    ? `Grounds alternate (plain, tinted, the one dark band, the brand band at the close) so no two neighbours share one; density alternates so three busy bands never meet; the first screen and the close are set largest. No small label over every heading and no rules between sections. Shapes in order: ${sectionLayouts.map((l) => l.shape).join(' → ')}. No two neighbours share a shape.`
    : 'One primary view fills the screen; chrome stays quiet. Group with space and hairlines before reaching for cards.';
  return { signature, hero, heroWhy, composition, chrome, mainAttrs, printlike, sectionLayouts, accent, type: type_, rhythm, motion, words };
}

/** The attribute string to put on a section for its assigned layout and space. */
export const sectionAttrs = (l) => [l?.layout ? `data-layout="${l.layout}"` : null, l?.space ? `data-space="${l.space}"` : null].filter(Boolean).join(' ');
