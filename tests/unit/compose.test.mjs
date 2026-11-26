// The page composer: every id it names exists, briefs land on the right page type, and the
// install command it prints actually runs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const node = (args, cwd = root) => spawnSync(process.execPath, args, { cwd, encoding: 'utf8' });
const compose = (brief, ...extra) => JSON.parse(node([join(root, 'scripts/compose.mjs'), brief, '--json', ...extra]).stdout);

test('every id in the composer knowledge file exists in the catalog', () => {
  const kb = JSON.parse(readFileSync(join(root, 'engine/compose/page-types.json'), 'utf8'));
  const cat = JSON.parse(readFileSync(join(root, 'catalog.json'), 'utf8'));
  const has = (kind, id) => cat[kind].some((x) => x.id === id);
  for (const t of kb.pageTypes) {
    for (const s of t.sections) for (const id of [s.id, ...(s.alt ?? [])].filter(Boolean)) assert.ok(has('ui', id), `${t.id}: ${id}`);
    for (const c of t.charts ?? []) assert.ok(has('charts', c), `${t.id}: chart ${c}`);
    if (t.blueprint) assert.ok(has('blueprints', t.blueprint), `${t.id}: blueprint ${t.blueprint}`);
  }
  for (const d of kb.domains) {
    assert.ok(has('palettes', d.palette), d.id);
    assert.ok(has('typography', d.typography), d.id);
    if (d.style) assert.ok(has('styles', d.style), d.id);
  }
});

test('briefs land on the right page type and domain', () => {
  const cases = [
    ['landing page for an invoicing tool', 'landing', 'navy-sand'],
    ['pricing page for a meditation app', 'pricing', 'sage-clay'],
    ['admin users table for a devtool', 'admin-table', 'black-signal'],
    ['checkout for a coffee shop', 'checkout', 'cream-charcoal'],
    ['help center docs for our API', 'docs', 'black-signal'],
    ['analytics dashboard for a sales team', 'dashboard', null],
    ['release notes page', 'changelog', null],
    ['council permit application sign in', 'auth', 'ochre-indigo'],
  ];
  for (const [brief, type, palette] of cases) {
    const p = compose(brief);
    assert.equal(p.pageType.id, type, brief);
    if (palette) assert.equal(p.profile.palette, palette, brief);
  }
  assert.equal(compose('minimal portfolio for an architect').profile.style, 'minimal');
  assert.equal(compose('something nice').pageType.confident, false);
});

test('the printed install command runs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lt-compose-'));
  try {
    writeFileSync(join(dir, 'package.json'), '{"name":"x"}');
    const p = compose('analytics dashboard for a finance team', '--project', dir, '--framework', 'react');
    const argv = p.install.replace(/\\\n\s*/g, ' ').split(/\s+/).slice(2);
    const r = node([join(root, 'scripts/install-taste.mjs'), ...argv]);
    assert.equal(r.status, 0, r.stderr + r.stdout);
    const prof = JSON.parse(readFileSync(join(dir, 'taste-profile.json'), 'utf8'));
    assert.equal(prof.palette, 'navy-sand');
    assert.equal(prof.density, 'balanced');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a thin brief gets at most three questions, each with a default; a full brief gets fewer', () => {
  const thin = compose('landing page for an invoicing tool');
  assert.ok(thin.questions.length >= 2 && thin.questions.length <= 3);
  assert.deepEqual(thin.questions.map((q) => q.id).slice(0, 2), ['product', 'look']);
  for (const q of thin.questions) assert.ok(q.ask && q.why && q.default, q.id);
  const full = compose('dark terminal landing page for Relay, a webhooks API, sign up button');
  assert.deepEqual(full.questions, []);
  const restyle = compose('restyle our pricing page');
  assert.ok(restyle.questions.some((q) => q.id === 'keep'));
});

test('directions are three real styles, and a brief that says dark only gets dark ones', () => {
  const kb = JSON.parse(readFileSync(join(root, 'engine/compose/page-types.json'), 'utf8'));
  const styles = JSON.parse(readFileSync(join(root, 'tokens/styles/source.json'), 'utf8')).styles;
  for (const [domain, ids] of Object.entries(kb.directions).filter(([k]) => !k.startsWith('$'))) {
    assert.equal(ids.length, 3, domain);
    assert.equal(new Set(ids).size, 3, domain);
    const palettes = JSON.parse(readFileSync(join(root, 'catalog.json'), 'utf8')).palettes;
    assert.equal(new Set(ids.map((k) => k.split('@')[0])).size, 3, `${domain}: three different styles`);
    for (const key of ids) { const [id, palette] = key.split('@'); assert.ok(styles.some((s) => s.id === id), `${domain}: ${id}`); if (palette) assert.ok(palettes.some((p) => p.id === palette), `${domain}: ${palette}`); }
  }
  const d = compose('dark landing page for a webhooks API').directions;
  assert.equal(d.styles.length, 3);
  assert.ok(d.styles.every((s) => s.mode === 'dark'));
  assert.match(d.command, /directions\.mjs/);
  assert.equal(compose('swiss landing page for a law firm').directions.styles[0].id, 'swiss');
});

test('directions.mjs writes one page with three themed frames that open from disk', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lt-directions-'));
  try {
    const r = node([join(root, 'scripts/directions.mjs'), 'landing page for Relay, a webhooks API for developers', '--out', dir]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /A {2}\w+/);
    const html = readFileSync(join(dir, 'directions.html'), 'utf8');
    assert.equal((html.match(/class="dir-frame"/g) ?? []).length, 3);
    assert.equal(new Set([...html.matchAll(/class="dir-frame"[^>]*data-style="([\w-]+)"/g)].map((m) => m[1])).size, 3);
    assert.ok(html.includes('Relay') && !html.includes('Halyard'), 'the brief\'s product name replaces the sample brand');
    assert.ok(existsSync(join(dir, 'lumina.css')) && existsSync(join(dir, 'lumina.js')));
    assert.ok(!/src="https?:|href="https?:/.test(html), 'no network requests');
    const bad = node([join(root, 'scripts/directions.mjs'), 'landing page', '--out', dir, '--styles', 'nope']);
    assert.equal(bad.status, 2);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('art direction: one signature, no three neighbours with the same shape, a hero that fits the subject', async () => {
  const { direct } = await import(join(root, 'scripts/lib/art-direction.mjs'));
  const kb = JSON.parse(readFileSync(join(root, 'engine/compose/page-types.json'), 'utf8'));
  const cat = JSON.parse(readFileSync(join(root, 'catalog.json'), 'utf8'));
  const uiIds = new Set(cat.ui.map((u) => u.id));
  for (const type of kb.pageTypes.filter((t) => t.kind === 'marketing')) {
    for (const domain of [null, ...kb.domains]) {
      const sections = type.sections.map((s, i) => ({ n: i + 1, ...s }));
      const art = direct({ type, domain, profile: { style: null }, sections, uiIds });
      assert.ok(art.signature.name && art.signature.how, `${type.id}: signature`);
      const shapes = art.sectionLayouts.map((l) => l.shape);
      for (let i = 2; i < shapes.length; i++) assert.ok(!(shapes[i] === shapes[i - 1] && shapes[i] === shapes[i - 2]), `${type.id}/${domain?.id}: three ${shapes[i]} in a row`);
      assert.ok(art.sectionLayouts.filter((l) => l.layout === 'rail').length <= 2, `${type.id}: at most two rails`);
      for (const l of art.sectionLayouts) if (l.layout) assert.match(l.layout, /^(rail|centre|split)$/);
    }
  }
  const studio = compose('landing page for Meridian, an architecture studio');
  assert.equal(studio.sections.find((s) => /^hero-/.test(s.id)).id, 'hero-statement');
  assert.deepEqual(studio.artDirection.mainAttributes, ['data-scroll']);
  const saas = compose('landing page for a project management app for agencies');
  assert.equal(saas.sections.find((s) => /^hero-/.test(s.id)).id, 'hero-split');
  assert.deepEqual(saas.artDirection.mainAttributes, ['data-scroll']);
  assert.match(compose('Landing page for Relay, a webhooks API').artDirection.signature.name, /Code/);
});

test('compose --write produces a composed draft that audits clean, with real anchors and the plan\'s layouts', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lt-draft-'));
  try {
    const r = node([join(root, 'scripts/compose.mjs'), 'Landing page for Meridian, an architecture studio in Leeds', '--project', dir, '--write']);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /A first draft is written/);
    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    assert.match(html, /<main id="main" data-scroll>/);
    assert.doesNotMatch(html, /<header><p data-part="eyebrow">/);
    assert.match(html, /<section class="lt-hero-statement"[^>]*data-entrance/);
    assert.match(html, /<section class="lt-hero-statement"[^>]*id="top"/);
    assert.ok(html.includes('Meridian') && !html.includes('Halyard'), 'the product name replaces the sample brand');
    assert.ok(!/lt-logo-cloud|lt-testimonial-grid/.test(html), 'proof from other people is never drafted');
    // The navigation points at sections that exist.
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    const nav = html.slice(html.indexOf('<header class="lt-nav'), html.indexOf('<main'));
    const dead = [...nav.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]).filter((h) => !ids.has(h));
    assert.deepEqual(dead, []);
    // An existing page is never replaced.
    writeFileSync(join(dir, 'index.html'), '<html><body>mine</body></html>');
    node([join(root, 'scripts/compose.mjs'), 'Landing page for Meridian, an architecture studio in Leeds', '--project', dir, '--write']);
    assert.equal(readFileSync(join(dir, 'index.html'), 'utf8'), '<html><body>mine</body></html>');
    assert.ok(existsSync(join(dir, 'index.draft.html')));
    const a = node([join(root, 'scripts/audit-ui.mjs'), join(dir, 'index.draft.html'), '--taste', '--viewports', 'desktop', '--modes', 'light']);
    assert.match(a.stdout, /0 errors/, a.stdout);
    assert.match(a.stdout, /taste score (9\d|100)\/100/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('each kind of subject gets its own page, and software stays software', () => {
  const cases = [
    ['Home page for Cedar Street Dental, a family dentist in Leeds', 'service-landing', 'practice'],
    ['Landing page for a law firm specialising in employment', 'service-landing', 'practice'],
    ['Website for an emergency plumber in Hull', 'service-landing', 'practice'],
    ['Website for a yoga studio in Bristol', 'service-landing', 'practice'],
    ['Home page for a charity that runs food banks', 'cause', 'cause'],
    ['Home page for Fernhill, a small pottery studio that sells mugs online', 'brand-landing', 'shop'],
    ['Landing page for a meal kit subscription', 'brand-landing', 'shop'],
    ['Website for a two-day design conference in Leeds', 'event', 'event'],
    ['Wedding website for Sam and Alex', 'event', 'event'],
    ['Website for a neighbourhood wine bar', 'venue', 'venue'],
    ['Site for my wedding photography business', 'portfolio', null],
    ['Landing page for Tally, an invoicing tool for freelancers', 'landing', null],
    ['Landing page for a booking app for dental clinics', 'landing', null],
    ['Landing page for an event management platform', 'landing', null],
    ['Landing page for a mobile banking app for teenagers', 'landing', null],
  ];
  for (const [brief, type, blueprint] of cases) {
    const p = compose(brief);
    assert.equal(p.pageType.id, type, brief);
    if (blueprint) { assert.equal(p.startWith, 'blueprint', brief); assert.ok(p.install.includes(`--blueprints ${blueprint}`), `${brief}: ${p.install}`); }
    // A page that is not for software never plans software sections.
    if (!['landing', 'portfolio'].includes(type)) for (const id of ['logo-cloud', 'feature-grid', 'feature-split', 'integrations-grid']) assert.ok(!p.sections.some((x) => x.id === id), `${brief}: ${id}`);
  }
  assert.match(compose('Website for a two-day design conference in Leeds').artDirection.signature.name, /date/i);
  assert.match(compose('Home page for a charity that runs food banks').artDirection.signature.name, /claim/i);
  assert.match(compose('Website for an accountant in Leeds').artDirection.signature.name, /Plain terms/);
});

test('compose --write leaves out a band the brief cannot fill, and lists what it needs once, at the top', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lt-about-'));
  try {
    const r = node([join(root, 'scripts/compose.mjs'), 'About page for Meridian, an architecture studio', '--project', dir, '--write']);
    assert.equal(r.status, 0, r.stderr);
    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    assert.match(html, /<section class="lt-hero-statement"[^>]*id="top"/);
    assert.ok(!html.includes('lt-stats-band') && !html.includes('data-part="facts"') && !/<p>TODO/.test(html), 'no figures and no placeholder paragraphs');
    assert.match(html, /<!-- TODO before this page ships[\s\S]*The story:[\s\S]*-->/);
    assert.match(r.stdout, /Still needed/);
    const a = node([join(root, 'scripts/audit-ui.mjs'), join(dir, 'index.html'), '--product', 'Meridian', '--viewports', 'desktop', '--modes', 'light']);
    assert.match(a.stdout, / 0 errors/, a.stdout);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('names with more than one word, an audience for every plan, and an action that fits the page', () => {
  assert.equal(compose('Home page for Canal Street Food Bank, a volunteer-run charity in Birmingham').designBrief.product, 'Canal Street Food Bank');
  assert.equal(compose('Website home page for Harrow & Finch, a three-partner employment law firm in Manchester').designBrief.product, 'Harrow & Finch');
  assert.equal(compose('Website for Signal & Noise, a one-day data journalism conference in Glasgow').designBrief.product, 'Signal & Noise');
  assert.equal(compose('Landing page for Tally, an invoicing tool for freelancers').designBrief.product, 'Tally');
  const kb = JSON.parse(readFileSync(join(root, 'engine/compose/page-types.json'), 'utf8'));
  for (const d of kb.domains) for (const page of ['landing page', 'dashboard', 'about page']) {
    const p = compose(`${page} for a ${d.words[0]} business`);
    assert.ok(p.designBrief.audience && !/undefined/.test(p.designBrief.audience), `${d.id} ${page}: audience`);
  }
  const act = (brief) => compose(brief).questions.find((q) => q.id === 'action')?.default ?? '';
  assert.match(act('Website for a two-day design conference in Leeds'), /ticket/i);
  assert.match(act('Home page for a charity that runs food banks'), /Donate/);
  assert.doesNotMatch(act('Website for an emergency plumber in Hull'), /Start free/);
  // The programme and the fee list need the full width: never beside a rail.
  for (const brief of ['Website for a two-day design conference in Leeds', 'Website for an accountant in Leeds']) for (const l of compose(brief).artDirection.sections) if (l.id === 'service-list') assert.equal(l.layout, null);
});

test('plans put pictures where paragraphs were, and say how the page moves', () => {
  const p = compose('Home page for Cedar Street Dental, a family dentist in Leeds');
  const ids = p.sections.map((x) => x.id);
  for (const id of ['scroll-statement', 'bento-grid', 'stack-cards']) assert.ok(ids.includes(id), id);
  assert.ok(!ids.includes('how-it-works') && !ids.includes('service-list'), 'steps and fees are not paragraphs');
  assert.equal(p.sections.find((x) => x.id === 'visit-info').tone, 'dark');
  assert.match(p.artDirection.words, /caption/);
  assert.match(p.artDirection.motion, /data-entrance/);
  // A software landing page gets its one dark band for the product, and the draft never puts two tinted bands together.
  const dir = mkdtempSync(join(tmpdir(), 'lt-moves-'));
  try {
    node([join(root, 'scripts/compose.mjs'), 'Website for Harrow & Finch, a three-partner employment law firm at 4 King Street, Manchester M2 4LQ, settlement agreement review from £450, unfair dismissal advice from £300, a free 20-minute first call, partners Ruth Harrow, Sam Finch and Priya Shah, open Monday to Friday 9 to 5.30, phone 0161 496 0322', '--project', dir, '--write']);
    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    assert.match(html, /<main id="main" data-scroll( data-lt="number-settle")?>/);
    assert.ok((html.match(/data-tone="dark"/g) ?? []).length <= 1);
    // Grounds alternate: no two neighbouring bands on the same ground (plain, well, dark, brand).
    const tones = [...html.matchAll(/<section class="lt-[^"]+"([^>]*)>/g)].map((m) => /data-tone="(\w+)"/.exec(m[1])?.[1] ?? 'plain');
    for (let i = 1; i < tones.length; i++) assert.ok(tones[i] !== tones[i - 1], `bands ${i - 1} and ${i} share the ${tones[i]} ground`);
    assert.ok([...html.matchAll(/<section class="lt-[^"]+"[^>]*>/g)].every((m) => /data-rhythm="(quiet|busy)"/.test(m[0])), 'every band carries its beat');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('no subject default is a default look: every plan says to take the look from the subject', () => {
  const pal = JSON.parse(readFileSync(join(root, 'tokens/palettes/palettes.json'), 'utf8')).palettes;
  const kb = JSON.parse(readFileSync(join(root, 'engine/compose/page-types.json'), 'utf8'));
  const num = (s) => s.match(/[\d.]+/g).map(Number);
  const BOOK = new Set(['bookish', 'editorial', 'didone']);
  for (const d of kb.domains) {
    const p = pal.find((x) => x.id === d.palette);
    const [L, C, H] = num(p.modes.light.tokens['bg-canvas'].oklch), [, aC, aH] = num(p.modes.light.tokens['accent-solid'].oklch);
    const cream = L >= 0.93 && C >= 0.006 && H >= 55 && H <= 100;
    const warm = (aH >= 12 && aH <= 58 && aC >= 0.06) || (aH >= 125 && aH <= 178 && aC >= 0.04);
    assert.ok(!(cream && BOOK.has(d.typography) && warm), `${d.id}: cream, a book serif and a terracotta or forest accent`);
  }
  assert.match(spawnSync(process.execPath, [join(root, 'scripts/compose.mjs'), 'Website for an accountant in Leeds'], { encoding: 'utf8' }).stdout, /data-look-reason/);
});

test('look flags carry into the plan; --type that names a typeface is read as one', () => {
  const p = compose('portfolio for a landscape photographer', '--palette', 'petrol-peach', '--typeface', 'slab', '--mode', 'dark');
  assert.deepEqual([p.pageType.id, p.profile.palette, p.profile.typography, p.profile.mode], ['portfolio', 'petrol-peach', 'slab', 'dark']);
  assert.match(p.install, /--palette petrol-peach .*--type slab/);
  const q = compose('portfolio for a landscape photographer', '--type', 'editorial');
  assert.equal(q.pageType.id, 'portfolio');
  assert.equal(q.profile.typography, 'editorial');
});


test('words from the subject: facts come from the brief, never from filler', async () => {
  const { extractFacts, heroCopy, figuresFrom } = await import(join(root, 'engine/compose/words.mjs'));
  const bakery = extractFacts('Home page for Crumb & Co, a sourdough bakery on Mill Lane in Frome, open from 7:30 Tuesday to Sunday, loaves from £4.20 and a Saturday bread class for £65', { product: 'Crumb & Co' });
  assert.deepEqual([bakery.kind, bakery.street, bakery.place, bakery.days], ['sourdough bakery', 'Mill Lane', 'Frome', 'Tuesday to Sunday']);
  assert.deepEqual(bakery.prices.map((p) => [p.value, p.what, p.from]), [['£4.20', 'loaves', true], ['£65', 'Saturday bread class', false]]);
  assert.deepEqual(bakery.times.map((t) => t.value), ['7:30'], 'a price is never read as a time');
  const charity = extractFacts('Home page for Canal Street Food Bank, a volunteer-run charity in Birmingham that gave out 410 food parcels a week last winter, open Monday and Thursday 10 to 2');
  assert.deepEqual([charity.counts[0].value, charity.counts[0].what, charity.counts[0].per, charity.counts[0].when], ['410', 'food parcels', 'a week', 'last winter']);
  assert.equal(charity.times[0].value, '10 to 2');
  const { openingHours } = await import(join(root, 'engine/compose/words.mjs'));
  assert.deepEqual(openingHours(charity), { 1: '10:00 to 14:00', 2: null, 3: null, 4: '10:00 to 14:00', 5: null, 6: null, 7: null });
  assert.equal(openingHours(extractFacts('a cafe open Tuesday to Sunday 8am to 4pm'))[1], null);
  assert.equal(openingHours(extractFacts('a cafe open Tuesday to Sunday 8am to 4pm'))[7], '8:00 to 16:00');
  assert.equal(openingHours(extractFacts('a bakery open from 7:30 Tuesday to Sunday')), null, 'no closing time, no table: hours are never guessed');
  const saas = extractFacts('Landing page for Tally, an invoicing tool for freelancers that sends an invoice in 30 seconds and chases late payers, £9 a month');
  assert.deepEqual(saas.claims, ['sends an invoice in 30 seconds', 'chases late payers']);
  assert.equal(saas.prices[0].what, null, 'a price after a comma belongs to the product, not to "late payers"');
  assert.equal(heroCopy(saas, { typeId: 'landing', product: 'Tally' }).headline, 'Send an invoice in 30 seconds');
  assert.equal(figuresFrom(saas).find((f) => f.value === '30 seconds').label, 'to send an invoice');
  const build = extractFacts('Website for Brickwell Build, a construction firm in Bristol building house extensions and loft conversions, a £40,000 single-storey extension in 12 weeks');
  assert.equal(heroCopy(build, { typeId: 'service-landing', product: 'Brickwell Build' }).headline, 'Single-storey extensions in 12 weeks');
  assert.deepEqual(build.offers, ['house extensions', 'loft conversions']);
  // A brief with nothing specific gets a TODO asking for facts, not invented ones.
  const thin = heroCopy(extractFacts('website for a dentist'), { typeId: 'service-landing', product: null });
  assert.equal(thin.headline, 'A dentist', 'nothing specific: what it is, still true');
  assert.ok(thin.todo.includes('one real price'));
  // Every value found is a substring of the brief.
  for (const brief of ['Home page for Crumb & Co, a sourdough bakery on Mill Lane in Frome, open from 7:30, loaves from £4.20', 'Website for Harrow & Finch, an employment law firm in Manchester, settlement agreement review from £450, free 20-minute first call']) {
    for (const f of figuresFrom(extractFacts(brief))) assert.ok(brief.includes(f.value.split(' ')[0]), `${f.value} is in the brief`);
  }
});

test('one bold idea per page, from the brief\'s own figure, and a request when there is none', async () => {
  const { extractFacts } = await import(join(root, 'engine/compose/words.mjs'));
  const { boldIdea, colourName } = await import(join(root, 'engine/compose/idea.mjs'));
  const sig = { name: 'Plain terms', how: 'The first fee set large in the hero. Nothing decorative.' };
  const type = (id) => ({ id, kind: 'marketing' });
  const build = boldIdea({ facts: extractFacts('a construction firm, a £40,000 single-storey extension in 12 weeks'), type: type('service-landing'), hero: 'hero-split', signature: sig, accent: 'red', sections: [] });
  assert.match(build.text, /£40,000 fixed price .* set huge on red/);
  assert.equal(build.place, 'hero-visual');
  const bakery = boldIdea({ facts: extractFacts('a bakery, open from 7:30, loaves from £4.20'), type: type('venue'), hero: 'hero-split', signature: sig, accent: 'green', sections: [] });
  assert.match(bakery.text, /^the 7:30 opening time as the hero/);
  const none = boldIdea({ facts: extractFacts('website for a dentist'), type: type('service-landing'), hero: 'hero-split', signature: sig, accent: 'red', sections: [] });
  assert.equal(none.fromBrief, false);
  assert.match(none.ask, /one true figure/);
  assert.equal(colourName([0.35, 0.12, 262]), 'navy');
  assert.equal(colourName([0.58, 0.2, 30]), 'red');
  const plan = compose('Website for Brickwell Build, a construction firm in Bristol building house extensions, a £40,000 single-storey extension in 12 weeks');
  assert.equal(plan.pageType.id, 'service-landing', 'a construction firm is a trade, not software, even with "extension" in the brief');
  assert.match(plan.artDirection.boldIdea.text, /£40,000/);
  assert.ok(plan.rhythm.strip.startsWith('hero '));
  assert.deepEqual(plan.rhythm.broken, []);
});

test('compose --write puts the subject in the draft: headline, bold idea, rhythm, and no sample figures', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lt-subject-'));
  try {
    const r = node([join(root, 'scripts/compose.mjs'), 'Website for Brickwell Build, a construction firm in Bristol building house extensions and loft conversions, fixed-price quotes, a £40,000 single-storey extension in 12 weeks', '--project', dir, '--write']);
    assert.equal(r.status, 0, r.stderr);
    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    assert.match(html, /<h1[^>]*><span style="white-space: nowrap">Single-storey<\/span> extensions in 12 weeks<\/h1>/, 'hyphens never break in the headline');
    assert.match(html, /<!-- Bold idea: the £40,000 fixed price/);
    assert.match(html, /data-tone="(swatch|dark)"[\s\S]*?<p data-part="figure"[^>]*>£40,000<\/p>/);
    assert.match(html, /<p data-part="eyebrow">Construction firm · Bristol<\/p>/);
    assert.ok(!html.includes('Book a check-up'), 'the sample\'s action label is replaced');
    assert.match(html, />Get a quote</);
    assert.match(html, /<title>Brickwell Build · Construction firm in Bristol<\/title>/);
    const bands = [...html.matchAll(/<section class="lt-[^"]+"[^>]*>/g)].map((m) => m[0]);
    assert.ok(bands.every((b) => /data-rhythm="(quiet|busy)"/.test(b)), 'every band carries its beat');
    assert.equal(bands.filter((b) => /data-scale="display"/.test(b)).length, Math.min(2, bands.length), 'the first screen and the close');
    assert.ok(bands.filter((b) => /data-tone="dark"/.test(b)).length <= 1 && bands.filter((b) => /data-tone="accent"/.test(b)).length <= 1);
    assert.match(r.stdout, /\*\*Rhythm \(as drafted\):\*\* `hero ▇ XL/);
    assert.match(r.stdout, /Found in the brief: kind: construction firm; place: Bristol/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('drafts composed from five briefs carry no sample business: no brand, place, person, price or subject noun from any blueprint', () => {
  const BRIEFS = {
    bakery: 'Home page for Crumb & Co, a sourdough bakery at 12 Mill Lane, Frome BA11 1AB, open Tuesday to Sunday 7:30 to 3, loaves from £4.20, cinnamon buns £3 and a Saturday bread class for £65, run by Nell and Owen Hart, phone 01373 496 210',
    solicitors: 'Website for Harrow & Finch, a three-partner employment law firm at 4 King Street, Manchester M2 4LQ, fixed-fee settlement agreement review from £450, unfair dismissal advice from £300, a free 20-minute first call, partners Ruth Harrow, Sam Finch and Priya Shah, open Monday to Friday 9 to 5.30, phone 0161 496 0322',
    saas: 'Landing page for Tally, an invoicing tool for freelancers that sends an invoice in 30 seconds, chases late payers on day 7, 14 and 30 and matches bank payments, £9 a month, how it works: add a client, send the invoice, get paid',
    construction: 'Website for Brickwell Build, a construction firm in Bristol building house extensions and loft conversions, fixed-price quotes, a £40,000 single-storey extension in 12 weeks, a loft conversion from £48,000, how it works: free site visit, then a fixed-price quote within 5 days, then a start date, phone 0117 496 0418',
    charity: "Home page for Canal Street Food Bank, a volunteer-run charity at St Mark's Hall, 41 Canal Street, Birmingham B5 6EJ, that gave out 410 food parcels a week last winter with 60 volunteers, open Monday and Thursday 10 to 2, £10 feeds a household for a week",
  };
  // The sample businesses' words: each blueprint's brand names, the proper nouns and prices in its copy, and
  // the nouns of its subject. A word that is also in the brief is the brief's, not the sample's.
  const SUBJECT = {
    venue: ['coffee', 'coffees', 'roasted', 'roaster', 'roastery', 'beans', 'espresso', 'tasting', 'Huila', 'Sidamo'],
    practice: ['dentist', 'dentists', 'dental', 'hygienist', 'fillings', 'check-up', 'teeth', 'tooth', 'patients', 'whitening', 'NHS'],
    cause: ['pantry', 'church', 'shops', 'households', 'nappies', 'Gift Aid', 'referral'],
    shop: ['mugs', 'glaze', 'stoneware', 'kiln'],
    event: ['speakers', 'programme', 'keynote'],
    landing: ['dashboard', 'dashboards', 'charts', 'MRR', 'Postgres', 'warehouse', 'metric'],
  };
  const COMMON = new Set(['The', 'A', 'An', 'We', 'You', 'Your', 'Our', 'It', 'If', 'In', 'On', 'At', 'For', 'From', 'To', 'And', 'Or', 'No', 'Yes', 'Open', 'Closed', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Today', 'Book', 'Call', 'Privacy', 'Terms', 'Contact', 'Address', 'Opening', 'Questions', 'Find', 'Free', 'Get', 'See', 'Menu', 'Skip', 'Choose', 'Date', 'Time', 'People', 'Fees', 'How', 'What', 'Who', 'Where', 'When', 'Why', 'One', 'Two', 'Three', 'Four', 'Ltd', 'Every', 'Each', 'This', 'That', 'All', 'Any', 'Most', 'Some', 'Do', 'Is', 'Are', 'Can', 'Will', 'By', 'With', 'Pay', 'Give', 'Bring', 'Before', 'After', 'Then', 'Next', 'Previous', 'Clear', 'Start', 'Prices', 'Price', 'Visit', 'Hours', 'Phone', 'Email', 'Partner', 'Owner']);
  const sampleWords = (bp) => {
    const dir = join(root, 'blueprints', bp);
    const meta = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8'));
    const text = readFileSync(join(dir, 'index.html'), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&');
    const words = new Set([...(meta.brand ?? []), ...(SUBJECT[bp] ?? [])]);
    for (const m of text.matchAll(/(?<=[a-z,]\s)([A-Z][a-z]{3,}(?:\s[A-Z][a-z]+)*)/g)) if (!COMMON.has(m[1].split(' ')[0])) words.add(m[1]);
    for (const m of text.matchAll(/£\d[\d,.]*/g)) words.add(m[0]);
    return words;
  };
  const all = new Map();
  for (const bp of ['venue', 'practice', 'cause', 'shop', 'event', 'landing']) for (const w of sampleWords(bp)) all.set(w, bp);
  const dir = mkdtempSync(join(tmpdir(), 'lt-five-'));
  try {
    for (const [slug, brief] of Object.entries(BRIEFS)) {
      const r = node([join(root, 'scripts/compose.mjs'), brief, '--project', join(dir, slug), '--write']);
      assert.equal(r.status, 0, r.stderr);
      const html = readFileSync(join(dir, slug, 'index.html'), 'utf8');
      // What a visitor or a search engine sees: the page without its comments (the brief and the TODO list).
      const seen = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/&amp;/g, '&');
      const visible = seen.replace(/<[^>]+>/g, ' ');
      const left = [...all].filter(([w]) => !brief.toLowerCase().includes(w.toLowerCase()) && new RegExp(`(^|[^\\w£])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w,.]*\\d)(?!\\w)`, 'i').test(visible)).map(([w, bp]) => `${w} (${bp})`);
      assert.deepEqual(left, [], `${slug}: sample words left`);
      // Every figure on the page is the brief's.
      for (const m of visible.matchAll(/£\d[\d,.]*/g)) assert.ok(brief.includes(m[0].replace(/\.$/, '')), `${slug}: ${m[0]} is not in the brief`);
      // What the brief did not give is asked for once, at the top, not invented.
      assert.ok(html.indexOf('<!-- TODO before this page ships') < html.indexOf('<main') || !html.includes('TODO before'), slug);
      assert.match(r.stdout, /composed band by band from the brief/);
    }
    // A thin brief gets a short page and a long TODO list, never a sample's sections.
    const thin = node([join(root, 'scripts/compose.mjs'), 'Website for a dentist in Leeds', '--project', join(dir, 'thin'), '--write']);
    const html = readFileSync(join(dir, 'thin', 'index.html'), 'utf8');
    assert.ok(!/Kestrel|Harrogate|hygienist|£68/.test(html.replace(/<!--[\s\S]*?-->/g, '')), thin.stdout.slice(0, 200));
    assert.match(html, /<!-- TODO before this page ships[\s\S]*the people, with their names and roles/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('each kind of subject gets its own lettering, with the reason in the plan; --typeface still wins', () => {
  const cases = [
    ['Website for an emergency plumber in Hull', 'stamped'],
    ['Website for Brickwell Build, a construction firm in Bristol', 'stencil'],
    ['Website for a two-day design conference in Leeds', 'stadium'],
    ['Home page for Cedar Street Dental, a family dentist in Leeds', 'hyperlegible'],
    ['Website for a ferry timetable between two islands', 'signage'],
    ['Website for a walking holiday company', 'signage'],
    ['Website for Harrow & Finch, an employment law firm', 'legal'],
    ['Landing page for Relay, a webhooks API', 'workbench'],
    ['Website for an after-school club for children', 'schoolbook'],
  ];
  for (const [brief, type] of cases) {
    const p = compose(brief);
    assert.equal(p.profile.typography, type, brief);
    assert.ok(p.typeWhy && p.typeWhy.length > 20, `${brief}: a reason`);
  }
  assert.equal(compose('Landing page for Relay, a webhooks API').profile.mode, 'light', 'workbench sits on a light ground');
  const own = compose('Website for Brickwell Build, a construction firm in Bristol', '--typeface', 'swiss');
  assert.deepEqual([own.profile.typography, own.typeWhy], ['swiss', 'you chose it']);
  assert.match(node([join(root, 'scripts/compose.mjs'), 'Website for an emergency plumber in Hull']).stdout, /type `stamped` \(stamped letters/);
});

test('every band a draft writes has something to look at; software shows itself; moments are chosen, at most two, never side by side', () => {
  const BRIEFS = {
    bakery: 'Home page for Crumb & Co, a sourdough bakery at 12 Mill Lane, Frome BA11 1AB, open Tuesday to Sunday 7:30 to 3, loaves from £4.20, cinnamon buns £3 and a Saturday bread class for £65, run by Nell and Owen Hart, phone 01373 496 210',
    builder: 'Website for Brickwell Build, a construction firm in Bristol building house extensions and loft conversions, fixed-price quotes, a £40,000 single-storey extension in 12 weeks, a loft conversion from £48,000, how it works: free site visit, then a fixed-price quote within 5 days, then a start date, phone 0117 496 0418',
    saas: 'Landing page for Tally, an invoicing tool for freelancers that sends an invoice in 30 seconds, chases late payers on day 7, 14 and 30 and matches bank payments, £9 a month, how it works: add a client, send the invoice, get paid',
    charity: "Home page for Canal Street Food Bank, a volunteer-run charity at St Mark's Hall, 41 Canal Street, Birmingham B5 6EJ, that gave out 410 food parcels a week last winter with 60 volunteers, open Monday and Thursday 10 to 2, £10 feeds a household for a week",
    thin: 'Website for a dentist in Leeds',
  };
  // Something to look at: a picture (art panel, device), a figure set large, the hours as a table, the first
  // screen's headline, or the people as rows people scan. The close is the brand band.
  const LOOK = /class="lt-(art|device)|data-part="figure"|<table|<h1|lt-team-grid|lt-cta-band/;
  const dir = mkdtempSync(join(tmpdir(), 'lt-visual-'));
  try {
    for (const [slug, brief] of Object.entries(BRIEFS)) {
      const r = node([join(root, 'scripts/compose.mjs'), brief, '--project', join(dir, slug), '--write']);
      assert.equal(r.status, 0, r.stderr);
      const html = readFileSync(join(dir, slug, 'index.html'), 'utf8');
      const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
      const bands = main.split(/(?=<section class=")/).slice(1);
      assert.ok(bands.length >= 3, `${slug}: at least a first screen, a picture and a close`);
      for (const b of bands) assert.match(b, LOOK, `${slug}: a band with nothing to look at: ${b.slice(0, 80)}`);
      assert.ok((main.match(/class="lt-(art|device)"/g) ?? []).length >= 1, `${slug}: a picture at least`);
      // Moments: named in the strip and the plan, two at most, never in neighbouring bands, never the first screen.
      const marked = bands.map((b) => /data-lt="(sticky-story|side-scroll)"|data-zoom|data-count/.test(b));
      assert.ok(marked.filter(Boolean).length <= 2, slug);
      for (let i = 1; i < marked.length; i++) assert.ok(!(marked[i] && marked[i - 1]), `${slug}: two moments side by side`);
      assert.ok(!marked[0], `${slug}: no moment in the first screen`);
      assert.match(r.stdout, /Moments \(two at most, never side by side\): /);
      // Neighbouring panels never repeat a drawing.
      const motifs = [...main.matchAll(/<li><article>\s*<figure class="lt-art"[^>]*?(?:data-motif="([a-z]+)")?[^>]*>/g)].map((m) => m[1] ?? null);
      for (let i = 1; i < motifs.length; i++) if (motifs[i]) assert.notEqual(motifs[i], motifs[i - 1], `${slug}: neighbouring drawings`);
    }
    const saas = readFileSync(join(dir, 'saas', 'index.html'), 'utf8');
    assert.match(saas, /<figure class="lt-device" data-kind="laptop" data-audit-ignore>[\s\S]*?<div data-app="desktop" inert>[\s\S]*?<p data-a="brand">Tally<\/p>/, 'the product itself in the first screen');
    // The screen is filled from the brief: its figures as KPIs, what it does as a list, its steps as a table.
    const screen = saas.slice(saas.indexOf('<div data-app="desktop"'), saas.indexOf('</figure>', saas.indexOf('<div data-app="desktop"')));
    assert.match(screen, /data-a="kpis"[\s\S]*£9[\s\S]*30 seconds/);
    assert.match(screen, /<ul data-a="list"><li><span><b>Sends an invoice in 30 seconds<\/b>/);
    assert.match(screen, /<table data-a="table">[\s\S]*Add a client[\s\S]*Get paid/);
    for (const m of screen.matchAll(/£\d[\d,.]*/g)) assert.ok(BRIEFS.saas.includes(m[0]), `${m[0]} is the brief's`);
    // The pinned scene uses phones: a laptop's screen is a thumbnail on a 390px screen.
    assert.match(saas.slice(saas.indexOf('data-lt="sticky-story"')), /class="lt-device" data-kind="phone"/);
    assert.ok(!/Larkspur|Kestrel|Halyard|Invoice 0042/.test(saas), 'never the sample invoice');
    assert.match(saas, /data-lt="sticky-story"/, 'three steps and a product: the pinned scene');
    const builder = readFileSync(join(dir, 'builder', 'index.html'), 'utf8');
    for (const tile of builder.match(/<article[^>]*>[\s\S]*?<\/article>/g).filter((a) => !a.includes('lt-art'))) assert.match(tile, /data-part="figure"/, 'no empty tiles');
    assert.match(builder, /Also: House extensions, on a fixed-price quote\./);
    const thin = readFileSync(join(dir, 'thin', 'index.html'), 'utf8');
    assert.match(thin, /data-motif="tooth"/, 'a thin brief still shows the subject');
    // Never the same drawing twice when the subject has another that fits.
    const thinMotifs = [...thin.matchAll(/data-motif="([a-z]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(thinMotifs).size, thinMotifs.length, thinMotifs.join(' '));
    // People are something to look at without faces: initials in a disc.
    const sol = node([join(root, 'scripts/compose.mjs'), 'Website for Harrow & Finch, a law firm in Manchester, partners Ruth Harrow, Sam Finch and Priya Shah, settlement agreement review from £450', '--project', join(dir, 'sol'), '--write']);
    assert.equal(sol.status, 0, sol.stderr);
    assert.match(readFileSync(join(dir, 'sol', 'index.html'), 'utf8'), /<li><span data-part="avatar" data-n="0" style="border-radius: 50%" aria-hidden="true">RH<\/span><strong>Ruth Harrow<\/strong>/);
    // The bold idea's panel stays a dark object in both modes on a short page (the palette's own dark tokens).
    assert.match(readFileSync(join(dir, 'bakery', 'index.html'), 'utf8'), /<figure class="lt-art" data-variant="figure" data-tone="dark"/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('--images runs find-images over the draft (off by default; no network here: a local empty source)', async () => {
  const { createServer } = await import('node:http');
  const server = createServer((req, res) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ results: [] })); });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const dir = mkdtempSync(join(tmpdir(), 'lt-imgdraft-'));
  try {
    const brief = 'Website for Brickwell Build, a construction firm in Bristol, a £40,000 single-storey extension in 12 weeks';
    const off = node([join(root, 'scripts/compose.mjs'), brief, '--project', join(dir, 'a'), '--write']);
    assert.match(off.stdout, /Photographs: no photographs fetched[\s\S]*Add --images/);
    const env = { ...process.env, LT_OPENVERSE: `http://127.0.0.1:${server.address().port}/ov/`, LT_COMMONS: `http://127.0.0.1:${server.address().port}/cm`, LT_PHOTOS: join(dir, 'no-sets') };
    const r = await new Promise((res) => { const c = spawn(process.execPath, [join(root, 'scripts/compose.mjs'), brief, '--project', join(dir, 'b'), '--write', '--images', '--json'], { env }); let out = ''; c.stdout.on('data', (d) => { out += d; }); c.on('close', (code) => res({ code, out })); });
    assert.equal(r.code, 0);
    const plan = JSON.parse(r.out);
    assert.equal(plan.draft.images.ran, true);
    assert.equal(plan.draft.images.set, 0);
    assert.match(readFileSync(join(dir, 'b', 'index.html'), 'utf8'), /data-motif="crane"/, 'nothing matched: the drawings stay');
  } finally { server.close(); rmSync(dir, { recursive: true, force: true }); }
});
