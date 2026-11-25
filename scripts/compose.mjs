#!/usr/bin/env node
// Turn a one-line brief into a page plan: the design brief to confirm, the taste profile, the
// sections in order (with real catalog ids and a copy formula for each), the states to build,
// what to avoid, and the exact install and audit commands.
//
//   node scripts/compose.mjs "landing page for an invoicing tool for freelancers"
//   node scripts/compose.mjs "dark admin users table for a devtool" --framework react --project /abs/app
//   node scripts/compose.mjs "pricing page" --type pricing --json
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { search } from './lib/search-core.mjs';
import { direct, sectionAttrs } from './lib/art-direction.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); if (i < 0) return def; const v = args[i + 1]; args.splice(i, 2); return v; };
const flag = (name) => { const i = args.indexOf(`--${name}`); if (i < 0) return false; args.splice(i, 1); return true; };
const asJson = flag('json');
const writeDraft = flag('write');
const forceType = opt('type', null);
const framework = opt('framework', 'static');
const project = opt('project', '/abs/app');
const brief = args.join(' ').trim();
if (!brief && !forceType) {
  console.error('Usage: node scripts/compose.mjs "<one-line brief>" [--type <page-type>] [--framework static|vanilla|react] [--project /abs/app] [--write] [--json]');
  process.exit(2);
}

const kb = JSON.parse(readFileSync(join(root, 'engine/compose/page-types.json'), 'utf8'));
const cat = JSON.parse(readFileSync(join(root, 'catalog.json'), 'utf8'));
const uiIds = new Set(cat.ui.map((u) => u.id));
const blueprintIds = new Set(cat.blueprints.map((b) => b.id));
const text = ` ${brief.toLowerCase().replace(/[^a-z0-9'’-]+/g, ' ')} `;
const has = (phrase) => text.includes(` ${phrase.toLowerCase()} `);

// ---------------------------------------------------------------- page type
function pickType() {
  if (forceType) {
    const t = kb.pageTypes.find((p) => p.id === forceType);
    if (!t) { console.error(`Unknown --type ${forceType}. One of: ${kb.pageTypes.map((p) => p.id).join(', ')}`); process.exit(2); }
    return { type: t, confident: true };
  }
  const scored = kb.pageTypes.map((t) => {
    let s = 0;
    for (const a of [t.id.replace(/-/g, ' '), ...t.aliases]) if (has(a)) s += 2 + a.split(' ').length * 2 + 3 * (1 - text.indexOf(` ${a.toLowerCase()} `) / text.length);
    return { t, s };
  }).sort((a, b) => b.s - a.s);
  if (scored[0].s > 0) return { type: scored[0].t, confident: true, runnerUp: scored[1].s > 0 ? scored[1].t : null };
  // Fall back to catalog search over blueprints, then to a landing page.
  const hit = search(cat, brief, { kind: 'blueprint', limit: 1 })[0];
  const viaBp = hit && kb.pageTypes.find((t) => t.blueprint === hit.d.id);
  return { type: viaBp ?? kb.pageTypes.find((t) => t.id === 'landing'), confident: false };
}
const picked = pickType();
let { type } = picked;
const { confident, runnerUp } = picked;

// ---------------------------------------------------------------- domain, mood, profile
const any = (list) => list.some(has);
// Is the thing being made software? "A booking app for clinics" is a product page; "a clinic" is not.
const software = any(['app', 'apps', 'software', 'saas', 'platform', 'tool', 'tools', 'api', 'sdk', 'dashboard', 'plugin', 'extension', 'chatbot', 'crm', 'startup']);
const domainScores = kb.domains.filter((d) => !(software && d.service)).map((d) => ({ d, s: d.words.filter((w) => has(w)).length })).sort((a, b) => b.s - a.s);
const domain = domainScores[0].s > 0 ? domainScores[0].d : null;
// A landing page is not always for software, and each kind of subject has its own page: a developer product
// gets code, a terminal and an API; a practice or a trade gets services with fees, people and how to find
// them; a place gets what is on offer, booking and opening hours; a maker gets the range and a price; a
// charity gets the claim, where the money goes and ways to help; an event gets the date, the programme and
// tickets; a studio gets its work. --type overrides all of this.
if (type.id === 'landing' && !forceType) {
  const cause = any(['charity', 'charities', 'nonprofit', 'non-profit', 'food bank', 'foodbank', 'donate', 'donation', 'donations', 'fundraising', 'fundraiser', 'volunteer', 'volunteers', 'foundation', 'community group', 'campaign']);
  const practice = any(['dentist', 'dentists', 'dental', 'clinic', 'clinics', 'physio', 'physiotherapy', 'physiotherapist', 'osteopath', 'chiropractor', 'optician', 'opticians', 'vet', 'vets', 'veterinary', 'salon', 'barber', 'barbers', 'hairdresser', 'spa', 'yoga', 'pilates', 'gym', 'personal trainer', 'therapist', 'counselling', 'counsellor', 'doctor', 'doctors', 'gp', 'practice', 'appointment', 'appointments']);
  const place = any(['restaurant', 'restaurants', 'cafe', 'café', 'bakery', 'distillery', 'brewery', 'winery', 'hotel', 'venue', 'museum', 'gallery', 'tour', 'tours', 'pub', 'bar', 'bistro', 'visit', 'visiting', 'opening hours', 'book a table', 'book a tour']);
  const occasion = any(['conference', 'conferences', 'summit', 'festival', 'meetup', 'meetups', 'hackathon', 'retreat', 'exhibition', 'workshop', 'workshops', 'event', 'events', 'wedding website', 'wedding site', 'wedding page', 'our wedding', 'wedding invitation']);
  const swap = domain?.id === 'devtool' ? 'dev-landing'
    : software ? null
    : occasion || domain?.id === 'events' ? 'event'
    : cause ? 'cause'
    : ['professional', 'trades'].includes(domain?.id) || practice ? 'service-landing'
    : domain?.id === 'hospitality' || place ? 'venue'
    : ['commerce', 'beauty'].includes(domain?.id) ? 'brand-landing'
    : domain?.id === 'creative' ? 'portfolio'
    : null;
  if (swap) type = kb.pageTypes.find((t) => t.id === swap) ?? type;
}
const moodHits = Object.entries(kb.moods).filter(([w]) => has(w));
const mood = Object.assign({}, ...moodHits.map(([, v]) => v));
// A style is applied only when the brief names a mood; the domain's style is offered, not imposed.
const explicitStyle = Object.prototype.hasOwnProperty.call(mood, 'style') ? mood.style : search(cat, brief, { kind: 'style', limit: 1 }).find((x) => x.s > 14)?.d.id ?? null;
const defaults = { marketing: ['slate-forest', 'precision'], app: ['slate-forest', 'precision'], reading: ['paper-ink', 'editorial'], flow: ['slate-forest', 'precision'] }[type.kind];
const profile = {
  palette: domain?.palette ?? defaults[0],
  mode: mood.mode ?? domain?.mode ?? 'light',
  typography: mood.typography ?? domain?.typography ?? defaults[1],
  density: mood.density ?? type.density,
  style: explicitStyle ?? null,
};
const styleOffer = !profile.style && domain?.style ? domain.style : null;

// ---------------------------------------------------------------- product name for copy
const quoted = brief.match(/["“']([^"”']{2,40})["”']/)?.[1];
// A name is one to five capitalised words, joined by "&", "and", "of" or "the": Tally, Harrow & Finch, Canal Street Food Bank.
const NAME = "[A-Z][\\w.'’-]*(?:\\s+(?:(?:&|and|of|the)\\s+)?[A-Z][\\w.'’-]*){0,4}";
const named = brief.match(new RegExp(`\\b(?:called|named)\\s+(${NAME})`))?.[1];
// "…for Tally, an invoicing tool" / "…for Beacon." : a capitalised name after "for", not a generic word.
const GENERIC = new Set(['A', 'An', 'The', 'Our', 'My', 'Your', 'Their', 'This', 'That', 'Every', 'Each', 'Teams', 'People', 'Developers', 'Freelancers']);
const afterFor = [...brief.matchAll(new RegExp(`\\bfor\\s+(${NAME})(?=[\\s,.;:)]|$)`, 'g'))].map((m) => m[1]).find((w) => !GENERIC.has(w.split(' ')[0]));
const leading = brief.match(new RegExp(`^(${NAME}),\\s+(?:an?|the)\\s`))?.[1];
const product = quoted ?? named ?? afterFor ?? leading ?? null;
const restyle = (kb.restyle?.words ?? []).some((w) => text.includes(` ${w} `) || text.includes(` ${w}`));

// ---------------------------------------------------------------- plan
const sections = type.sections.map((s, i) => ({ n: i + 1, ...s, exists: !s.id || uiIds.has(s.id) }));
// Developer products show code: a code-block figure takes the place of the hero's product frame.
// Art direction: one signature, a hero, a layout for each section and where colour and type may go.
const art = direct({ type, domain, profile, sections, uiIds });
if (art.hero && art.hero !== sections.find((x) => /^hero-/.test(x.id ?? ''))?.id) for (const x of sections) if (/^hero-/.test(x.id ?? '')) { x.alt = [...new Set([x.id, ...(x.alt ?? [])])]; x.id = art.hero; x.rule = `${x.rule ?? ''} Chosen because ${art.heroWhy}; use ${x.alt[0]} instead if there is a real product screen or photograph to show.${sections.some((y) => y.id === 'stats-band') ? ' Leave its three facts out: this page has a figures section, and figures are shown once.' : ''}`.trim(); }
const layoutOf = (n) => art.sectionLayouts.find((l) => l.n === n) ?? null;
const wantsCode = type.kind === 'marketing' && (domain?.id === 'devtool' || has('code') || has('show code'));
const components = [...new Set([...sections.filter((s) => s.id && !s.optional).map((s) => s.id), ...(wantsCode ? ['code-block'] : [])])].filter((id) => uiIds.has(id));
const charts = type.charts ?? [];
const blueprint = type.blueprint && blueprintIds.has(type.blueprint) ? type.blueprint : null;
const flags = [`--palette ${profile.palette}`, `--mode ${profile.mode}`, `--type ${profile.typography}`, `--density ${profile.density}`, profile.style ? `--style ${profile.style}` : null].filter(Boolean).join(' ');
const base = `node scripts/install-taste.mjs --project ${project} --framework ${framework} ${flags}`;
const installSnippets = `${base} \\\n  --components ${components.join(',')}${charts.length ? ` --charts ${charts.join(',')}` : ''}`;
const installBlueprint = blueprint ? `${base} --blueprints ${blueprint}` : null;
// One way to start, not two: a blueprint when it already is this page, snippets when the plan differs from it.
const startWith = blueprint && type.start !== 'snippets' ? 'blueprint' : 'snippets';
const install = startWith === 'blueprint' ? installBlueprint : installSnippets;
// ---------------------------------------------------------------- three looks, and the few questions worth asking
const styleDefs = JSON.parse(readFileSync(join(root, 'tokens/styles/source.json'), 'utf8')).styles;
const saidMode = mood.mode ?? (has('black') ? 'dark' : has('light') || has('white') || has('bright') ? 'light' : null);
// A look is a style, optionally with a palette (and type) other than the style's own: "atelier@bone-plum".
const lookOf = (key, type = null) => {
  const [id, palette] = String(key).split('@');
  const st = styleDefs.find((x) => x.id === id);
  if (!st) return null;
  const pal = palette && palette !== st.palette ? cat.palettes.find((p) => p.id === palette) : null;
  return { key: pal ? `${id}@${palette}` : id, id, palette: pal ? palette : st.palette, type: type ?? st.type, name: pal ? `${st.name} in ${pal.name}` : st.name, summary: pal ? `${st.summary} Shown here in ${pal.name} instead of the style's own palette.` : st.summary, mode: st.mode };
};
// When the brief names a style, look A is exactly what the install command below produces: that style with
// this profile's palette and type. The other two are the domain's alternatives.
let looks = [profile.style ? lookOf(`${profile.style}@${profile.palette}`, profile.typography) : null, ...[...(kb.directions[domain?.id] ?? []), ...kb.directions.default].map((k) => lookOf(k))].filter(Boolean);
looks = looks.filter((l, i) => looks.findIndex((x) => x.id === l.id) === i);
if (saidMode) {
  // A brief that says dark only gets dark looks (and the same for light).
  const same = looks.filter((l) => l.mode === saidMode);
  looks = [...same, ...styleDefs.filter((st) => st.mode === saidMode && !same.some((l) => l.id === st.id)).map((st) => lookOf(st.id))];
}
looks = looks.slice(0, 3);
const directions = {
  styles: looks,
  command: `node scripts/directions.mjs ${JSON.stringify(brief || type.name)} --out ${project === '/abs/app' ? './lumina-directions' : join(project, 'lumina-directions')}`,
};
// Ask only what the brief leaves open, most useful first, three at most. Everything else has a sound default.
const saysAction = ['sign up', 'signup', 'waitlist', 'demo', 'buy', 'install', 'download', 'subscribe', 'contact', 'book', 'trial', 'donate', 'apply', 'shop', 'order', 'reserve', 'action', 'booking', 'appointment', 'appointments', 'tour', 'cta', 'enquire', 'get a quote', 'join', 'register'].some(has);
const actionDefault = { commerce: 'one "Shop" or "Add to bag" action, with the price beside it', beauty: 'one "Shop" action, with the price beside it', hospitality: '"Book", leading to dates and party size', health: '"Book an appointment", with a phone number as the quiet alternative', travel: '"Check availability", with dates', property: '"Get a quote" or "Book a viewing"', media: '"Listen" or "Subscribe"', public: 'the one task the page exists for, as a verb ("Apply", "Renew")' }[domain?.id] ?? 'a free start ("Start free"), with a quieter second link to a demo or the docs';
const typeAction = { event: '"Get a ticket", with the price in the button', cause: '"Donate"; if people also come here for help, that route is the first button in the hero and Donate stays in the bar', 'service-landing': '"Book a call" or "Book an appointment", with the phone number beside it; a mailto: or tel: link is a real action when there is no booking system', 'brand-landing': 'one "Shop" action, with the price beside it', venue: '"Book" or "Plan your visit", leading to dates and party size', portfolio: '"Get in touch", leading to an email address', about: '"Contact us" or "See open roles"' }[type.id];
const questions = [
  restyle && { id: 'keep', ask: 'What must stay as it is (logo, brand colour, copy, layout)?', why: 'A restyle changes the surface; it should not move what people already know.', default: 'keep the content and structure, change tokens and components only' },
  !product && { id: 'product', ask: 'What is the product called, and what does it do in one line?', why: 'Sample names and sample numbers must not ship; the headline is written from this.', default: 'none: ask, or take the name from the repository or the existing site' },
  !profile.style && !restyle && { id: 'look', ask: `Which look fits: ${directions.styles.map((s, i) => `${'ABC'[i]} ${s.name}`).join(', ')}? (Render them side by side with the directions command and let the person point.)`, why: 'People choose a look faster by eye than from a description.', default: `the plain profile below (${profile.palette}, ${profile.typography}), no style` },
  ['marketing', 'flow'].includes(type.kind) && !saysAction && { id: 'action', ask: typeAction ? 'What is the one thing a visitor should do here: call, book, buy, give, come?' : 'What is the one thing a visitor should do here: start a trial, book a demo, join a waitlist, buy?', why: 'One primary action per screen; its label is the most-read words on the page.', default: typeAction ?? actionDefault },
  !saidMode && { id: 'mode', ask: 'Light, dark, or both with a switch?', why: 'Dark is a second design, not an inversion; it is cheaper to know now.', default: `${profile.mode}, with the other mode working` },
].filter(Boolean).slice(0, 3);

const typeAudience = { 'service-landing': 'people with a problem who are choosing whom to trust: they need what you do, what it costs and how to reach a person', cause: 'two readers: people who need help now, and people deciding whether to give; both need plain facts', event: 'people deciding whether to come: they need the date, the place, the programme and the price', venue: 'guests deciding where to go, who need what is on offer, the hours and a way to book', 'brand-landing': 'shoppers comparing, who need the object, the price, delivery and returns up front', portfolio: 'clients judging taste, so the work leads and words stay short', about: 'people checking who is behind this before they buy, apply or call' }[type.id];
const domainAudience = { finance: 'people who check figures and need to trust them', trading: 'people watching numbers change who need speed and density', devtool: 'developers who want the facts, the code and the limits', analytics: 'people who need one answer fast, then the detail', health: 'people who may be anxious and need calm, plain steps', public: 'anyone, on any device, including people with low vision or little time', commerce: 'shoppers comparing, who need the price, delivery and returns up front', editorial: 'readers who came to read, so the text comes first', productivity: 'teams who want to see the product working, not adjectives', creative: 'clients judging taste, so the work leads and words stay short', playful: 'families and younger users who need big targets and friendly words', enterprise: 'buyers and admins who need proof, controls and compliance', travel: 'people planning, who need dates, prices and photos they trust', beauty: 'people choosing with their eyes, so the product and its result lead and the words stay few', hospitality: 'guests deciding where to go, who need the menu or rooms, the hours and a way to book', media: 'listeners and viewers who came for the thing itself, so controls stay out of the way', property: 'people making a large, slow decision who need plain numbers and no pressure', social: 'people here for each other, so their content leads and the chrome stays quiet' };
const audience = typeAudience ?? (domain && domainAudience[domain.id]) ?? 'not clear from the brief: write one line (who they are, what they came to do) and state it with your plan';
const plan = {
  brief,
  pageType: { id: type.id, name: type.name, confident, alsoConsider: runnerUp?.id ?? null },
  designBrief: {
    audience,
    job: type.primary,
    readingPattern: { Z: 'Z-pattern: brand top-left, action top-right, alternate text and visuals.', F: 'F-pattern: most important figure or label top-left; labels left-aligned.', single: 'Single column: one reading column at 68ch.' }[type.pattern],
    density: profile.density,
    layout: type.layout,
    product: product ?? 'not named in the brief; ask or use the product\'s real name, never a placeholder',
  },
  profile,
  styleOffer,
  questions,
  directions,
  startWith,
  install,
  installAlternative: startWith === 'blueprint' ? installSnippets : installBlueprint,
  blueprint: blueprint ?? (type.blueprint ? `${type.blueprint} (not in this version; start from the sections below)` : null),
  artDirection: { signature: art.signature, mainAttributes: art.mainAttrs, sections: art.sectionLayouts.map((l) => ({ n: l.n, id: l.id, layout: l.layout, space: l.space, attributes: sectionAttrs(l) })), accent: art.accent, type: art.type, rhythm: art.rhythm, words: art.words, motion: art.motion },
  sections,
  charts,
  restyle: restyle ? kb.restyle.notes : null,
  states: type.states,
  avoid: type.avoid,
  finish: [
    'Replace every sample string with the product\'s real words and numbers.',
    'node scripts/lint-copy.mjs <src>',
    'node scripts/audit-ui.mjs <url> --taste   (0 errors and a taste score of 90 or more, at 390px and 1440px, light and dark)',
  ],
};

// ---------------------------------------------------------------- --write: a composed first draft
// Installs what the plan needs and writes the page itself: sections in order with their layouts, tones and
// ids applied, the navigation pointing at them, and the art direction on <main>. Every sentence in it is
// still sample copy; the plan below says what each section should say instead.
let draft = null;
if (writeDraft) {
  if (project === '/abs/app') { console.error('--write needs --project <the folder the page should live in>.'); process.exit(2); }
  if (framework !== 'static') { console.error('--write produces a plain HTML draft: use it with --framework static (the default).'); process.exit(2); }
  const dir = resolve(project);
  mkdirSync(dir, { recursive: true });
  const run = (cmd, extra = []) => { const parts = cmd.replace(/\\\n\s*/g, ' ').replace(`--project ${project}`, '--project \u0000').split(/\s+/).slice(1).map((a) => (a === '\u0000' ? dir : a)); const r = spawnSync(process.execPath, [...parts, ...extra], { cwd: root, encoding: 'utf8' }); if (r.status !== 0 && r.status !== 3) { console.error(r.stderr || r.stdout); process.exit(1); } return r.stdout; };
  if (startWith === 'blueprint') {
    const out = run(installBlueprint, product ? ['--name', product] : []);
    draft = { path: join(dir, /written to (\S+)\/ instead/.exec(out)?.[1] ?? '', 'index.html'), kind: 'blueprint' };
  } else {
    // Proof from other people (logos, quotes, reviews) is never drafted: it has to be real.
    const PROOF = new Set(['logo-cloud', 'testimonial-grid', 'quote-feature', 'review-summary']);
    const SLUG = { 'feature-split': 'features', 'feature-grid': 'features', 'bento-grid': 'features', 'how-it-works': 'how', 'stats-band': 'figures', 'faq-section': 'questions', 'cta-band': 'start', 'pricing-tiers': 'pricing', 'offer-cards': 'range', 'visit-info': 'visit', 'booking-bar': 'book', 'contact-section': 'contact', 'team-grid': 'team', 'blog-grid': 'posts', 'project-grid': 'work', 'integrations-grid': 'integrations', 'code-block': 'code', 'terminal-window': 'quickstart', 'api-endpoint': 'api', 'description-list': 'details', 'comparison-table': 'compare', 'newsletter-signup': 'newsletter', 'sticky-story': 'story', 'showcase-tabs': 'examples' };
    const LABEL = { features: 'Features', how: 'How it works', figures: 'In numbers', questions: 'Questions', pricing: 'Pricing', range: 'The range', visit: 'Visit', book: 'Book', contact: 'Contact', team: 'Team', posts: 'Writing', work: 'Work', integrations: 'Integrations', code: 'Code', quickstart: 'Quickstart', api: 'API', details: 'Details', compare: 'Compare', story: 'How it works', examples: 'Examples' };
    const isChrome = (id) => /^(navbar|footer|site-footer|floating-pill-nav|hide-on-scroll)/.test(id);
    const picked = sections.filter((x) => (x.id ? uiIds.has(x.id) : type.kind === 'marketing' && x.role && x.copy) && !(x.optional && PROOF.has(x.id))).map((x) => ({ ...x, id: x.id === 'navbar-mega' && (x.alt ?? []).includes('navbar-simple') ? 'navbar-simple' : x.id }));
    const ids = [...new Set([...picked.map((x) => x.id).filter(Boolean), 'button'])];
    run(`${base} --components ${ids.join(',')}${charts.length ? ` --charts ${charts.join(',')}` : ''}`);
    const kit = join(dir, 'lumina-taste');
    const snippet = (id) => readFileSync(join(kit, 'snippets', `${id}.html`), 'utf8').replace(/<!--[\s\S]*?-->\n?/, '').trim();
    const family = (id) => cat.ui.find((u) => u.id === id)?.family;
    const anchors = [];
    const body = [];
    let lastTone = null;
    const slugOf = (role) => role.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    for (const x of picked.filter((y) => !y.id || !isChrome(y.id))) {
      if (!x.id) {
        // Nothing ready-made fits this section: a plain section with the heading in place and the brief for its words.
        const slug = slugOf(x.role), lay = layoutOf(x.n);
        anchors.push({ slug, label: x.role });
        body.push(`${x.optional ? `<!-- Optional (${x.role}): keep it only if you have the real content for it. -->\n` : ''}<section class="lt-section" id="${slug}"${lay ? ' ' + sectionAttrs(lay) : ''} aria-labelledby="h-${slug}">\n  <header><h2 id="h-${slug}">${x.role}</h2></header>\n  <div class="lt-prose"><p>TODO: ${x.copy}</p></div>\n</section>`);
        continue;
      }
      let html = snippet(x.id);
      const hero = /^hero-/.test(x.id);
      // Figures are shown once: when the page has a figures section, the statement hero leaves its three facts out.
      if (x.id === 'hero-statement' && picked.some((y) => y.id === 'stats-band')) html = html.replace(/\s*<dl data-part="facts">[\s\S]*?<\/dl>/, '');
      const slug = hero ? 'top' : SLUG[x.id] ?? slugOf(x.role ?? x.id);
      const lay = layoutOf(x.n);
      // Never two tinted bands in a row: a tone that would touch the last one is dropped (a dark band always stays).
      const tone = x.tone && (!art.printlike || x.tone === 'dark') && (x.tone === 'dark' || !lastTone) ? x.tone : null;
      lastTone = tone;
      const attrs = [slug && !/^<\w+[^>]*\sid=/.test(html) ? `id="${slug}"` : null, hero ? 'data-entrance' : null, tone ? `data-tone="${tone}"` : null, lay ? sectionAttrs(lay) : null].filter(Boolean).join(' ');
      if (family(x.id) === 'blocks') {
        html = html.replace(/^<(section|div|footer)\b([^>]*)>/, (m, tag, rest) => `<${tag}${rest.replace(/\sid="[^"]*"/, slug ? '' : '$&').replace(/\sdata-tone="[^"]*"/, tone ? '' : '$&')}${attrs ? ' ' + attrs : ''}>`);
      } else {
        // Not a section block: give it the same band, container and heading as one.
        html = `<section class="lt-section"${attrs ? ' ' + attrs : ''} aria-labelledby="h-${slug ?? x.n}">\n  <header><h2 id="h-${slug ?? x.n}">${x.role}</h2></header>\n  ${html.split('\n').join('\n  ')}\n</section>`;
      }
      if (slug && slug !== 'top' && !anchors.some((a) => a.slug === slug)) anchors.push({ slug, label: LABEL[slug] ?? x.role ?? slug });
      // The small label above the heading says what the plan calls this section, so the draft reads in the plan's order.
      if (!hero && x.role && !LABEL[slug]) html = html.replace(/(<(?:p|h2)[^>]*data-part="eyebrow"[^>]*>)[^<]*/, `$1${x.role}`);
      body.push(`${x.optional ? `<!-- Optional (${x.role}): keep it only if you have the real content for it. -->\n` : ''}${html}`);
    }
    // Navigation and footer: links point at the sections that exist; nothing points nowhere.
    const action = anchors.some((a) => a.slug === 'start') ? '#start' : anchors.some((a) => a.slug === 'book') ? '#book' : anchors.some((a) => a.slug === 'contact') ? '#contact' : '#top';
    const links = anchors.filter((a) => `#${a.slug}` !== action).slice(0, 4);
    const li = links.map((a) => `<li><a href="#${a.slug}">${a.label}</a></li>`).join('');

    const pill = (html) => html.replace(/(<span data-part="hover"[^>]*><\/span>)[\s\S]*?(<a [^>]*data-part="cta")/, (m, hover, cta) => `${hover}\n  ${links.map((l, i) => `<a href="#${l.slug}"${i === 0 ? ' aria-current="true"' : ''}>${l.label}</a>`).join('\n  ')}\n  ${cta}`).replace(/<a href="#[^"]*"( data-part="cta")/, `<a href="${action}"$1`);
    const footCols = (html) => html.replace(/(<nav data-part="cols"[^>]*>)[\s\S]*?(<\/nav>)/, (m, open, close) => `${open}\n      <div><h2>On this page</h2><ul>${anchors.slice(0, 5).map((a) => `<li><a href="#${a.slug}">${a.label}</a></li>`).join('')}</ul></div>\n      <div><h2>Legal</h2><ul><li><a href="/privacy">Privacy</a></li><li><a href="/terms">Terms</a></li></ul></div>\n    ${close}`);
    const chrome = (id) => footCols(pill(snippet(id))).replace(/<ul data-part="links">[\s\S]*?<\/ul>/, `<ul data-part="links">${li}</ul>`).replace(/(<div[^>]*data-part="panel"[^>]*>)<ul>[\s\S]*?<\/ul>/, `$1<ul>${li}</ul>`).replace(/href="#home"/g, 'href="#top"').replace(/href="#start"/g, `href="${action}"`).replace(/<a href="#signin"[^>]*>[^<]*<\/a>/g, '');
    const top = picked.filter((y) => /^(navbar|floating-pill-nav|hide-on-scroll)/.test(y.id ?? '')).map((y) => chrome(y.id)).join('\n');
    const foot = picked.filter((y) => /footer/.test(y.id ?? '')).map((y) => chrome(y.id)).join('\n');
    const htmlAttrs = `data-palette="${profile.palette}" data-mode="${profile.mode}" data-type="${profile.typography}" data-density="${profile.density}" data-radius="balanced" data-motion="snappy"${profile.style ? ` data-style="${profile.style}"` : ''}`;
    let page = `<!doctype html>\n<html lang="en" ${htmlAttrs}>\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>${product ?? 'TODO: page title'}</title>\n  <meta name="description" content="TODO: one sentence that says what this page is, for search results and link previews.">\n  <!-- lumina-taste draft for: ${brief.replace(/--/g, '–')}. Every sentence, name, number and link target below is sample content: rewrite all of it. -->\n  <link rel="stylesheet" href="lumina-taste/lumina.css">\n  <script defer src="lumina-taste/lumina.js"></script>\n</head>\n<body>\n${top}\n<main id="main"${art.mainAttrs.length ? ' ' + art.mainAttrs.join(' ') : ''}>\n${body.join('\n\n')}\n</main>\n${foot}\n</body>\n</html>\n`;
    // A button that led to one of the sample's pages: the primary one takes this page's action, the others go.
    { const have = new Set([...page.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
      page = page.replace(/<a class="lt-btn"([^>]*)href="#([^"]+)"([^>]*)>([\s\S]*?)<\/a>/g, (m, pre, target, post, inner) => have.has(target) ? m : /data-variant="primary"/.test(pre + post) ? `<a class="lt-btn"${pre}href="${action}"${post}>${inner}</a>` : ''); }
    if (product) page = page.replaceAll('Halyard', product).replaceAll('halyard', product.toLowerCase().replace(/[^a-z0-9]+/g, ''));
    const MARK = '<!-- lumina-taste draft for:';
    const target = existsSync(join(dir, 'index.html')) && !readFileSync(join(dir, 'index.html'), 'utf8').includes(MARK) ? join(dir, 'index.draft.html') : join(dir, 'index.html');
    writeFileSync(target, page);
    draft = { path: target, kind: 'snippets', sections: picked.filter((y) => !y.id || !isChrome(y.id)).map((y) => y.id ?? slugOf(y.role)), left: sections.filter((x) => x.optional && PROOF.has(x.id ?? '')).map((x) => x.id) };
  }
  plan.draft = { ...draft, path: relative(process.cwd(), draft.path) || draft.path };
}

// No process.exit() here: exiting straight after a large write can cut piped output short.
if (asJson) console.log(JSON.stringify(plan, null, 2));
else printPlan();

function printPlan() {

// ---------------------------------------------------------------- markdown
const L = [];
let h = 0; const H = (title) => `## ${++h}. ${title}`;
L.push(`# Page plan: ${type.name}`, '', `> ${brief || `--type ${type.id}`}`, '');
if (!confident) L.push(`Page type guessed from the catalog. If this is wrong, rerun with \`--type <id>\` (${kb.pageTypes.map((p) => p.id).join(', ')}).`, '');
else if (runnerUp) L.push(`Also close: \`${runnerUp.id}\`. Rerun with \`--type ${runnerUp.id}\` if that fits better.`, '');
if (draft) L.push(draft.kind === 'blueprint'
  ? `**A first draft is written: \`${draft.path}\`** (the \`${blueprint}\` blueprint, themed with this profile). Everything in it is sample content. Rewrite it section by section with the plan below, then do the detail pass and audit.`
  : `**A first draft is written: \`${draft.path}\`.** It has the sections below in order, with their layouts, bands, ids and navigation already applied, and the art direction on \`<main>\`. Every sentence, name and number in it is sample copy: rewrite each section with its copy formula below.${draft.left.length ? ` Not drafted, because they need real material from the user: ${draft.left.map((x) => `\`${x}\``).join(', ')}.` : ''}`, '');
L.push(H('Design brief (confirm before writing code)'), '');
L.push(`- **Audience:** ${plan.designBrief.audience}`);
L.push(`- **Product:** ${plan.designBrief.product}`);
L.push(`- **Primary action:** ${type.primary}`);
L.push(`- **Reading pattern:** ${plan.designBrief.readingPattern}`);
L.push(`- **Layout:** ${type.layout}`);
L.push(`- **Density:** ${profile.density}`, '');
if (questions.length) {
  L.push(H('Ask first (only these)'), '', 'The brief leaves these open. Ask them in one short message, then build. If the answer is "you choose", take the default and say which you took. Do not ask anything else.', '');
  for (const q of questions) L.push(`- **${q.ask}** ${q.why} _Default: ${q.default}._`);
  L.push('');
  if (questions.some((q) => q.id === 'look')) L.push('To show the looks instead of describing them:', '', '```sh', directions.command, '```', '', `It writes one page with ${directions.styles.map((s) => s.name).join(', ')} on the same content. Open it, or send a screenshot, and ask for A, B or C.`, '');
}
L.push(H('Profile and install'), '');
L.push(`Palette \`${profile.palette}\` (${profile.mode}), type \`${profile.typography}\`, density \`${profile.density}\`${profile.style ? `, style \`${profile.style}\`` : ', no style'}.${domain ? ` Chosen for the ${domain.id} domain.` : ' No domain recognised, so these are the neutral defaults.'}`);
if (styleOffer) L.push(`If the brief wants more character, add \`--style ${styleOffer}\`.`);
L.push('', '```sh', install, '```', '');
if (startWith === 'blueprint') {
  const bpMeta = cat.blueprints.find((b) => b.id === blueprint);
  L.push(`**Start from the \`${blueprint}\` blueprint: it already is this page.** The command writes a complete page to \`<dest>/${blueprint}/\` (index.html, main.css, main.js; nothing else). Move those three files to where the page lives, then change the brand, words, numbers and currency. Keep its anatomy. It uses ${(bpMeta?.uses ?? []).map((u) => `\`${u}\``).join(', ')}.${bpMeta?.states?.length ? ` It also ships these states: ${bpMeta.states.map((s) => `\`?state=${s}\``).join(', ')}.` : ''}`, '');
  L.push(`Need a section it lacks? Add \`--components <ids>\` to the same command and link \`lumina.css\` and \`lumina.js\` after \`main.css\`. To build from parts instead:`, '', '```sh', installSnippets, '```', '');
} else {
  L.push('Build the page from the snippets this writes, in the section order below.' + (installBlueprint ? ` The \`${blueprint}\` blueprint is a finished example of a similar page (\`--blueprints ${blueprint}\`) if you want to see one, but its sections differ from this plan.` : ''), '');
}
if (restyle) { L.push(H('Restyling an existing page'), ''); for (const n of kb.restyle.notes) L.push(`- ${n}`); L.push(''); }
L.push(H('Art direction (what makes this page this page)'), '');
L.push(`- **Signature: ${art.signature.name}.** ${art.signature.how}`);
if (art.mainAttrs.length) L.push(`- **Page:** \`<main ${art.mainAttrs.join(' ')}>\`: ${art.printlike ? 'hairlines between sections and numbered labels, like a well-set document, and each section rises into place as it scrolls in. Do not tint bands as well.' : 'each section rises into place as it scrolls in.'}`);
L.push(`- **Rhythm:** ${art.rhythm}`);
L.push(`- **Words:** ${art.words}`);
L.push(`- **Motion:** ${art.motion}`);
L.push(`- **Colour:** ${art.accent}`);
L.push(`- **Type:** ${art.type}`);
L.push('- **Then the detail pass** in references/composition.md before you audit: alignment, line breaks, numbers, edges.', '');
L.push(H('Sections, in order'), '');
for (const s of sections) {
  const id = s.id ? `\`${s.id}\`` : '_(layout, no component)_';
  const alt = s.alt?.length ? ` (or ${s.alt.map((a) => `\`${a}\``).join(', ')})` : '';
  L.push(`${s.n}. **${s.role}**${s.optional ? ' _(optional)_' : ''}: ${id}${alt}`);
  if (s.copy) L.push(`   - Copy: ${s.copy}`);
  if (s.rule) L.push(`   - Rule: ${s.rule}`);
  if (wantsCode && type.id !== 'dev-landing' && /^hero-/.test(s.id ?? '')) L.push('   - Code: this is a developer product, so replace the product frame with a `code-block` figure (a real request and its response, 8–14 lines). Use `code-block` again wherever a feature is easier to show than to describe.');
  const lay = layoutOf(s.n);
  if (lay && sectionAttrs(lay)) L.push(`   - Layout: add \`${sectionAttrs(lay)}\` to this block (${lay.layout === 'rail' ? 'heading in a left rail that stays put, body on the right' : lay.layout === 'centre' ? 'heading centred above a symmetrical body' : lay.layout === 'split' ? 'heading left and its lede right, on one line' : lay.space === 'tight' ? 'it sits close to the section it supports' : 'more air: it stands alone'}).`);
  if (s.tone && !art.printlike) L.push(`   - Band: add \`data-tone="${s.tone}"\` to this block so the page alternates plain and tinted bands.`);
}
L.push('');
if (type.kind === 'marketing') L.push('Section blocks go straight inside `<main>`, one after another. Each centres its content in a 1180px container and pads itself by half of `--section-y`, so the gap between two sections is always `--section-y`; never wrap them in another band or container.' + (art.printlike ? ' This page uses hairlines between sections, so leave every band plain.' : ' Never tint two bands in a row.'), '');
if (charts.length) L.push(H('Charts'), '', `Start with ${charts.map((c) => `\`${c}\``).join(', ')}. Write each title as the takeaway first; check the pick in references/chart-selection.md.`, '');
if (type.states.length) { L.push(H('States to build'), ''); for (const s of type.states) L.push(`- ${s}`); L.push(''); }
L.push(H('Avoid'), ''); for (const a of type.avoid) L.push(`- ${a}`); L.push('');
L.push(H('Finish'), ''); for (const f of plan.finish) L.push(`- ${f.startsWith('node') ? '`' + f.replace(/\s{2,}\(.*$/, '') + '`' + (f.match(/\s{2,}(\(.*)$/)?.[1] ? ' ' + f.match(/\s{2,}(\(.*)$/)[1] : '') : f}`);
console.log(L.join('\n'));
}
