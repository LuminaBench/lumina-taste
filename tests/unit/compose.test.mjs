// The page composer: every id it names exists, briefs land on the right page type, and the
// install command it prints actually runs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
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
  assert.deepEqual(studio.artDirection.mainAttributes, ['data-separators="rules"', 'data-numbered']);
  const saas = compose('landing page for a project management app for agencies');
  assert.equal(saas.sections.find((s) => /^hero-/.test(s.id)).id, 'hero-split');
  assert.deepEqual(saas.artDirection.mainAttributes, []);
  assert.match(compose('Landing page for Relay, a webhooks API').artDirection.signature.name, /Code/);
});

test('compose --write produces a composed draft that audits clean, with real anchors and the plan\'s layouts', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lt-draft-'));
  try {
    const r = node([join(root, 'scripts/compose.mjs'), 'Landing page for Meridian, an architecture studio in Leeds', '--project', dir, '--write']);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /A first draft is written/);
    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    assert.match(html, /<main id="main" data-separators="rules" data-numbered>/);
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

test('compose --write drafts a plain section where no part fits, and the critic will not let its placeholder ship', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lt-about-'));
  try {
    const r = node([join(root, 'scripts/compose.mjs'), 'About page for Meridian, an architecture studio', '--project', dir, '--write']);
    assert.equal(r.status, 0, r.stderr);
    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    assert.match(html, /<section class="lt-section" id="the-story" data-layout="rail"/);
    assert.match(html, /<p>TODO: Two or three short paragraphs/);
    // Figures are shown once: the statement hero drops its facts when the page has a figures section.
    assert.ok(html.includes('lt-hero-statement') && html.includes('lt-stats-band') && !html.includes('data-part="facts"'));
    const a = node([join(root, 'scripts/audit-ui.mjs'), join(dir, 'index.html'), '--product', 'Meridian', '--viewports', 'desktop', '--modes', 'light']);
    assert.match(a.stdout, /taste-sample-content/);
    assert.match(a.stdout, /TODO: Two or three short paragraphs/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

