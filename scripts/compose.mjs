#!/usr/bin/env node
// Turn a one-line brief into a page plan: the design brief to confirm, the taste profile, the
// sections in order (with real catalog ids and a copy formula for each), the states to build,
// what to avoid, and the exact install and audit commands.
//
//   node scripts/compose.mjs "landing page for an invoicing tool for freelancers"
//   node scripts/compose.mjs "dark admin users table for a devtool" --framework react --project /abs/app
//   node scripts/compose.mjs "pricing page" --type pricing --json
//   node scripts/compose.mjs "home page for Kiln & Co, a pottery in Penryn" --brand-from ./logo.svg --project /abs/site --write
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { search } from './lib/search-core.mjs';
import { direct, sectionAttrs } from './lib/art-direction.mjs';
import { planRhythm, orderSections, rhythmStrip, checkRhythm, STRIP_KEY, PROOF, CHROME } from '../engine/compose/rhythm.mjs';
import { extractFacts, figuresFrom, heroCopy, askFor, openingHours } from '../engine/compose/words.mjs';
import { boldIdea, colourName } from '../engine/compose/idea.mjs';
import { brandFrom } from '../engine/compose/brand.mjs';
import { renderBand, navBar, footer as footerBar, heroPicture, pictureBand, pinnedSteps, sideScroll, motifFor, motifParts, sceneFor, sceneParts, isSoftware, itemsFrom } from '../engine/compose/bands.mjs';
import { splitMain, joinMain, idOfBlock, applyBeat, applyHeroCopy, heroIdeaPanel, setHeroVisual, setFacts, applyMediaIdea, applyClose, applyHours, ideaComment, esc } from '../engine/compose/draft.mjs';
import { pageModel, appFlow } from '../engine/compose/model.mjs';
import { composeHero, fitWords } from '../engine/compose/hero.mjs';
import { PAGES } from '../engine/compose/pages.mjs';
import { PAGE_SCRIPT } from '../engine/compose/page-script.mjs';
import { DRAFT_CSS } from '../engine/compose/page-css.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); if (i < 0) return def; const v = args[i + 1]; args.splice(i, 2); return v; };
const flag = (name) => { const i = args.indexOf(`--${name}`); if (i < 0) return false; args.splice(i, 1); return true; };
const asJson = flag('json');
const writeDraft = flag('write');
// --images: after --write, search openly licensed photographs for the draft's picture panels (find-images
// --fill). It downloads, so it is off unless asked for.
const withImages = flag('images');
// --type is the page type. A typeface is --typeface (or --font); --palette, --mode and --style set the look.
const forceTypeRaw = opt('type', null);
const lookFlags = { palette: opt('palette', null), typography: opt('typeface', null) ?? opt('typography', null) ?? opt('font', null), mode: opt('mode', null), style: opt('style', null) };
const brandSrc = opt('brand-from', null);
const framework = opt('framework', 'static');
const project = opt('project', '/abs/app');
// A flag the composer does not know would otherwise become words of the brief and land on the page.
const unknown = args.filter((a) => /^--[a-z]/.test(a));
if (unknown.length) { console.error(`Unknown option ${unknown.join(', ')}. Options: --type, --palette, --typeface, --mode, --style, --brand-from, --framework, --project, --write, --json, --images (run with no brief for the full usage).`); process.exit(2); }
const brief = args.join(' ').trim();
if (!brief && !forceTypeRaw) {
  console.error('Usage: node scripts/compose.mjs "<one-line brief>" [--type <page-type>] [--brand-from <#hex | logo.png|svg | site.html | url>] [--framework static|tailwind|next|vanilla|react] [--project /abs/app] [--write] [--json]');
  process.exit(2);
}

const kb = JSON.parse(readFileSync(join(root, 'engine/compose/page-types.json'), 'utf8'));
const TYPEFACES = new Set(JSON.parse(readFileSync(join(root, 'tokens/typography/source.json'), 'utf8')).pairings.map((t) => t.id));
let forceType = forceTypeRaw;
if (forceTypeRaw && !kb.pageTypes.some((t) => t.id === forceTypeRaw) && TYPEFACES.has(forceTypeRaw)) {
  // "--type editorial" from the installer's vocabulary: the person meant the typeface.
  lookFlags.typography ??= forceTypeRaw; forceType = null;
}
const cat = JSON.parse(readFileSync(join(root, 'catalog.json'), 'utf8'));
const uiIds = new Set(cat.ui.map((u) => u.id));
const blueprintIds = new Set(cat.blueprints.map((b) => b.id));
const text = ` ${brief.toLowerCase().replace(/[^a-z0-9'’-]+/g, ' ')} `;
const has = (phrase) => text.includes(` ${phrase.toLowerCase()} `);
// Words that name a thing, not a look: a "flat white" is a coffee, not the flat style.
const lookText = text.replace(/ (flat white|flat whites|long black|black coffee|black pudding|paper bags?|glass jars?) /g, ' ');
const hasLook = (phrase) => lookText.includes(` ${phrase.toLowerCase()} `);

// ---------------------------------------------------------------- page type
function pickType() {
  if (forceType) {
    const t = kb.pageTypes.find((p) => p.id === forceType);
    if (!t) { console.error(`Unknown --type ${forceType}. One of: ${kb.pageTypes.map((p) => p.id).join(', ')}`); process.exit(2); }
    return { type: t, confident: true };
  }
  const byId = (id) => kb.pageTypes.find((t) => t.id === id);
  // "Juniper bank app on the phone: balance, pots, settings": what the thing IS comes before the first colon
  // or comma; what follows is a list of features, and a feature called "settings" is not a settings page.
  const head = ` ${brief.toLowerCase().split(/[:,;—–]|\s-\s/)[0].replace(/[^a-z0-9'’-]+/g, ' ')} `;
  // A page the head names outright ("notes app pricing", "workspace settings") is that page.
  const headNames = kb.pageTypes.some((t) => t.id !== 'landing' && t.aliases.some((a) => !/\bapp\b/.test(a) && head.includes(` ${a} `)));
  // "A settings app", "settings-heavy app": the settings are the app, not a settings page of another one.
  if (/ settings(-heavy| heavy)? apps? /.test(head) && byId('app-settings')) return { type: byId('app-settings'), confident: true };
  if (/ apps? /.test(head) && !headNames && !/ (website|site|landing page|home page|homepage) /.test(head)) {
    const sells = / (a|per) (month|year|seat|user) | how it works | free trial | pricing | sign up | download | for (sole traders|teams|small businesses|freelancers) /.test(text);
    if (/ (api|sdk|sdks|cli) /.test(text) && sells) return { type: byId('dev-landing'), confident: true };
    if (sells) return { type: byId('landing'), confident: true };
    // An app whose subject has a blueprint of its own: a bank, a run, a chat, bookings, a settings-heavy tool.
    const own = / (bank|banking|money|wallet|budget|budgeting|savings) /.test(head) ? 'app-banking'
      : / (running|run|runner|fitness|workout|workouts|gym|training|exercise|cycling|swimming|steps) /.test(head) ? 'app-fitness'
      : / (chat|chats|messaging|messages|messenger|texting) /.test(head) ? 'app-messaging'
      : / (booking|bookings|appointment|appointments|reservation|reservations|classes) /.test(head) ? 'app-booking'
      : / (settings|preferences) /.test(head) ? 'app-settings' : null;
    if (own && byId(own)) return { type: byId(own), confident: true };
    if (/ (phone|mobile|ios|android|iphone) apps? /.test(head)) return { type: byId('app-phone'), confident: true };
    if (/ (on the phone|phone|mobile|ios|android|iphone) /.test(text)) return { type: byId('app-phone'), confident: true };
    if (/ (desktop|calendar|appointments|records|table|dispatch|rota|schedule|staff) /.test(text)) return { type: byId('workspace'), confident: true };
    return { type: byId('app-phone'), confident: true };
  }
  // "Kestrel Events API for product analytics": a developer product, whatever else its name says.
  if (/ (api|sdk|sdks) /.test(head) && !headNames) return { type: byId('dev-landing'), confident: true };
  const scored = kb.pageTypes.map((t) => {
    let s = 0;
    // "about" and "contact" are everyday words ("a podcast about cities", "send money to a contact"): only their aliases count.
    for (const a of [...(['about', 'contact'].includes(t.id) ? [] : [t.id.replace(/-/g, ' ')]), ...t.aliases]) if (has(a)) s += 2 + a.split(' ').length * 2 + 3 * (1 - text.indexOf(` ${a.toLowerCase()} `) / text.length);
    return { t, s };
  }).sort((a, b) => b.s - a.s);
  if (scored[0].s > 0) return { type: scored[0].t, confident: true, runnerUp: scored[1].s > 0 ? scored[1].t : null };
  // A one-line description of a business ("Sourdough bakery on Mill Lane…") names its subject, not a page:
  // that is a landing page, and the subject below decides which kind (a place, a practice, a maker…).
  if (kb.domains.some((d) => d.words.some(has)) || / (open|opening|from £|phone|book|visit|shop|studio|gym|bakery|ferry|ferries|sailings?) /.test(text)) return { type: byId('landing'), confident: false };
  // Otherwise fall back to catalog search over blueprints, then to a landing page.
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
const software = any(['app', 'apps', 'software', 'saas', 'platform', 'tool', 'tools', 'api', 'sdk', 'dashboard', 'plugin', 'browser extension', 'chrome extension', 'chatbot', 'crm', 'startup']);
const domainScores = kb.domains.filter((d) => !(software && d.service)).map((d) => ({ d, s: d.words.filter((w) => has(w)).length })).sort((a, b) => b.s - a.s);
let domain = domainScores[0].s > 0 ? domainScores[0].d : null;
// A landing page is not always for software, and each kind of subject has its own page: a developer product
// gets code, a terminal and an API; a practice or a trade gets services with fees, people and how to find
// them; a place gets what is on offer, booking and opening hours; a maker gets the range and a price; a
// charity gets the claim, where the money goes and ways to help; an event gets the date, the programme and
// tickets; a studio gets its work. --type overrides all of this.
if (type.id === 'landing' && !forceType) {
  const cause = any(['charity', 'charities', 'nonprofit', 'non-profit', 'food bank', 'foodbank', 'donate', 'donation', 'donations', 'fundraising', 'fundraiser', 'volunteer', 'volunteers', 'foundation', 'community group', 'campaign']);
  const practice = any(['construction', 'builder', 'builders', 'building firm', 'extension', 'extensions', 'loft conversion', 'loft conversions', 'renovation', 'renovations', 'refurbishment', 'roofer', 'plumber', 'electrician', 'joiner', 'kitchen fitter', 'landscaper', 'architect practice', 'dentist', 'dentists', 'dental', 'clinic', 'clinics', 'physio', 'physiotherapy', 'physiotherapist', 'osteopath', 'chiropractor', 'optician', 'opticians', 'vet', 'vets', 'veterinary', 'salon', 'barber', 'barbers', 'hairdresser', 'spa', 'yoga', 'pilates', 'gym', 'personal trainer', 'therapist', 'counselling', 'counsellor', 'doctor', 'doctors', 'gp', 'practice', 'appointment', 'appointments']);
  const place = any(['coffee shop', 'coffee shops', 'coffee house', 'roastery', 'tea room', 'tearoom', 'gym', 'climbing wall', 'restaurant', 'restaurants', 'cafe', 'café', 'bakery', 'distillery', 'brewery', 'winery', 'hotel', 'venue', 'museum', 'gallery', 'tour', 'tours', 'pub', 'bar', 'bistro', 'visit', 'visiting', 'opening hours', 'book a table', 'book a tour']);
  const occasion = any(['conference', 'conferences', 'summit', 'festival', 'meetup', 'meetups', 'hackathon', 'retreat', 'exhibition', 'workshop', 'workshops', 'event', 'events', 'wedding website', 'wedding site', 'wedding page', 'our wedding', 'wedding invitation']);
  const swap = domain?.id === 'devtool' ? 'dev-landing'
    : software ? null
    : occasion || domain?.id === 'events' ? 'event'
    : cause ? 'cause'
    // A ferry, a bus company or a railway is a place people go from, with times and prices: never a software page.
    : domain?.id === 'transport' ? 'venue'
    : ['professional', 'trades', 'construction'].includes(domain?.id) || practice ? 'service-landing'
    : domain?.id === 'hospitality' || place ? 'venue'
    : ['commerce', 'beauty'].includes(domain?.id) ? 'brand-landing'
    : domain?.id === 'creative' ? 'portfolio'
    : null;
  if (swap) type = kb.pageTypes.find((t) => t.id === swap) ?? type;
}
// A conference is an event first, whatever its subject ("a design conference" is not a design studio).
if (type.id === 'event' && domain?.id !== 'events') domain = kb.domains.find((d) => d.id === 'events') ?? domain;
const moodHits = Object.entries(kb.moods).filter(([w]) => hasLook(w));
const mood = Object.assign({}, ...moodHits.map(([, v]) => v));
// A style is applied only when the brief names a mood; the domain's style is offered, not imposed.
// A style the brief names outright ("a glass landing page", "in the terminal style") counts; a loose search
// match does not ("home page … from 7:30" once read as the ember style's "launch page … from below").
const namedStyle = cat.styles.find((st) => hasLook(st.id) || (st.aliases ?? []).some((a) => hasLook(a)))?.id ?? null;
const explicitStyle = Object.prototype.hasOwnProperty.call(mood, 'style') ? mood.style : namedStyle ?? search(cat, brief, { kind: 'style', limit: 1 }).find((x) => x.s > 24)?.d.id ?? null;
// A marketing page with no recognisable subject still gets a headline face distinct from the stock sans.
const defaults = { marketing: ['slate-forest', 'geometric'], app: ['slate-forest', 'precision'], reading: ['paper-ink', 'editorial'], flow: ['slate-forest', 'precision'] }[type.kind];
// A consumer phone app reads friendlier than a developer console: humanist type, not the stock app sans.
if (['app-phone', 'mobile-app', 'app-booking', 'app-messaging'].includes(type.id)) defaults[1] = 'humanist';
const profile = {
  // An app type with a blueprint of its own brings that blueprint's look (the bank's navy, the run's coral).
  palette: type.look?.palette ?? domain?.palette ?? defaults[0],
  mode: mood.mode ?? domain?.mode ?? 'light',
  typography: mood.typography ?? type.look?.typography ?? domain?.typography ?? defaults[1],
  density: mood.density ?? type.density,
  style: explicitStyle ?? null,
};
// --brand-from: a colour, a logo or a saved site sets the palette and typeface (explicit look flags still win).
let brand = null;
if (brandSrc) {
  try {
    brand = await brandFrom(brandSrc, {
      palettes: JSON.parse(readFileSync(join(root, 'tokens/palettes/palettes.json'), 'utf8')).palettes,
      current: profile.typography,
      sniff: (target) => { const r = spawnSync(process.execPath, [join(root, 'scripts/sniff.mjs'), target, '--json'], { encoding: 'utf8' }); if (r.status !== 0) throw new Error(r.stderr || 'sniff failed'); return JSON.parse(r.stdout); },
    });
  } catch (err) { console.error(`--brand-from: ${err.message}`); process.exit(2); }
  if (brand.palette) { profile.palette = brand.palette; if (!mood.mode) profile.mode = brand.mode; }
  if (brand.type?.typography) profile.typography = brand.type.typography;
}
for (const [k, v] of Object.entries(lookFlags)) if (v) profile[k] = v;
const overrideArgs = Object.entries(brand?.overrides ?? {}).flatMap(([k, v]) => ['--override', `${k}=${v}`]);
const styleOffer = !profile.style && domain?.style ? domain.style : null;
// Why this typeface: a flag the person passed, the brand they gave, the subject's own lettering, or its use.
const pairingUse = (id) => JSON.parse(readFileSync(join(root, 'tokens/typography/source.json'), 'utf8')).pairings.find((x) => x.id === id)?.use ?? '';
const typeWhy = lookFlags.typography ? 'you chose it'
  : brand?.type?.typography === profile.typography ? brand.type.reason
  : mood.typography === profile.typography ? 'the brief names the mood'
  : domain?.typography === profile.typography && domain?.typeWhy ? domain.typeWhy
  : `it is made for ${pairingUse(profile.typography).split('. ')[0].replace(/\.$/, '').toLowerCase()}` || null;

// ---------------------------------------------------------------- product name for copy
const quoted = brief.match(/["“']([^"”']{2,40})["”']/)?.[1];
// A name is one to five capitalised words, joined by "&", "and", "of" or "the": Tally, Harrow & Finch, Canal Street Food Bank.
const NAME = "[A-Z][\\w.'’-]*(?:\\s+(?:(?:&|and|of|the)\\s+)?[A-Z][\\w.'’-]*){0,4}";
const named = brief.match(new RegExp(`\\b(?:called|named)\\s+(${NAME})`))?.[1];
// "…for Tally, an invoicing tool" / "…for Beacon." : a capitalised name after "for", not a generic word.
const GENERIC = new Set(['A', 'An', 'The', 'Our', 'My', 'Your', 'Their', 'This', 'That', 'Every', 'Each', 'Teams', 'People', 'Developers', 'Freelancers']);
const afterFor = [...brief.matchAll(new RegExp(`\\bfor\\s+(${NAME})(?=[\\s,.;:)]|$)`, 'g'))].map((m) => m[1]).find((w) => !GENERIC.has(w.split(' ')[0]));
const leading = brief.match(new RegExp(`^(${NAME}),\\s+(?:an?|the)\\s`))?.[1];
// "Kestrel Dental, family dentist…", "Halyard Ferries: car and foot ferry…", "Moss Yard climbing gym…":
// two or more capitalised words opening the brief are its name (a trailing API, App or SDK is what it is).
const opening = brief.match(/^((?:[A-Z][\w.'’-]*)(?:\s+(?:&\s+)?[A-Z][\w.'’-]*){1,3})(?=[\s,:;]|$)/)?.[1]?.replace(/\s+(API|SDK|App|CLI)$/, '');
// "Tally invoicing app…", "Juniper notes app pricing…": one capitalised word before what the thing is.
const single = brief.match(/^([A-Z][\w'’-]+)(?=(?:\s+[a-z][\w-]*){0,3}\s+(?:app|apps|api|dashboard|status page|settings|pricing|workspace|platform|tool)\b)/)?.[1];
const product = quoted ?? named ?? leading ?? (opening && !GENERIC.has(opening.split(' ')[0]) ? opening : null) ?? afterFor ?? (single && !GENERIC.has(single) ? single : null) ?? null;
const restyle = (kb.restyle?.words ?? []).some((w) => text.includes(` ${w} `) || text.includes(` ${w}`));

// ---------------------------------------------------------------- words from the subject
// The brief's own nouns, prices, times, places and figures: drafts are written from these, never from filler.
const facts = extractFacts(brief, { product });
const figures = figuresFrom(facts);
// Pages that are not a marketing story (an app, a checkout, a status page) are drawn from a model of the
// product: its records and their fields, statuses, plans, basket, services; apps are planned as a flow.
const APP_TYPES = new Set(['dashboard', 'admin-table', 'settings', 'inbox', 'ai-chat', 'agent-app', 'mobile-app', 'app-phone', 'workspace', 'directory', 'app-banking', 'app-fitness', 'app-booking', 'app-messaging', 'app-settings']);
const model = pageModel(facts, { product, typeId: type.id });
const flow0 = APP_TYPES.has(type.id) ? appFlow(model, facts, { typeId: type.id, product }) : null;
// An app with a blueprint of its own lists that blueprint's screens, in the order they are used.
const flow = flow0 && type.screens ? { ...flow0, screens: type.screens.map(([id, name, what]) => ({ id, name, what, build: true })) } : flow0;

// ---------------------------------------------------------------- plan
let sections = type.sections.map((s, i) => ({ n: i + 1, ...s, exists: !s.id || uiIds.has(s.id) }));
// Developer products show code: a code-block figure takes the place of the hero's product frame.
// Art direction: one signature, a hero, a layout for each section and where colour and type may go.
const subjectInput = { facts, items: itemsFrom(facts), software: ['landing', 'dev-landing'].includes(type.id) };
const art0 = direct({ type, domain, profile, sections, uiIds, ...subjectInput });
for (const x of sections) if (/^hero-/.test(x.id ?? '') && art0.composition) {
  if (art0.hero !== x.id) { x.alt = [...new Set([x.id, ...(x.alt ?? [])])]; x.id = art0.hero; }
  x.variant = art0.composition.variant;
  x.rule = `${x.rule ?? ''} Composition: ${art0.composition.name}${x.variant ? ` (data-variant="${x.variant}")` : ''}, because ${art0.heroWhy}.${x.id === 'hero-statement' && sections.some((y) => y.id === 'stats-band') ? ' Leave its three facts out: this page has a figures section, and figures are shown once.' : ''}`.trim();
}
const blueprint = type.blueprint && blueprintIds.has(type.blueprint) ? type.blueprint : null;
// One way to start, not two: a blueprint when it already is this page, snippets when the plan differs from it.
const startWith = blueprint && type.start !== 'snippets' ? 'blueprint' : 'snippets';
// A band that only shows figures is planned only when the brief has figures for it: two or more not
// already used by the first screen. Otherwise it is left out and the plan asks for them.
const figuresBandSkipped = type.kind === 'marketing' && sections.some((s) => s.id === 'stats-band') && figures.length < 3;
if (figuresBandSkipped) sections = sections.filter((s) => s.id !== 'stats-band').map((s, i) => ({ ...s, n: i + 1 }));
// Rhythm: the order of the bands, and each one's density, ground and scale, before any code. A blueprint
// draft cannot gain a section, so its plan is made without breathers.
const rhythm0 = planRhythm({ type, sections, canInsert: startWith === 'snippets' });
const ordered = orderSections(sections, rhythm0);
sections = ordered.sections;
const rhythm = ordered.rhythm;
const drafted = sections.filter((s) => !(s.optional && PROOF.has(s.id ?? '')));
const art = { ...direct({ type, domain, profile, sections: drafted, uiIds, ...subjectInput }), hero: art0.hero, heroWhy: art0.heroWhy, composition: art0.composition, chrome: art0.chrome };
const layoutOf = (n) => art.sectionLayouts.find((l) => l.n === n) ?? null;
const pal = JSON.parse(readFileSync(join(root, 'tokens/palettes/palettes.json'), 'utf8')).palettes.find((p) => p.id === profile.palette);
const accentLch = pal ? pal.modes[profile.mode === 'dark' ? 'dark' : 'light'].tokens['accent-solid'].oklch.match(/[\d.]+/g).map(Number) : [0.5, 0.1, 250];
// The bold idea goes in the hero's picture only where the composition shows a panel's words; elsewhere it is the headline.
const PANEL_HEROES = new Set(['split', 'overlap', 'edge', 'product']);
const ideaHero = art.composition ? (PANEL_HEROES.has(art.composition.id) ? 'hero-split' : 'hero-statement') : sections.find((x) => /^hero-/.test(x.id ?? ''))?.id ?? null;
const idea = boldIdea({ facts, type, hero: ideaHero, signature: art.signature, accent: colourName(accentLch), sections: drafted });
// Software is judged by its screen: when the first screen shows the product, a price never takes its place.
if (idea.place === 'hero-visual' && (software || ['landing', 'dev-landing'].includes(type.id)) && ['product', 'edge', 'wide'].includes(art.composition?.id)) idea.place = 'statement';
const hero = heroCopy(facts, { typeId: type.id, product });
// A first screen is a headline, one sentence and one action: no note under the buttons, 40 words at most.
if (type.kind === 'marketing') Object.assign(hero, fitWords(hero));
const wantsCode = type.kind === 'marketing' && (domain?.id === 'devtool' || has('code') || has('show code'));
const components = [...new Set([...sections.filter((s) => s.id && !s.optional).map((s) => s.id), ...(wantsCode ? ['code-block'] : [])])].filter((id) => uiIds.has(id));
const charts = type.charts ?? [];
const flags = [`--palette ${profile.palette}`, `--mode ${profile.mode}`, `--type ${profile.typography}`, `--density ${profile.density}`, profile.style ? `--style ${profile.style}` : null].filter(Boolean).join(' ');
const base = `node scripts/install-taste.mjs --project ${project} --framework ${framework} ${flags}`;
const overrideFlags = Object.entries(brand?.overrides ?? {}).map(([k, v]) => ` --override ${k}="${v}"`).join('');
const installSnippets = `${base}${overrideFlags} \\\n  --components ${components.join(',')}${charts.length ? ` --charts ${charts.join(',')}` : ''}`;
const installBlueprint = blueprint ? `${base}${overrideFlags} --blueprints ${blueprint}` : null;
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
const actionDefault = { construction: '"Get a quote", with the phone number beside it', education: '"Book a place" or "Visit us"', transport: '"See times" or "Plan a journey"', commerce: 'one "Shop" or "Add to bag" action, with the price beside it', beauty: 'one "Shop" action, with the price beside it', hospitality: '"Book", leading to dates and party size', health: '"Book an appointment", with a phone number as the quiet alternative', travel: '"Check availability", with dates', property: '"Get a quote" or "Book a viewing"', media: '"Listen" or "Subscribe"', public: 'the one task the page exists for, as a verb ("Apply", "Renew")' }[domain?.id] ?? 'a free start ("Start free"), with a quieter second link to a demo or the docs';
const typeAction = { event: '"Get a ticket", with the price in the button', cause: '"Donate"; if people also come here for help, that route is the first button in the hero and Donate stays in the bar', 'service-landing': '"Book a call" or "Book an appointment", with the phone number beside it; a mailto: or tel: link is a real action when there is no booking system', 'brand-landing': 'one "Shop" action, with the price beside it', venue: '"Book" or "Plan your visit", leading to dates and party size', portfolio: '"Get in touch", leading to an email address', about: '"Contact us" or "See open roles"' }[type.id];
const questions = [
  restyle && { id: 'keep', ask: 'What must stay as it is (logo, brand colour, copy, layout)?', why: 'A restyle changes the surface; it should not move what people already know.', default: 'keep the content and structure, change tokens and components only' },
  !product && { id: 'product', ask: 'What is the product called, and what does it do in one line?', why: 'Sample names and sample numbers must not ship; the headline is written from this.', default: 'none: ask, or take the name from the repository or the existing site' },
  !profile.style && !restyle && { id: 'look', ask: `Which look fits: ${directions.styles.map((s, i) => `${'ABC'[i]} ${s.name}`).join(', ')}? (Render them side by side with the directions command and let the person point.)`, why: 'People choose a look faster by eye than from a description.', default: `the plain profile below (${profile.palette}, ${profile.typography}), no style` },
  ['marketing', 'flow'].includes(type.kind) && !saysAction && { id: 'action', ask: typeAction ? 'What is the one thing a visitor should do here: call, book, buy, give, come?' : 'What is the one thing a visitor should do here: start a trial, book a demo, join a waitlist, buy?', why: 'One primary action per screen; its label is the most-read words on the page.', default: typeAction ?? actionDefault },
  !saidMode && { id: 'mode', ask: 'Light, dark, or both with a switch?', why: 'Dark is a second design, not an inversion; it is cheaper to know now.', default: `${profile.mode}, with the other mode working` },
].filter(Boolean).slice(0, 3);

const typeAudience = { 'service-landing': 'people with a problem who are choosing whom to trust: they need what you do, what it costs and how to reach a person', cause: 'two readers: people who need help now, and people deciding whether to give; both need plain facts', event: 'people deciding whether to come: they need the date, the place, the programme and the price', venue: 'guests deciding where to go, who need what is on offer, the hours and a way to book', 'brand-landing': 'shoppers comparing, who need the object, the price, delivery and returns up front', portfolio: 'clients judging taste, so the work leads and words stay short', about: 'people checking who is behind this before they buy, apply or call' }[type.id];
const domainAudience = { finance: 'people who check figures and need to trust them', trading: 'people watching numbers change who need speed and density', devtool: 'developers who want the facts, the code and the limits', analytics: 'people who need one answer fast, then the detail', health: 'people who may be anxious and need calm, plain steps', public: 'anyone, on any device, including people with low vision or little time', commerce: 'shoppers comparing, who need the price, delivery and returns up front', editorial: 'readers who came to read, so the text comes first', productivity: 'teams who want to see the product working, not adjectives', creative: 'clients judging taste, so the work leads and words stay short', playful: 'families and younger users who need big targets and friendly words', enterprise: 'buyers and admins who need proof, controls and compliance', travel: 'people planning, who need dates, prices and photos they trust', beauty: 'people choosing with their eyes, so the product and its result lead and the words stay few', hospitality: 'guests deciding where to go, who need the menu or rooms, the hours and a way to book', media: 'listeners and viewers who came for the thing itself, so controls stay out of the way', property: 'people making a large, slow decision who need plain numbers and no pressure', social: 'people here for each other, so their content leads and the chrome stays quiet', construction: 'homeowners about to spend a lot, who want the price, the time it takes and a phone number they can ring', education: 'parents deciding where their children go, who need the times, the place, the cost and who is in charge', transport: 'people on the move, who need the next time and the place, fast, on a phone' };
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
  typeWhy,
  brand,
  styleOffer,
  questions,
  directions,
  startWith,
  install,
  installAlternative: startWith === 'blueprint' ? installSnippets : installBlueprint,
  blueprint: blueprint ?? (type.blueprint ? `${type.blueprint} (not in this version; start from the sections below)` : null),
  artDirection: { signature: art.signature, hero: art.composition ? { composition: art.composition.id, block: art.composition.block, variant: art.composition.variant, name: art.composition.name, why: art.composition.why } : null, nav: art.chrome?.nav ?? null, footer: art.chrome?.footer ?? null, boldIdea: idea, mainAttributes: art.mainAttrs, sections: art.sectionLayouts.map((l) => ({ n: l.n, id: l.id, layout: l.layout, space: l.space, composition: l.composition, attributes: sectionAttrs(l) })), accent: art.accent, type: art.type, rhythm: art.rhythm, words: art.words, motion: art.motion },
  rhythm: { banded: rhythm.banded, strip: rhythmStrip(rhythm), key: STRIP_KEY, beats: rhythm.beats, moved: rhythm0.moved, inserted: rhythm0.inserted, broken: checkRhythm(rhythm, rhythm.beats.map((b, i) => (i === 0 && /^hero-/.test(b.id ?? '') ? null : layoutOf(b.n)?.shape ?? null))) },
  words: { facts, figures, firstScreen: hero, missing: [...(type.kind === 'marketing' || !PAGES[type.id] ? hero.todo : []), ...(figuresBandSkipped ? ['two to four real figures with their periods (the figures band was left out rather than filled with invented ones)'] : []), ...(idea.ask && type.kind === 'marketing' ? [idea.ask] : []), ...model.todo] },
  model: { records: model.records.map((r) => ({ one: r.one, many: r.many, fields: r.fields, fromBrief: r.fromBrief })), statuses: model.status },
  flow: flow ? { screens: flow.screens, states: flow.states, build: flow.screens.filter((s) => s.build).map((s) => s.id) } : null,
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

// ---------------------------------------------------------------- subject helpers for the draft
// The catalog id each lt- class belongs to (the roots of every component's @scope blocks).
function rootClasses() {
  const map = new Map();
  for (const c of cat.ui) for (const f of c.files.filter((x) => x.endsWith('.css'))) for (const m of readFileSync(join(root, f), 'utf8').matchAll(/@scope\s*\(\.(lt-[a-z0-9-]+)\)/g)) if (!map.has(m[1])) map.set(m[1], c.id);
  return map;
}
// Software that makes a document (an invoicing or billing tool) shows that document in the first screen.
// (A product's own document, such as an invoice, is shown only when the user supplies a real one: the kit's
// sample document carries another business's names and prices.)
const heroInvoice = false;
const used = new Set();
/** Figures from the brief not yet shown on the page (each figure is shown once). */
const figuresLeft = (also = []) => { for (const a of also) used.add(a); const left = figures.filter((f) => !used.has(f.value) && !String(hero.headline ?? '').includes(f.value)); return left; };
const mediaHeadline = () => (facts.claims[1] ? `${facts.claims[1][0].toUpperCase()}${facts.claims[1].slice(1)}.` : null);
let sampleAction = null;
function subjectHero(html, id) {
  sampleAction = /<a class="lt-btn"[^>]*data-variant="primary"[^>]*>([^<]+)</.exec(html)?.[1]?.trim() ?? null;
  let out = applyHeroCopy(html, hero);
  if (idea.place === 'hero-visual' && idea.figure) { out = setHeroVisual(out, heroIdeaPanel(idea, facts)); used.add(idea.figure); }
  else if (heroInvoice && id === 'hero-split') out = setHeroVisual(out, `<h2 class="lt-visually-hidden">An invoice${product ? ` sent with ${esc(product)}` : ''}</h2>\n        ` + readFileSync(join(root, cat.ui.find((u) => u.id === 'invoice-sheet').files.find((f) => f.endsWith('.html'))), 'utf8').trim().split('\n').join('\n        '));
  if (idea.place === 'hero-headline' && idea.figure) used.add(idea.figure);
  // A statement hero's three facts come from the brief, or go; a figure the lede already says is not repeated.
  for (const f of figures) if (out.includes(esc(f.value))) used.add(f.value);
  if (/data-part="facts"/.test(out)) out = setFacts(out, figuresLeft(), { min: 2 });
  if (hero.todo.length) out = out.replace(/^(<\w+[^>]*>)/, `$1\n  <!-- ${askFor(hero.todo)} -->`);
  for (const f of figures) if (out.includes(esc(f.value))) used.add(f.value);
  return out;
}
function closeCopy() {
  // The close names the thing and its price again, next to the one action: repeating the price here is the point.
  const price = facts.prices.find((p) => !String(hero.headline ?? '').includes(p.value.split(' ')[0])) ?? facts.prices[0];
  const prep = /^(give|donate)/i.test(hero.action ?? '') ? 'to' : /^get/i.test(hero.action ?? '') ? 'from' : 'at';
  const heading = price ? `${price.what ? `${price.what[0].toUpperCase()}${price.what.slice(1)}, ` : product ? `${product}, ` : ''}${price.from ? 'from ' : ''}${price.value}`
    : hero.action && product ? `${hero.action} ${prep} ${product}` : null;
  const lede = facts.claims.length ? `${product ?? 'It'} ${facts.claims.join(' and ')}.` : hero.lede;
  return { heading, lede };
}
/** The page title and description from the brief: name, kind and place. */
function retitle(page) {
  const title = [product, facts.kind && facts.place ? `${facts.kind[0].toUpperCase()}${facts.kind.slice(1)} in ${facts.place}` : facts.kind ? `${facts.kind[0].toUpperCase()}${facts.kind.slice(1)}` : null].filter(Boolean).join(' · ');
  const desc = [hero.headline, hero.lede].filter(Boolean).join('. ').replace(/\.\./g, '.');
  let out = page;
  // A brand accent solved from --brand-from: a static page has no profile script, so the page carries it.
  const shades = brand?.overrides ? { light: brand.overrides, dark: brand.overrides } : brand?.perMode ?? null;
  if (shades) {
    const vars = (o) => `--accent-solid: ${o['accent-solid']}; --accent-hover: ${o['accent-hover']}; --accent-ink: ${o['accent-ink']}; --accent-text: ${o['accent-text']}; --focus-ring: ${o['accent-text']};`;
    const band = (o) => `--bg-canvas: ${o['accent-solid']}; --bg-surface-1: color-mix(in oklab, ${o['accent-ink']} 10%, ${o['accent-solid']}); --bg-surface-2: color-mix(in oklab, ${o['accent-ink']} 14%, ${o['accent-solid']}); --text-primary: ${o['accent-ink']}; --text-secondary: ${o['accent-ink']}; --text-muted: ${o['accent-ink']}; --border-hairline: color-mix(in oklab, ${o['accent-ink']} 26%, ${o['accent-solid']}); --accent-solid: ${o['accent-ink']}; --accent-hover: color-mix(in oklab, ${o['accent-ink']} 88%, ${o['accent-solid']}); --accent-ink: ${o['accent-solid']}; --accent-text: ${o['accent-ink']}; --focus-ring: ${o['accent-ink']};`;
    const rules = [];
    for (const m of ['light', 'dark']) {
      const o = shades[m]; if (!o) continue;
      rules.push(`html[data-palette][data-mode="${m}"]${m === 'dark' ? ', html[data-palette][data-mode] [data-tone="dark"]' : ''} { ${vars(o)} }`);
      rules.push(`html[data-palette][data-mode="${m}"] :is(section, header, footer, aside)[data-tone="accent"] { ${band(o)} }`);
    }
    const css = `\n  <style>/* The brand's accent from --brand-from (${esc(brand.src).replace(/\*\//g, '')}), solved for contrast in each mode. */\n    ${rules.join('\n    ')}\n  </style>`;
    out = out.replace(/(<\/head>)/, `${css}\n$1`);
  }
  // The sample's action label, wherever it appears (the bar, the hero, the close), becomes this page's action.
  const actionLabel = hero.action ?? (type.kind === 'marketing' && !['landing', 'dev-landing'].includes(type.id) ? 'Get in touch' : /^start free$/i.test(sampleAction ?? '') && !/\b(free|trial)\b/i.test(brief) ? 'Sign up' : null);
  if (sampleAction && actionLabel) out = out.split(`>${sampleAction}<`).join(`>${esc(actionLabel)}<`);
  if (title) out = out.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  if (desc) out = out.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(desc.endsWith('.') ? desc : `${desc}.`)}">`);
  return out;
}
const hours = openingHours(facts);
const withBeat = (html, n) => { const b = rhythm.beats.find((x) => x.n === n); return b ? applyBeat(html, b) : html; };

// ---------------------------------------------------------------- the composed draft
/** The kit's markup for one part, read from the catalog (its preview frame and comments dropped). */
function partHtml(id) {
  const c = cat.ui.find((u) => u.id === id);
  const f = c?.files.find((x) => x.endsWith('.html'));
  return f ? readFileSync(join(root, f), 'utf8').replace(/<!--[\s\S]*?-->\n?/g, '').trim() : '';
}
/** A figure people count (a price, a quantity), not a time of day, a range, a year or a phone number. */
const COUNTABLE = /^\s*(?:<small>from<\/small>\s*)?[£$€]?\d[\d,]*(?:\.\d+)?(?:%|k)?(?:<small>[^<]*<\/small>)?\s*$/;
/** Numbers that settle: data-count on every true quantity in a band, started by the number-settle enhancer. */
function settleFigures(html) {
  let out = html.replace(/<(dd|p data-part="figure"[^>]*|b data-a="big"|p data-a="big")>([\s\S]*?)<\/(dd|p|b)>/g, (m, open, inner, close) => (COUNTABLE.test(inner) && !/^(19|20)\d\d$/.test(inner.trim()) ? `<${open} data-count>${inner}</${close}>` : m));
  return out;
}
/**
 * The page's moments (references/motion.md): a pinned scene for a product's three or more steps, a sideways
 * rail for five or more things, the picture band's zoom, the statement, figures that settle. At most two,
 * never side by side, never the first screen; the first that fit, in that order.
 */
function chooseMoments(ordered, ctx) {
  const cand = [];
  ordered.forEach((b, k) => {
    if (k === 0) return;
    if (['how-it-works', 'stack-cards', 'sticky-story'].includes(b.id) && isSoftware(ctx) && ctx.facts.steps.length >= 3) cand.push({ at: k, name: 'pinned scene', rank: 0, why: `${ctx.facts.steps.length} steps and a product screen that moves on with each` });
    if (['offer-cards', 'bento-grid'].includes(b.id) && itemsFrom(ctx.facts).length >= 5) cand.push({ at: k, name: 'side-scroll', rank: 1, why: `${itemsFrom(ctx.facts).length} things to browse` });
    if (b.id === 'media-band') cand.push({ at: k, name: 'zoom', rank: 2, why: 'the picture band settles to full size' });
    if (b.id === 'scroll-statement') cand.push({ at: k, name: 'statement', rank: 3, why: 'the one claim lights word by word' });
    const counts = [...b.html.matchAll(/<(?:dd|p data-part="figure"[^>]*)>([\s\S]*?)<\/(?:dd|p)>/g)].filter((m) => COUNTABLE.test(m[1])).length;
    if (counts >= 2) cand.push({ at: k, name: 'number-settle', rank: 4, why: `${counts} true figures count up once` });
  });
  const chosen = [];
  for (const c of cand.sort((a, b) => a.rank - b.rank)) {
    if (chosen.length >= 2) break;
    if (chosen.some((x) => Math.abs(x.at - c.at) < 2)) continue;
    chosen.push(c);
  }
  return chosen;
}
function writeComposed(dir, run) {
  const todo = [...hero.todo];
  const ctx = { facts, figures, product, hero, idea, action: hero.action, hours, used, typeId: type.id, snippet: partHtml, domainWords: (domain?.words ?? []).join(' '), usedMotifs: new Set() };
  const bands = [];
  // The first screen: the kit's hero in the brief's words.
  const heroSec = sections.find((x) => /^hero-/.test(x.id ?? ''));
  const comp = art.composition ?? { id: 'split', block: heroSec.id, variant: null };
  let heroHtml = subjectHero(partHtml(heroSec.id), heroSec.id)
    .replace(/\s*<a data-part="pill"[\s\S]*?<\/a>/, '')
    .replace(/\s*<div data-part="shot"[\s\S]*?<\/div>\s*(?=<\/section>)/, idea.figure && heroSec.id === 'hero-centered' ? `\n  <div data-part="visual">${heroIdeaPanel(idea, facts)}</div>\n` : '\n');
  // The first screen always shows something: the bold idea's figure, else the product working (software),
  // else the subject's own drawing. Never the kit's sample frame.
  if (comp.block === 'hero-split' && !(idea.place === 'hero-visual' && idea.figure) && /<div data-part="(?:frame|visual)"/.test(heroHtml)) heroHtml = setHeroVisual(heroHtml, heroPicture(ctx));
  else if (idea.place === 'hero-visual' && idea.figure) {
    // The idea's panel carries the subject's drawing too, behind the figure.
    // The idea's panel carries the page's one scene behind the figure (a figure panel gives it less height);
    // software keeps a single small drawing.
    const subject = `${facts.kind ?? ''} ${facts.offers.join(' ')}`;
    const sc = isSoftware(ctx) ? null : sceneFor(subject, ctx);
    const m = sc ? sceneParts(sc) : motifParts(motifFor(subject, ctx), { small: true });
    // Above a figure set this large the scene keeps to the top third, clear of the number.
    heroHtml = heroHtml.replace(/<figure class="lt-art"([^>]*)>/, (x, a) => `<figure class="lt-art"${a}${m.attr}${sc ? ' style="--scene-h: 24%"' : ''}>${m.svg}`);
  }
  // The composition the plan chose: the same words and picture, set as this subject's first screen.
  heroHtml = composeHero(comp, heroHtml, ctx);
  ctx.heroMotif = /data-motif="([a-z]+)"/.exec(heroHtml)?.[1] ?? /data-scene="([a-z]+)/.exec(heroHtml)?.[1] ?? null;
  bands.push({ id: heroSec.id, html: heroHtml, slug: 'top', label: 'Top' });
  // The close repeats the hero's action. Software with no word on price says "Sign up", not "Start free".
  ctx.action = hero.action ?? (!isSoftware(ctx) ? 'Get in touch' : /^start free$/i.test(sampleAction ?? '') && !/\b(free|trial)\b/i.test(brief) ? 'Sign up' : sampleAction);
  // Every other band from the facts, or left out with what it needs.
  for (const x of sections.filter((y) => !/^hero-/.test(y.id ?? '') && !CHROME.test(y.id ?? '') && !(y.optional && PROOF.has(y.id ?? '')) && y.id !== 'billing-toggle')) {
    const r = renderBand(x, ctx);
    if (r.todo) { todo.push(r.todo); continue; }
    if (bands.some((b) => b.slug === r.slug || (b.id === 'cta-band' && r.id === 'cta-band'))) continue;
    bands.push(r);
  }
  // A thin brief still gets one picture between the first screen and the close.
  // So does a page whose bands are all words and tables (a statement hero, an address, a close).
  if (!bands.some((b) => b.id !== 'cta-band' && !/^hero-/.test(b.id)) || !bands.some((b) => /class="lt-(art|device)"/.test(b.html))) { const pb = pictureBand(ctx); if (pb) bands.splice(1, 0, pb); }
  // The close says the action again: add one when the plan had none the brief could fill.
  if (!bands.some((b) => b.id === 'cta-band')) { const c = renderBand({ id: 'cta-band', role: 'Closing action' }, ctx); if (!c.todo) bands.push(c); }
  if (idea.ask) todo.push(`the bold idea: ${idea.ask}`);
  // On a short page a panel in the brand colour is a wall of it: the idea goes on ink, and the brand colour
  // closes the page instead. On a long page the panel keeps the brand colour and the close goes dark.
  const onBrand = /data-tone="swatch"/.test(bands[0].html) && bands.length >= 5;
  if (/data-tone="swatch"/.test(bands[0].html) && !onBrand) {
    // A dark panel (the palette's own dark tokens, scoped to the panel) stays a dark object in both modes;
    // the ink tone would turn near-white on a dark page.
    bands[0].html = bands[0].html.replace('data-tone="swatch"', 'data-tone="dark"');
    idea.text = idea.text.replace(/ on [a-z]+$/, ' on a dark panel');
    idea.where = idea.where.replace('an art panel in the brand colour (data-variant="figure", data-tone="swatch")', 'a dark panel (data-variant="figure", data-tone="dark"), because on a page this short a brand-colour panel would be a wall of it');
  }
  // Rhythm over the bands that exist, then a layout for each.
  const asSections = bands.map((b, i) => ({ n: i + 1, id: b.id, role: b.label }));
  // A first screen already on the brand colour (the poster) keeps the close off it: one brand band a page.
  const r = planRhythm({ type, sections: asSections, canInsert: false, brandClose: !onBrand && !/^<section[^>]*data-tone="accent"/.test(bands[0].html) });
  const ordered = r.beats.map((b) => ({ ...bands[b.n - 1], beat: b }));
  // Moments: at most two, never neighbours, never the first screen; chosen here and named in the strip.
  const moments = chooseMoments(ordered, ctx);
  for (const mo of moments) {
    const b = ordered[mo.at];
    if (mo.name === 'pinned scene') { const pr = pinnedSteps(ctx); if (pr) Object.assign(b, { html: pr.html, id: pr.id }); }
    if (mo.name === 'side-scroll') { const sr = sideScroll(ctx); if (sr) Object.assign(b, { html: sr.html, id: sr.id }); }
    if (mo.name === 'number-settle') b.html = settleFigures(b.html);
    b.beat.moment = mo.name;
  }
  // A band that would move on its own but was not chosen stays still.
  for (const [k, b] of ordered.entries()) if (!moments.some((m) => m.at === k)) b.html = b.html.replace(/\sdata-zoom(="[^"]*")?/g, '').replace(/\sdata-lt="scroll-statement"/, '');
  const lay = direct({ type, domain, profile, sections: ordered.map((b, i) => ({ n: i + 1, id: b.id })), uiIds });
  const body = ordered.map((b, i) => {
    const l = lay.sectionLayouts.find((x) => x.n === i + 1);
    const attrs = [`id="${b.slug}"`, i === 0 ? 'data-entrance' : null, l ? sectionAttrs(l) : null].filter(Boolean).join(' ');
    let html = b.html.replace(/^<(section|div)\b([^>]*)>/, (m, tag, rest) => `<${tag}${rest.replace(/\sid="[^"]*"/, '')}${attrs ? ' ' + attrs : ''}>`);
    // The first screen's own ground (a dark picture, the brand poster) belongs to its composition, not the rhythm.
    const own = i === 0 ? /^<\w+[^>]*\sdata-tone="([^"]+)"/.exec(html)?.[1] : null;
    html = applyBeat(html, b.beat);
    return own ? html.replace(/^<(\w+)\b([^>]*)>/, (m, tag, rest) => `<${tag}${rest.replace(/\sdata-tone="[^"]*"/, '')} data-tone="${own}">`) : html;
  });
  const closeBand = ordered.find((b) => b.id === 'cta-band');
  const action = { label: ctx.action ?? 'Get in touch', href: `#${closeBand?.slug ?? 'top'}` };
  const links = ordered.slice(1).filter((b) => b !== closeBand).slice(0, 4).map((b) => ({ slug: b.slug, label: b.label }));
  const htmlAttrs = `data-palette="${profile.palette}" data-mode="${profile.mode}" data-type="${profile.typography}" data-density="${profile.density}" data-radius="balanced" data-motion="snappy"${profile.style ? ` data-style="${profile.style}"` : ''}`;
  const list = todo.length ? `<!-- TODO before this page ships. The brief did not say, so the draft leaves these out rather than inventing them:\n${todo.map((t) => `  - ${t.replace(/--/g, '–')}`).join('\n')}\n-->\n` : '';
  let page = `<!doctype html>\n<html lang="en" ${htmlAttrs}>\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>${esc(product ?? 'TODO: page title')}</title>\n  <meta name="description" content="TODO: one sentence that says what this page is, for search results and link previews.">\n  <!-- lumina-taste draft for: ${brief.replace(/--/g, '–')}. Every word on it comes from the brief; check each one, then add what the TODO list asks for. -->\n  <link rel="stylesheet" href="lumina-taste/lumina.css">\n  <script defer src="lumina-taste/lumina.js"></script>\n</head>\n<body>\n${list}${navBar({ product, links, action, facts, style: art.chrome?.nav })}\n<main id="main"${art.mainAttrs.length ? ' ' + art.mainAttrs.join(' ') : ''}${moments.some((m) => m.name === 'number-settle') ? ' data-lt="number-settle"' : ''}>${ideaComment(idea)}\n${body.join('\n\n')}\n</main>\n${footerBar({ product, facts, year: new Date().getFullYear(), style: art.chrome?.footer, links })}\n</body>\n</html>\n`;
  // Buttons: the primary goes to the close; a secondary goes to the prices if they are on the page; any other is dropped.
  const have = new Set([...page.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const pricesSlug = ['range', 'prices'].find((x) => have.has(x));
  page = page.replace(/<a class="lt-btn"([^>]*)href="([^"]+)"([^>]*)>([\s\S]*?)<\/a>/g, (m, pre, target, post, inner) => {
    if (!target.startsWith('#') || have.has(target.slice(1))) return m;
    if (/data-variant="primary"/.test(pre + post)) return `<a class="lt-btn"${pre}href="${action.href}"${post}>${inner}</a>`;
    if (hero.secondary && pricesSlug && inner.includes(esc(hero.secondary))) return `<a class="lt-btn"${pre}href="#${pricesSlug}"${post}>${inner}</a>`;
    return '';
  });
  page = retitle(page);
  // Install exactly the parts the page uses.
  const rc = rootClasses();
  const ids = new Set(['button', 'navbar-simple']);
  for (const m of page.matchAll(/class="([^"]+)"/g)) for (const c of m[1].split(/\s+/)) if (rc.has(c)) ids.add(rc.get(c));
  run(`${base} --components ${[...ids].join(',')}`);
  const MARK = '<!-- lumina-taste draft for:';
  const target = existsSync(join(dir, 'index.html')) && !readFileSync(join(dir, 'index.html'), 'utf8').includes(MARK) ? join(dir, 'index.draft.html') : join(dir, 'index.html');
  writeFileSync(target, page);
  return { path: target, kind: 'composed', sections: ordered.map((b) => b.id), left: todo.length, todo, moments: moments.map((m) => ({ name: m.name, band: ordered[m.at].slug, why: m.why })), rhythm: { strip: rhythmStrip(r), moved: r.moved, broken: checkRhythm(r, ordered.map((b, i) => (i === 0 ? null : lay.sectionLayouts.find((x) => x.n === i + 1)?.shape ?? null))) } };
}

// ---------------------------------------------------------------- pages that are not a marketing story
/** Seeded sample data from scripts/sample-data.mjs (rows, series), read once per kind and size. */
const sampleCache = new Map();
function sample(kind, { rows = 12, points, period, base, growth } = {}) {
  const args = [join(root, 'scripts/sample-data.mjs'), kind, '--rows', String(rows), '--currency', model.sym, ...(points ? ['--points', String(points)] : []), ...(period ? ['--period', period] : []), ...(base ? ['--base', String(base)] : []), ...(growth != null ? ['--growth', String(growth)] : [])];
  const key = args.join(' ');
  if (!sampleCache.has(key)) { const r = spawnSync(process.execPath, args, { encoding: 'utf8' }); sampleCache.set(key, r.status === 0 ? JSON.parse(r.stdout) : []); }
  return sampleCache.get(key);
}
/**
 * Pricing, contact, a shop's product, checkout, docs, a changelog, a status page, sign-in, a 404, an article
 * and every app screen: the page type's own anatomy (its blueprint's classes, parts and states) filled with the
 * brief's words, the blueprint's page styles beside it, and a small script that joins the parts up.
 */
function writePage(dir, run) {
  const ctx = { facts, figures, product, typeId: type.id, m: model, flow, hero, action: hero.action, sample, charts: new Set(), todo: [...model.todo], domainWords: (domain?.words ?? []).join(' '), usedMotifs: new Set(), used: new Set(), idea, hours, snippet: partHtml, bands: {} };
  if (type.id === 'contact') { const v = renderBand({ id: 'visit-info', role: 'Find us' }, ctx); if (!v.todo) ctx.bands.visit = v.html; }
  const r = PAGES[type.id](ctx);
  // A link to the top of the page needs something there with that id.
  if (!/\sid="top"/.test(r.body)) r.body = r.body.replaceAll('href="#top"', 'href="#main"');
  if (!product) ctx.todo.unshift('the product\'s name');
  const kit = join(dir, 'lumina-taste');
  // Install exactly the parts the page uses, and the charts it draws.
  const rc = rootClasses();
  const ids = new Set(['button']);
  for (const m of r.body.matchAll(/class="([^"]+)"/g)) for (const c of m[1].split(/\s+/)) if (rc.has(c)) ids.add(rc.get(c));
  for (const m of r.body.matchAll(/data-lt="([a-z-]+)"/g)) if (uiIds.has(m[1])) ids.add(m[1]);
  for (const u of r.uses ?? []) ids.add(u);
  run(`${base} --components ${[...ids].filter((x) => uiIds.has(x)).join(',')}${ctx.charts.size ? ` --charts ${[...ctx.charts].join(',')}` : ''}`);
  // The blueprint's own page styles (its layout classes), then the draft's few additions, tokens only.
  const bpCss = (id) => { const f = join(root, 'blueprints', id, 'page.css'); return existsSync(f) ? `\n/* blueprints/${id}/page.css */\n${readFileSync(f, 'utf8')}` : ''; };
  writeFileSync(join(kit, 'page.css'), `/* Page styles for this draft: the kit's blueprint layer${r.css ? ` and the ${r.css} blueprint's page styles` : ''}, then the draft's additions. Edit freely. */\n${readFileSync(join(root, 'blueprints/_shared/blueprint.css'), 'utf8')}${r.css ? bpCss(r.css) : ''}\n/* the draft's additions */\n${DRAFT_CSS}`);
  writeFileSync(join(kit, 'page.js'), PAGE_SCRIPT);
  const htmlAttrs = `data-palette="${profile.palette}" data-mode="${profile.mode}" data-type="${profile.typography}" data-density="${profile.density}" data-radius="balanced" data-motion="snappy"${profile.style ? ` data-style="${profile.style}"` : ''}${r.htmlData ?? ''}`;
  const todo = [...new Set(ctx.todo)];
  const list = todo.length ? `<!-- TODO before this page ships. The brief did not say, so the draft leaves these out (or shows seeded sample rows labelled with your nouns) rather than inventing them:\n${todo.map((t) => `  - ${t.replace(/--/g, '–')}`).join('\n')}\n-->\n` : '';
  const page = `<!doctype html>\n<html lang="en" ${htmlAttrs}>\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1${r.htmlData?.includes('data-app') ? ', viewport-fit=cover' : ''}">\n  <title>${esc(r.title)}</title>\n  <meta name="description" content="${esc(r.desc.endsWith('.') ? r.desc : `${r.desc}.`)}">\n  <!-- lumina-taste draft for: ${brief.replace(/--/g, '–')}. A ${type.name.toLowerCase()} in the ${blueprint ?? type.id} anatomy, written from the brief: check every word, then work through the TODO list. -->\n  <link rel="stylesheet" href="lumina-taste/lumina.css">\n  <link rel="stylesheet" href="lumina-taste/page.css">\n  <script defer src="lumina-taste/lumina.js"></script>\n  <script defer src="lumina-taste/page.js"></script>\n</head>\n<body>\n${list}  <a class="bp-skip" href="#main">Skip to content</a>\n  ${r.body}\n</body>\n</html>\n`;
  const MARK = '<!-- lumina-taste draft for:';
  const target = existsSync(join(dir, 'index.html')) && !readFileSync(join(dir, 'index.html'), 'utf8').includes(MARK) ? join(dir, 'index.draft.html') : join(dir, 'index.html');
  writeFileSync(target, page);
  return { path: target, kind: 'page', todo, flow: flow ? flow.screens.filter((s) => s.build).map((s) => s.id) : null, charts: [...ctx.charts] };
}

/** The features a one-line app brief lists after its colon that the drafted page has no words for. */
function missingAppFeatures(text, html) {
  const list = text.split(':').slice(1).join(':').split(/,|\band\b/).map((x) => x.trim()).filter(Boolean);
  const page = html.replace(/<[^>]+>/g, ' ').toLowerCase();
  const STOP = new Set(['with', 'this', 'that', 'your', 'near', 'from', 'today', 'month', 'week', 'weekly', 'a', 'the', 'for', 'new', 'list']);
  // The blueprint's own word for the same thing: a conversation is a chat, a contact is a person.
  const SAME = { conversation: 'chat', contact: 'people', setting: 'search settings', appointment: 'booking', calendar: 'december', run: 'workout', distance: ' km', balance: '£', freeze: 'freeze' };
  return list.filter((f) => {
    // A single word after a comma is a field of the thing before it ("bookings with dog, owner, date"), not a feature.
    if (f.split(/\s+/).length < 2) return false;
    const words = f.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w)).map((w) => w.replace(/(ies)$/, 'y').replace(/s$/, ''));
    return words.length && !words.some((w) => page.includes(w) || (SAME[w] && page.includes(SAME[w])));
  });
}

// ---------------------------------------------------------------- --write: a composed first draft
// Installs what the plan needs and writes the page itself: sections in order with their layouts, tones and
// ids applied, the navigation pointing at them, and the art direction on <main>. Every sentence in it is
// still sample copy; the plan below says what each section should say instead.
let draft = null;
if (writeDraft) {
  if (project === '/abs/app') { console.error('--write needs --project <the folder the page should live in>.'); process.exit(2); }
  if (!['static', 'tailwind'].includes(framework)) { console.error('--write produces a plain HTML draft: use it with --framework static (the default) or tailwind. For Next.js, run the install command it prints with --framework next: that writes app/page.tsx.'); process.exit(2); }
  const dir = resolve(project);
  mkdirSync(dir, { recursive: true });
  const run = (cmd, extra = []) => { const parts = cmd.replace(/ --override [a-z-]+="[^"]*"/g, '').replace(/\\\n\s*/g, ' ').replace(`--project ${project}`, '--project \u0000').split(/\s+/).slice(1).map((a) => (a === '\u0000' ? dir : a)); const r = spawnSync(process.execPath, [...parts, ...overrideArgs, ...extra], { cwd: root, encoding: 'utf8' }); if (r.status !== 0 && r.status !== 3) { console.error(r.stderr || r.stdout); process.exit(1); } return r.stdout; };
  // A marketing page with a first screen is composed band by band from the brief's own facts, whatever it
  // would start from by hand: no sample business's words, names or prices can survive into it.
  const composed = type.kind === 'marketing' && sections.some((x) => /^hero-/.test(x.id ?? ''));
  if (composed) draft = writeComposed(dir, run);
  else if (PAGES[type.id]) draft = writePage(dir, run);
  else if (startWith === 'blueprint') {
    const out = run(installBlueprint, product ? ['--name', product] : []);
    const path = join(dir, /written to (\S+)\/ instead/.exec(out)?.[1] ?? '', 'index.html');
    // The blueprint's own bands, in the rhythm the plan gives them, with the subject's words in the first screen.
    const page = readFileSync(path, 'utf8');
    const parts = splitMain(page);
    let bpRhythm = null;
    if (parts && type.kind === 'marketing') {
      const rootClass = rootClasses();
      const bpSections = parts.chunks.map((c, i) => ({ n: i + 1, id: idOfBlock(c.html, rootClass), role: /\sid="([^"]+)"/.exec(c.html.slice(0, c.html.indexOf('>')))?.[1] ?? `section ${i + 1}`, tone: /^<\w+[^>]*\sdata-tone="([^"]+)"/.exec(c.html)?.[1] ?? null }));
      bpRhythm = planRhythm({ type, sections: bpSections, canInsert: false, draft: false });
      const byN = new Map(parts.chunks.map((c, i) => [i + 1, c]));
      parts.chunks = bpRhythm.beats.map((b, i) => {
        const c = byN.get(b.n);
        let html = applyBeat(c.html, b);
        if (i === 0) html = subjectHero(html, b.id);
        else if (b.id === 'stats-band') html = setFacts(html, figuresLeft(), { part: null });
        else if (b.id === 'cta-band' && i === bpRhythm.beats.length - 1) html = applyClose(html, closeCopy());
        html = applyHours(html, hours);
        return { pre: c.pre, html };
      });
      parts.head += ideaComment(idea);
      writeFileSync(path, retitle(joinMain(parts)));
    }
    // An app drafted from its blueprint: the brief's features the blueprint has no screen for are one TODO list,
    // and the page says its rows are samples in the subject's nouns until the real data replaces them.
    let appTodo = null;
    if (type.kind === 'app' && type.screens) {
      appTodo = missingAppFeatures(brief, readFileSync(path, 'utf8'));
      const note = `<!-- Draft of the ${type.name.toLowerCase()} for ${(product ?? 'the product').replace(/--/g, '–')}. Rows marked data-sample are believable samples in the subject's own nouns: replace them with real data before this ships.${appTodo.length ? `\n  TODO, the brief names these and the blueprint has no screen for them yet:\n${appTodo.map((t) => `  - ${t.replace(/--/g, '–')}`).join('\n')}` : ''} -->`;
      writeFileSync(path, readFileSync(path, 'utf8').replace(/(<body[^>]*>)/, `$1\n  ${note}`));
    }
    draft = { path, kind: 'blueprint', todo: appTodo ?? undefined, rhythm: bpRhythm ? { strip: rhythmStrip(bpRhythm), moved: bpRhythm.moved, broken: checkRhythm(bpRhythm) } : null };
  } else {
    const SLUG = { 'feature-split': 'features', 'feature-grid': 'features', 'bento-grid': 'features', 'how-it-works': 'how', 'stats-band': 'figures', 'faq-section': 'questions', 'cta-band': 'start', 'pricing-tiers': 'pricing', 'offer-cards': 'range', 'visit-info': 'visit', 'booking-bar': 'book', 'contact-section': 'contact', 'team-grid': 'team', 'blog-grid': 'posts', 'project-grid': 'work', 'integrations-grid': 'integrations', 'code-block': 'code', 'terminal-window': 'quickstart', 'api-endpoint': 'api', 'description-list': 'details', 'comparison-table': 'compare', 'newsletter-signup': 'newsletter', 'sticky-story': 'story', 'showcase-tabs': 'examples', 'media-band': 'product', 'scroll-statement': 'promise' };
    const LABEL = { features: 'Features', how: 'How it works', figures: 'In numbers', questions: 'Questions', pricing: 'Pricing', range: 'The range', visit: 'Visit', book: 'Book', contact: 'Contact', team: 'Team', posts: 'Writing', work: 'Work', integrations: 'Integrations', code: 'Code', quickstart: 'Quickstart', api: 'API', details: 'Details', compare: 'Compare', story: 'How it works', examples: 'Examples', product: 'The product', promise: 'Our promise' };
    const isChrome = (id) => /^(navbar|footer|site-footer|floating-pill-nav|hide-on-scroll)/.test(id);
    const picked = sections.filter((x) => (x.id ? uiIds.has(x.id) : type.kind === 'marketing' && x.role && x.copy) && !(x.optional && PROOF.has(x.id))).map((x) => ({ ...x, id: x.id === 'navbar-mega' && (x.alt ?? []).includes('navbar-simple') ? 'navbar-simple' : x.id }));
    const ids = [...new Set([...picked.map((x) => x.id).filter(Boolean), 'button', ...(idea.place === 'hero-visual' || idea.place === 'media-band' ? ['art-panel'] : []), ...(heroInvoice ? ['invoice-sheet'] : [])])];
    run(`${base} --components ${ids.join(',')}${charts.length ? ` --charts ${charts.join(',')}` : ''}`);
    const kit = join(dir, 'lumina-taste');
    const snippet = (id) => readFileSync(join(kit, 'snippets', `${id}.html`), 'utf8').replace(/<!--[\s\S]*?-->\n?/, '').trim();
    const family = (id) => cat.ui.find((u) => u.id === id)?.family;
    const anchors = [];
    const body = [];
    const slugOf = (role) => role.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    for (const x of picked.filter((y) => !y.id || !isChrome(y.id))) {
      if (!x.id) {
        // Nothing ready-made fits this section: a plain section with the heading in place and the brief for its words.
        const slug = slugOf(x.role), lay = layoutOf(x.n);
        anchors.push({ slug, label: x.role });
        body.push(`${x.optional ? `<!-- Optional (${x.role}): keep it only if you have the real content for it. -->\n` : ''}${withBeat(`<section class="lt-section" id="${slug}"${lay ? ' ' + sectionAttrs(lay) : ''} aria-labelledby="h-${slug}">\n  <header><h2 id="h-${slug}">${x.role}</h2></header>\n  <div class="lt-prose"><p>TODO: ${x.copy}</p></div>\n</section>`, x.n)}`);
        continue;
      }
      let html = snippet(x.id);
      const hero = /^hero-/.test(x.id);
      // Figures are shown once: when the page has a figures section, the statement hero leaves its three facts out.
      if (x.id === 'hero-statement' && picked.some((y) => y.id === 'stats-band')) html = html.replace(/\s*<dl data-part="facts">[\s\S]*?<\/dl>/, '');
      const slug = hero ? 'top' : SLUG[x.id] ?? slugOf(x.role ?? x.id);
      const lay = layoutOf(x.n);
      const attrs = [slug && !/^<\w+[^>]*\sid=/.test(html) ? `id="${slug}"` : null, hero ? 'data-entrance' : null, lay ? sectionAttrs(lay) : null].filter(Boolean).join(' ');
      if (family(x.id) === 'blocks') {
        html = html.replace(/^<(section|div|footer)\b([^>]*)>/, (m, tag, rest) => `<${tag}${rest.replace(/\sid="[^"]*"/, slug ? '' : '$&')}${attrs ? ' ' + attrs : ''}>`);
      } else {
        // Not a section block: give it the same band, container and heading as one.
        html = `<section class="lt-section"${attrs ? ' ' + attrs : ''} aria-labelledby="h-${slug ?? x.n}">\n  <header><h2 id="h-${slug ?? x.n}">${x.role}</h2></header>\n  ${html.split('\n').join('\n  ')}\n</section>`;
      }
      // The rhythm: this band's ground (data-tone), density and scale. Then the subject's own words.
      html = withBeat(html, x.n);
      if (hero) html = subjectHero(html, x.id);
      else if (x.id === 'media-band') html = idea.place === 'media-band' ? setFacts(applyMediaIdea(html, idea, mediaHeadline()), figuresLeft([idea.figure]), { min: 2 }) : setFacts(html, figuresLeft(), { min: 2 });
      else if (x.id === 'stats-band') html = setFacts(html, figuresLeft(), { part: null });
      html = applyHours(html, hours);
      if (x.id === 'cta-band' && x === picked.filter((y) => !y.id || !isChrome(y.id)).at(-1)) html = applyClose(html, closeCopy());
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
    const footCols = (html) => html.replace(/(<nav data-part="cols"[^>]*>)[\s\S]*?(<\/nav>)/, (m, open, close) => `${open}\n      <div><h2>On this page</h2><ul>${anchors.filter((a) => `#${a.slug}` !== action).slice(0, 5).map((a) => `<li><a href="#${a.slug}">${a.label}</a></li>`).join('')}</ul></div>\n      <div><h2>Legal</h2><ul><li><a href="/privacy">Privacy</a></li><li><a href="/terms">Terms</a></li></ul></div>\n    ${close}`);
    const chrome = (id) => footCols(pill(snippet(id))).replace(/<ul data-part="links">[\s\S]*?<\/ul>/, `<ul data-part="links">${li}</ul>`).replace(/(<div[^>]*data-part="panel"[^>]*>)<ul>[\s\S]*?<\/ul>/, `$1<ul>${li}</ul>`).replace(/href="#home"/g, 'href="#top"').replace(/href="#start"/g, `href="${action}"`).replace(/<a href="#signin"[^>]*>[^<]*<\/a>/g, '');
    const top = picked.filter((y) => /^(navbar|floating-pill-nav|hide-on-scroll)/.test(y.id ?? '')).map((y) => chrome(y.id)).join('\n');
    const foot = picked.filter((y) => /footer/.test(y.id ?? '')).map((y) => chrome(y.id)).join('\n');
    const htmlAttrs = `data-palette="${profile.palette}" data-mode="${profile.mode}" data-type="${profile.typography}" data-density="${profile.density}" data-radius="balanced" data-motion="snappy"${profile.style ? ` data-style="${profile.style}"` : ''}`;
    let page = `<!doctype html>\n<html lang="en" ${htmlAttrs}>\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>${product ?? 'TODO: page title'}</title>\n  <meta name="description" content="TODO: one sentence that says what this page is, for search results and link previews.">\n  <!-- lumina-taste draft for: ${brief.replace(/--/g, '–')}. The first screen is written from the brief; every other sentence, name, number and link target is sample content: rewrite all of it. -->\n  <link rel="stylesheet" href="lumina-taste/lumina.css">\n  <script defer src="lumina-taste/lumina.js"></script>\n</head>\n<body>\n${top}\n<main id="main"${art.mainAttrs.length ? ' ' + art.mainAttrs.join(' ') : ''}${moments.some((m) => m.name === 'number-settle') ? ' data-lt="number-settle"' : ''}>${ideaComment(idea)}\n${body.join('\n\n')}\n</main>\n${foot}\n</body>\n</html>\n`;
    // A button that led to one of the sample's pages: the primary one takes this page's action, the others go.
    { const have = new Set([...page.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
      page = page.replace(/<a class="lt-btn"([^>]*)href="#([^"]+)"([^>]*)>([\s\S]*?)<\/a>/g, (m, pre, target, post, inner) => have.has(target) ? m : /data-variant="primary"/.test(pre + post) ? `<a class="lt-btn"${pre}href="${action}"${post}>${inner}</a>` : ''); }
    if (product) page = page.replaceAll('Halyard', product).replaceAll('halyard', product.toLowerCase().replace(/[^a-z0-9]+/g, ''));
    const MARK = '<!-- lumina-taste draft for:';
    const target = existsSync(join(dir, 'index.html')) && !readFileSync(join(dir, 'index.html'), 'utf8').includes(MARK) ? join(dir, 'index.draft.html') : join(dir, 'index.html');
    writeFileSync(target, retitle(page));
    draft = { path: target, kind: 'snippets', rhythm: { strip: rhythmStrip(rhythm), moved: rhythm0.moved, broken: plan.rhythm.broken }, sections: picked.filter((y) => !y.id || !isChrome(y.id)).map((y) => y.id ?? slugOf(y.role)), left: sections.filter((x) => x.optional && PROOF.has(x.id ?? '')).map((x) => x.id) };
  }
  plan.draft = { ...draft, path: relative(process.cwd(), draft.path) || draft.path };
  if (draft.todo) plan.words.missing = [...new Set([...plan.words.missing, ...draft.todo])];
  if (withImages && draft.kind === 'composed') {
    // The subject is the business, never its town: a photograph of Edinburgh is not the restaurant.
    const r = spawnSync(process.execPath, [join(root, 'scripts/find-images.mjs'), '--fill', draft.path, '--subject', facts.kind || brief, '--out', join(dirname(draft.path), 'images')], { encoding: 'utf8', env: process.env });
    const set = (readFileSync(draft.path, 'utf8').match(/<img src="images\//g) ?? []).length;
    plan.draft.images = { ran: true, status: r.status, set, note: r.status === 0 ? `${set} photograph${set === 1 ? '' : 's'} set from openly licensed sources (credits in images/credits.json); look at each one` : `find-images could not run: ${(r.stderr || r.stdout).trim().split('\n').pop()}` };
  } else if (draft.kind === 'composed') plan.draft.images = { ran: false, note: 'no photographs fetched: the panels show the subject\'s drawings. Add --images to search public-domain and CC0 photographs for them (find-images --fill; it downloads)' };
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
if (draft?.kind === 'composed') L.push(`**A first draft is written: \`${draft.path}\`.** It is composed band by band from the brief's own facts (no sample business's words, names or prices), in the rhythm below. ${draft.todo.length ? `The brief left ${draft.todo.length} thing${draft.todo.length > 1 ? 's' : ''} open; they are listed once, at the top of the draft, and under "Still needed" below. Bands with nothing to show were left out rather than invented.` : 'Nothing was left open.'}`, '');
if (draft?.kind === 'page') L.push(`**A first draft is written: \`${draft.path}\`.** It is a ${type.name.toLowerCase()} in its blueprint's working anatomy (the same parts and states), written from the brief: its own names, ${type.kind === 'app' ? 'records, fields and states' : 'prices, places and lists'}, nothing from a sample business.${draft.todo.length ? ` The brief left ${draft.todo.length} thing${draft.todo.length > 1 ? 's' : ''} open; they are listed once, at the top of the draft, and under "Still needed" below.` : ''} Page styles are in \`lumina-taste/page.css\` and the page's behaviour in \`lumina-taste/page.js\`.`, '');
if (draft?.kind === 'composed' && plan.draft?.images) L.push(`Photographs: ${plan.draft.images.note}.`, '');
else if (draft && draft.kind !== 'page') L.push(draft.kind === 'blueprint'
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
if (brand) {
  L.push(`**Brand from ${brand.kind === 'colour' ? 'the colour' : brand.kind === 'logo' ? 'the logo' : 'the site'} \`${brand.src}\`:** ${brand.colours?.length ? `colours found ${brand.colours.slice(0, 4).map((c) => `\`${c.css}\`${c.share ? ` (${Math.round(c.share * 100)}%)` : c.from ? ` (${c.from})` : ''}`).join(', ')}. ` : ''}${brand.note}`);
  if (brand.type) L.push(`Type \`${brand.type.typography}\`, because ${brand.type.reason}. Tone: ${brand.tone}`);
  if (brand.contrastFailures?.length) L.push(`Contrast: ${brand.contrastFailures.join('; ')}.`);
  L.push('');
}
L.push(`Palette \`${profile.palette}\` (${profile.mode}), type \`${profile.typography}\`${typeWhy ? ` (${typeWhy})` : ''}, density \`${profile.density}\`${profile.style ? `, style \`${profile.style}\`` : ', no style'}.${brand?.palette ? ' Palette and type come from the brand (above).' : domain ? ` Chosen for the ${domain.id} domain.` : ' No domain recognised, so these are the neutral defaults.'}`);
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
if (art.composition) L.push(`- **First screen: ${art.composition.name}** (\`${art.composition.block}\`${art.composition.variant ? ` with \`data-variant="${art.composition.variant}"\`` : ''}), because ${art.composition.why}. Not the kit's default split: a line above, three lines of headline, a paragraph, two buttons, a note and a picture on the right is what every generated page looks like. One sentence under the headline, one action and at most one quiet link, no note under the buttons, 40 words at most.`);
if (art.chrome) L.push(`- **Bar and foot:** ${art.chrome.nav.id === 'ink' ? 'an ink bar (`data-tone="dark"` on the navbar)' : art.chrome.nav.id === 'brand' ? 'a bar in the brand colour (`data-tone="accent"` on the navbar)' : art.chrome.nav.id === 'split' ? 'a split bar, the name in the middle (`data-variant="split"`)' : art.chrome.nav.id === 'minimal' ? 'a minimal bar, the name and the action only (`data-variant="minimal"`)' : 'the simple bar'}, because ${art.chrome.nav.why}; ${art.chrome.footer.id === 'wordmark' ? 'a wordmark foot (`site-footer` with `data-variant="wordmark"`)' : art.chrome.footer.id === 'contact' ? 'a contact foot, the phone and address set large (`site-footer` with `data-variant="contact"`)' : 'a quiet foot (`footer-minimal`)'}, because ${art.chrome.footer.why}.`);
L.push(`- **Bold idea: ${idea.text}.** It lives in ${idea.where}. ${idea.fromBrief ? 'Taken from the brief; everything else on the page stays quieter than it.' : `The brief has no figure to build it on: ask for ${idea.ask}.`}`);
if (art.mainAttrs.length) L.push(`- **Page:** \`<main ${art.mainAttrs.join(' ')}>\`: each section rises into place as it scrolls in. Sections are set apart by space and a change of ground, not by rules or small labels over every heading.`);
{
  const r = draft?.rhythm ?? { strip: plan.rhythm.strip, moved: rhythm0.moved };
  L.push(`- **Rhythm${draft?.kind === 'blueprint' ? ' (as drafted from the blueprint)' : draft?.kind === 'composed' ? ' (as drafted)' : ''}:** \`${r.strip}\``);
  L.push(`  ${rhythm.banded ? STRIP_KEY : 'One screen: regions on one ground, as dense as the work needs.'}${r.moved?.length ? ` Moved: ${r.moved.join(', ')} (the close says the action again; parts with one layout never touch).` : ''}${rhythm0.inserted.length ? ` Added: ${rhythm0.inserted.join(', ')} (a pause between busy bands).` : ''}${figuresBandSkipped ? ' Left out: the figures band, because the brief has fewer than three figures.' : ''}`);
  L.push(`  ${art.rhythm}`);
  for (const b of rhythm.beats.filter((x) => x.note)) L.push(`  - ${b.label}: ${b.note}`);
  if (draft?.moments) L.push(`  Moments (two at most, never side by side): ${draft.moments.length ? draft.moments.map((m) => `${m.name} in #${m.band} (${m.why})`).join('; ') : 'none: nothing in the brief carries one, and a page that does not move is better than one that moves for nothing'}.`);
}
L.push(`- **Look:** before you install, name three nouns from the subject's world and check that the palette and typeface come from them. If the result is a default look (indigo and Inter; cream, a book serif and terracotta; black and one acid colour), choose again or state why on the root: \`<html data-look-reason="…">\`. See references/ai-defaults.md.`);
L.push(`- **Words:** ${art.words}`);
L.push(`- **Motion:** ${art.motion}`);
L.push(`- **Colour:** ${art.accent}`);
L.push(`- **Type:** ${art.type}`);
L.push('- **Then the detail pass** in references/composition.md before you audit: alignment, line breaks, numbers, edges.', '');
L.push(H('Words from the brief'), '');
{
  const got = [facts.kind && `kind: ${facts.kind}`, facts.place && `place: ${facts.place}`, facts.street && `street: ${facts.street}`, facts.days && `days: ${facts.days}`, ...figures.map((f) => `${f.value} (${f.label})`), ...facts.claims.map((c) => `"${c}"`), ...facts.offers.map((o) => `offer: ${o}`)].filter(Boolean);
  L.push(got.length ? `Found in the brief: ${got.join('; ')}. Headlines and captions are written from these; nothing else is a fact.` : 'The brief names no place, price, time or figure.');
  if (hero.headline) L.push('', `First screen: eyebrow "${hero.eyebrow ?? '(sample)'}", headline "${hero.headline}"${hero.lede ? `, lede "${hero.lede}"` : ''}${hero.action ? `, action "${hero.action}"` : ''}.`);
  if (plan.words.missing.length) L.push('', `Still needed (the draft marks these TODO rather than inventing them): ${plan.words.missing.join('; ')}.`);
  L.push('');
}
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
if (flow) {
  L.push(H('The app as a flow'), '', `Plan the screens before any one of them: an app is used in this order, and each screen has its empty, loading and error states in ${product ?? 'the product'}'s own words.`, '');
  flow.screens.forEach((s, i) => L.push(`${i + 1}. **${s.name}**${s.build ? (draft ? ' _(drafted)_' : ' _(build this)_') : ''}: ${s.what}`));
  L.push('', `- **Empty:** "${flow.states.empty.title}". ${flow.states.empty.body} Button: "${flow.states.empty.action}".`, `- **Loading:** ${flow.states.loading.how} (aria-label "${flow.states.loading.label}").`, `- **Error:** "${flow.states.error.title}". ${flow.states.error.body} Button: "${flow.states.error.action}".`, '', `Open the draft with \`?state=loading\`, \`?state=empty\` or \`?state=error\` to see each.${['mobile-app', 'app-phone'].includes(type.id) ? ' `?screen=home` (or start, detail, settings) opens one screen.' : ''}`, '');
}
if (type.states.length) { L.push(H('States to build'), ''); for (const s of type.states) L.push(`- ${s}`); L.push(''); }
L.push(H('Avoid'), ''); for (const a of type.avoid) L.push(`- ${a}`); L.push('');
L.push(H('Finish'), ''); for (const f of plan.finish) L.push(`- ${f.startsWith('node') ? '`' + f.replace(/\s{2,}\(.*$/, '') + '`' + (f.match(/\s{2,}(\(.*)$/)?.[1] ? ' ' + f.match(/\s{2,}(\(.*)$/)[1] : '') : f}`);
console.log(L.join('\n'));
}
