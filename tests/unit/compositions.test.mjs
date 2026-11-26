// First screens, bars and feet chosen from the subject: ten different briefs never share one skeleton, and the
// kit's default split hero is never chosen by habit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chooseHero, chooseChrome, dateFrom, timetable, HERO_COMPOSITIONS } from '../../engine/compose/compositions.mjs';
import { fitWords, oneSentence } from '../../engine/compose/hero.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const compose = (brief, ...extra) => { const r = spawnSync(process.execPath, [join(root, 'scripts/compose.mjs'), brief, '--json', ...extra], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); return JSON.parse(r.stdout); };

const BRIEFS = {
  bakery: 'Home page for Crumb & Co, a sourdough bakery at 12 Mill Lane, Frome BA11 1AB, open Tuesday to Sunday 7:30 to 3, loaves from £4.20, cinnamon buns £3 and a Saturday bread class for £65, phone 01373 496 210',
  builder: 'Website for Brickwell Build, a construction firm in Bristol building house extensions and loft conversions, a £40,000 single-storey extension in 12 weeks, phone 0117 496 0418',
  saas: 'Landing page for Tally, an invoicing tool for freelancers that sends an invoice in 30 seconds, £9 a month, how it works: add a client, send the invoice, get paid',
  charity: 'Home page for Canal Street Food Bank, a volunteer-run charity in Birmingham that gave out 410 food parcels a week last winter',
  dentist: 'Home page for Cedar Street Dental, a family dentist in Leeds, check-up £68, hygienist £55, phone 0113 496 0721',
  ferry: 'Home page for Kestrel Ferries, a ferry from Kestrel Point to Moss Quay, sailings at 06:40, 07:10, 07:40 and 08:10',
  conference: 'Website for Larkspur Assembly, a two-day design conference in Halifax on 14 and 15 May 2027, tickets £240',
  studio: 'Landing page for Meridian, an architecture studio in Leeds',
  potter: 'Home page for Fernhill, a small pottery studio that sells mugs £28, bowls £24 and jugs £64 online',
  devtool: 'Landing page for Relay, a webhooks API that delivers every event in under a second',
};

test('ten different briefs get at least six different first screens, never the default split, each with its reason', () => {
  const plans = Object.fromEntries(Object.entries(BRIEFS).map(([k, b]) => [k, compose(b)]));
  const heroes = Object.values(plans).map((p) => p.artDirection.hero);
  for (const [k, p] of Object.entries(plans)) {
    const h = p.artDirection.hero;
    assert.ok(h && HERO_COMPOSITIONS[h.composition], `${k}: a composition`);
    assert.notEqual(h.composition, 'split', `${k}: the kit default split was chosen`);
    assert.ok(h.why.length > 20, `${k}: the reason is recorded`);
    // The plan's hero section is the composition's block, with its variant named in the rule.
    const sec = p.sections.find((s) => /^hero-/.test(s.id ?? ''));
    assert.equal(sec.id, h.block, k);
    if (h.variant) assert.match(sec.rule, new RegExp(`data-variant="${h.variant}"`), k);
    assert.ok(p.artDirection.nav?.why && p.artDirection.footer?.why, `${k}: bar and foot have reasons`);
  }
  assert.ok(new Set(heroes.map((h) => h.composition)).size >= 6, heroes.map((h) => h.composition).join(' '));
  // The subject decides: a timetable is a departures board, a dated event a poster, prices at a bakery a menu.
  assert.equal(plans.ferry.artDirection.hero.composition, 'departures');
  assert.equal(plans.conference.artDirection.hero.composition, 'poster');
  assert.equal(plans.bakery.artDirection.hero.composition, 'menu');
  assert.equal(plans.saas.artDirection.hero.composition, 'product');
  assert.equal(plans.studio.artDirection.hero.composition, 'cover');
  // A contrasting top bar on every page: ink, the brand colour, or a bar that only holds the name.
  for (const p of Object.values(plans)) assert.ok(p.artDirection.nav.tone || ['minimal', 'split'].includes(p.artDirection.nav.id), p.brief);
});

test('no two neighbouring sections share a composition, and no two subjects share a skeleton', () => {
  const skeletons = new Set();
  for (const [k, b] of Object.entries(BRIEFS)) {
    const p = compose(b);
    const comps = [p.artDirection.hero.composition, ...p.artDirection.sections.map((s) => s.composition)];
    for (let i = 1; i < comps.length; i++) assert.notEqual(comps[i], comps[i - 1], `${k}: ${comps[i]} twice in a row`);
    const sk = [...comps, p.artDirection.nav.id, p.artDirection.footer.id].join(' > ');
    assert.ok(!skeletons.has(sk), `${k} repeats another subject's skeleton: ${sk}`);
    skeletons.add(sk);
  }
});

test('drafts carry the composition: variant, bar and foot are written, and the first screen stays under 40 words', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lt-comp-'));
  try {
    const want = { ferry: /class="lt-hero-board"[^>]*data-variant="departures"[\s\S]*?<time datetime="06:40">06:40<\/time><b>Moss Quay<\/b>/, conference: /class="lt-hero-statement"[^>]*data-variant="poster"[\s\S]*?<time datetime="2027-05-14">14–15<\/time>/, studio: /class="lt-hero-cover"[\s\S]*?data-part="masthead" style="--cover-len: 8">Meridian<\/h1>/, saas: /class="lt-hero-split"[^>]*data-variant="product"/, builder: /class="lt-hero-split"[^>]*data-variant="bleed"[^>]*data-tone="dark"|class="lt-hero-split"[^>]*data-tone="dark"[^>]*data-variant="bleed"/, potter: /class="lt-hero-mosaic"[\s\S]*?<ul data-part="tiles">(\s*<li><figure class="lt-art"[\s\S]*?<\/li>){3}/ };
    for (const [k, re] of Object.entries(want)) {
      const r = spawnSync(process.execPath, [join(root, 'scripts/compose.mjs'), BRIEFS[k], '--project', join(dir, k), '--write'], { encoding: 'utf8' });
      assert.equal(r.status, 0, r.stderr);
      const html = readFileSync(join(dir, k, 'index.html'), 'utf8');
      assert.match(html, re, k);
      const hero = html.slice(html.indexOf('<section', html.indexOf('<main')), html.indexOf('</section>', html.indexOf('<main')));
      assert.doesNotMatch(hero, /data-part="note"/, `${k}: no note under the buttons`);
      const words = hero.replace(/<figure[\s\S]*?<\/figure>/g, ' ').replace(/<ul data-part="tiles">[\s\S]*?<\/ul>/g, ' ').replace(/<(video|button)[\s\S]*?<\/(video|button)>/g, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ').split(/\s+/).filter((w) => /[\w£]/.test(w));
      assert.ok(words.length <= 40, `${k}: ${words.length} words in the first screen`);
      assert.ok((hero.match(/class="lt-btn"/g) ?? []).length <= 2, `${k}: one action and at most one quiet link`);
    }
    // Bars and feet: the ferry has an ink bar, the studio a minimal one and its name as the foot's wordmark.
    assert.match(readFileSync(join(dir, 'ferry', 'index.html'), 'utf8'), /<header class="lt-nav-simple" data-lt="navbar-simple" data-tone="dark">/);
    const studio = readFileSync(join(dir, 'studio', 'index.html'), 'utf8');
    assert.match(studio, /<header class="lt-nav-simple" data-lt="navbar-simple" data-variant="minimal">/);
    assert.match(studio, /<footer class="lt-footer" data-variant="wordmark">[\s\S]*?<p data-part="wordmark" aria-hidden="true" style="--wordmark-len: 8">Meridian<\/p>/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('dates, timetables and the words budget', () => {
  assert.deepEqual(dateFrom('a conference on 14 and 15 May 2027'), { days: '14–15', month: 'May', year: '2027', iso: '2027-05-14', text: '14 and 15 May 2027' });
  assert.equal(dateFrom('wedding on June 3, 2027').iso, '2027-06-03');
  assert.equal(dateFrom('open every day'), null);
  assert.deepEqual(timetable({ brief: 'sailings at 06:40, 7:10 and 07.40, single £4.50' }), ['06:40', '07:10', '07:40']);
  assert.deepEqual(timetable({ brief: 'flat white £3.20, filter £3.40' }), []);
  assert.equal(oneSentence('One thing. Another thing.'), 'One thing.');
  const fitted = fitWords({ eyebrow: 'Sourdough bakery · Frome', headline: 'A sourdough bakery on Mill Lane in Frome with loaves', lede: 'Loaves from £4.20 and cinnamon buns for £3 every morning from half past seven. Classes on Saturday.', action: 'Book a class', secondary: 'See the loaves', note: 'Open Tuesday to Sunday' });
  assert.equal(fitted.note, null);
  assert.ok(!/Classes/.test(fitted.lede ?? ''));
  // Without the subject's facts the composer still avoids the default.
  const t = { id: 'landing', kind: 'marketing' };
  assert.notEqual(chooseHero({ type: { id: 'x', kind: 'marketing' }, domain: null, facts: { brief: 'something nice' } }).id, 'split');
  assert.equal(chooseHero({ type: t, domain: null, facts: { brief: 'a film of the workshop' } }).id, 'film');
  const chrome = chooseChrome({ type: { id: 'venue' }, domain: null, facts: { phone: '0117 496 0130', street: '4 Mill Street' }, hero: { id: 'menu' } });
  assert.equal(chrome.footer.id, 'contact');
});
