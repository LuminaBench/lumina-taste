// Art direction for a page plan: the decisions that make one page look designed for its subject instead of
// assembled from parts. Given the page type, the domain, the profile and the sections, it picks one
// signature, a hero, the page-level attributes, a layout for every section (never the same shape twice
// in a row), and says where the accent colour and the type sizes are allowed to go.
//
// Pure functions, no I/O: compose.mjs calls direct(); tests call it directly.

/** How a section block is laid out, and the visual shape that layout has (what must not repeat next door). */
const LAYOUTS = {
  // id: [preferred layouts, most distinctive first]. `default` is the block as it ships.
  'feature-grid': ['rail', 'split', 'default'],
  'offer-cards': ['split', 'default', 'rail'],
  'how-it-works': ['default', 'rail'],
  'stats-band': ['default'],
  'service-list': ['default'],
  'testimonial-grid': ['centre', 'rail', 'default'],
  'pricing-tiers': ['centre'],
  'integrations-grid': ['rail', 'default'],
  'team-grid': ['default', 'rail'],
  'blog-grid': ['split', 'default'],
  'project-grid': ['split', 'default'],
  'logo-cloud': ['default'],
};
/** The shape each (block, layout) presents: neighbours with the same shape read as one repeated section. */
const SHAPE = {
  rail: 'rail', centre: 'centre', split: 'left', default: 'left',
};
const FIXED_SHAPE = {
  'faq-section': 'rail', 'feature-split': 'alternating', 'quote-feature': 'split', 'cta-band': 'panel', 'logo-cloud': 'centre', 'pricing-tiers': 'centre',
  'hero-split': 'split', 'hero-centered': 'centre', 'hero-statement': 'left', 'visit-info': 'split', 'booking-bar': 'panel', 'sticky-story': 'rail',
  'terminal-window': 'split', 'code-block': 'left', 'api-endpoint': 'left', 'contact-section': 'split', 'newsletter-signup': 'panel', 'comparison-table': 'left', 'showcase-tabs': 'centre',
};

/** Styles and domains whose pages read as print: hairlines and numbers instead of tinted bands. */
const PRINTLIKE_STYLES = new Set(['editorial', 'swiss', 'minimal', 'atelier', 'newsprint', 'zen', 'noir', 'linen', 'paper', 'mono', 'bauhaus', 'ledger', 'graph', 'kraft']);
const PRINTLIKE_DOMAINS = new Set(['editorial', 'creative', 'beauty', 'hospitality', 'finance', 'public', 'professional', 'events']);
/** Where the words carry the first screen better than a product picture. */
const STATEMENT_DOMAINS = new Set(['creative', 'editorial', 'public', 'events']);
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
  beauty: { name: 'The objects as a set', how: 'A quiet statement or split hero, then three art panels or photographs at one ratio with a didone headline. Wide margins; hairlines, not boxes.' },
  hospitality: { name: 'A place you can find', how: 'A type-led hero with one large art panel or photograph, "open now" said in words, and the booking bar in a tinted band halfway down.' },
  editorial: { name: 'Set like print', how: 'A statement hero, numbered sections and hairline rules. One reading column; pull one figure or quote out large per screen.' },
  creative: { name: 'The work, large', how: 'A statement hero and a project grid where the first project spans two columns. Captions small and mono; almost no chrome.' },
  playful: { name: 'One friendly object', how: 'Big rounded shapes, one bright accent, a chunky primary button and a device-frame or illustration-free art panel. Motion only on press.' },
  media: { name: 'The thing itself', how: 'The player or the latest episode is the hero. Dark canvas, one accent, chapter rows, no feature grid.' },
  property: { name: 'Plain numbers', how: 'A calculator or a figure in the hero that answers the visitor\'s first question, then facts as a description-list. Reassuring tone, no urgency.' },
  social: { name: 'People, not chrome', how: 'Real-looking content (a thread, a list of people) in a device-frame carries the hero. One loud accent, used on actions only.' },
  professional: { name: 'Plain terms', how: 'Services and fees as ruled rows with the price in its own column, named people with the registration that matters, serif headings and hairlines. Nothing decorative: the plainness is the reassurance.' },
  trades: { name: 'The job, the price, the phone', how: 'The phone number in the bar and under the headline, call-out fees and common jobs as ruled rows with prices, the area covered said in words. Bold, plain type; one photograph of real work or an art panel.' },
  events: { name: 'The date, large', how: 'A statement hero with the date and the place above the headline and three figures under it, then the programme as timed rows with mono times. Hairlines and numbered sections; no countdown.' },
  travel: { name: 'Dates and a place', how: 'A booking bar in the hero with dates and guests, art panels or photographs at one ratio, prices in full.' },
};
SIGNATURES.cause = { name: 'The claim and the proof', how: 'A statement hero that says what you do as a plain fact with three true figures under it, then one bar that shows where each pound goes. Hairlines and numbered sections; no photographs of people in distress.' };
/** Some pages have their signature whatever the subject's domain; others accept only the domains that suit them. */
SIGNATURES.about = { name: 'Who, since when, and why', how: 'A statement hero that makes a claim someone could disagree with, the story as prose beside a rail, then the people by name. Dates and places, not adjectives; no stock team photographs.' };
const TYPE_SIGNATURE = { about: 'about', event: 'events', cause: 'cause', venue: 'hospitality', portfolio: 'creative', 'dev-landing': 'devtool' };
const TYPE_DOMAINS = { 'service-landing': ['health', 'professional', 'trades', 'beauty'], 'brand-landing': ['commerce', 'beauty'] };
const signatureFor = (type, domain) => {
  if (TYPE_SIGNATURE[type.id]) return SIGNATURES[TYPE_SIGNATURE[type.id]];
  const allowed = TYPE_DOMAINS[type.id];
  if (allowed) return SIGNATURES[allowed.includes(domain?.id) ? domain.id : allowed[allowed.length > 2 ? 1 : 0]];
  return SIGNATURES[domain?.id] ?? DEFAULT_SIGNATURE;
};
const DEFAULT_SIGNATURE = { name: 'One clear picture', how: 'Choose one thing to show large in the first screen (the product\'s real screen in a device-frame, one chart, or a statement headline) and let every other section be quieter than it.' };

/**
 * @param {{ type: any, domain: any, profile: any, sections: any[], uiIds: Set<string> }} input
 */
export function direct({ type, domain, profile, sections, uiIds }) {
  const marketing = type.kind === 'marketing';
  const style = profile.style ?? null;
  const printlike = (style && PRINTLIKE_STYLES.has(style)) || (!style && (PRINTLIKE_DOMAINS.has(domain?.id) || ['event', 'cause'].includes(type.id)));
  const signature = signatureFor(type, domain);

  // Hero: swap in the statement hero where words carry the first screen.
  const heroSection = sections.find((s) => /^hero-/.test(s.id ?? ''));
  let hero = heroSection?.id ?? null, heroWhy = null;
  if (marketing && heroSection && uiIds.has('hero-statement') && type.id !== 'dev-landing' && (STATEMENT_DOMAINS.has(domain?.id) || STATEMENT_STYLES.has(style))) {
    hero = 'hero-statement';
    heroWhy = 'the words carry this first screen better than a picture would';
  }

  // Layouts: walk the sections in order, taking each block's most distinctive layout whose shape differs
  // from the section before it. Rails are capped at two a page; centred sections never touch.
  const layouts = [];
  let prev = hero ? (FIXED_SHAPE[hero] ?? 'left') : null, prev2 = null, rails = 0;
  const step = (shape) => { prev2 = prev; prev = shape; };
  for (const s of sections) {
    // A section with no ready-made part is a plain section; the page type may say how it is laid out.
    if (!s.id && marketing && s.layout) { const shape = SHAPE[s.layout] ?? 'left'; if (s.layout === 'rail') rails++; layouts.push({ n: s.n, id: null, role: s.role, layout: s.layout, shape }); step(shape); continue; }
    if (!s.id || /^(navbar|hero|footer|site-footer|floating|breadcrumbs|sticky-action)/.test(s.id)) { layouts.push(null); continue; }
    const options = LAYOUTS[s.id];
    if (!options) {
      // A part that is not a section block sits in a plain section (heading on top). Two of those may
      // follow each other; a third takes the rail so the page does not become one shape repeated.
      let shape = FIXED_SHAPE[s.id] ?? 'left', layout = null;
      if (marketing && !FIXED_SHAPE[s.id] && prev === 'left' && prev2 === 'left' && rails < 2) { layout = 'rail'; shape = 'rail'; rails++; }
      layouts.push({ n: s.n, id: s.id, layout, shape }); step(shape); continue;
    }
    let pick = options.find((l) => { const shape = l === 'default' ? (FIXED_SHAPE[s.id] ?? 'left') : SHAPE[l]; return shape !== prev && !(l === 'rail' && rails >= 2); }) ?? options[options.length - 1];
    if (!marketing) pick = 'default';
    const shape = pick === 'default' ? (FIXED_SHAPE[s.id] ?? 'left') : SHAPE[pick];
    if (pick === 'rail') rails++;
    layouts.push({ n: s.n, id: s.id, layout: pick === 'default' ? null : pick, shape });
    step(shape);
  }

  // Space: the hero and a lone quote breathe; proof strips sit tight against what they support.
  const space = (id) => (id === 'logo-cloud' ? 'tight' : id === 'quote-feature' ? 'open' : null);
  const sectionLayouts = layouts.filter(Boolean).map((l) => ({ ...l, space: space(l.id) }));

  const mainAttrs = marketing ? [printlike ? 'data-separators="rules"' : null, printlike && sectionLayouts.length >= 3 ? 'data-numbered' : null].filter(Boolean) : [];
  const accent = marketing
    ? 'The accent appears on the primary button, the small section labels and at most one thing in the hero (a chart series, an art panel, a trace). Everything else is ink, secondary ink and hairlines.'
    : 'The accent marks the one primary action and the current selection. Status colours mean status only. Everything else is ink and hairlines.';
  const type_ = marketing
    ? 'Three sizes carry the page: the headline, section headings (one size, every section) and body. Labels are the fourth, small and uppercase. If a fifth size appears, remove it.'
    : 'Two sizes carry the screen: 14–15px for everything people read and scan, one larger size for the page title and key figures.';
  const rhythm = marketing
    ? `${printlike ? 'Sections are divided by hairlines; do not also tint bands.' : 'Alternate plain and tinted bands; never two tinted in a row.'} Shapes in order: ${sectionLayouts.map((l) => l.shape).join(' → ')}. No two neighbours share a shape.`
    : 'One primary view fills the screen; chrome stays quiet. Group with space and hairlines before reaching for cards.';
  return { signature, hero, heroWhy, mainAttrs, printlike, sectionLayouts, accent, type: type_, rhythm };
}

/** The attribute string to put on a section for its assigned layout and space. */
export const sectionAttrs = (l) => [l?.layout ? `data-layout="${l.layout}"` : null, l?.space ? `data-space="${l.space}"` : null].filter(Boolean).join(' ');
