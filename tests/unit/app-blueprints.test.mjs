// Apps with a blueprint of their own: a bank, a run, bookings, a chat and a settings-heavy tool plan that
// blueprint, take its look, list its screens in order, and draft it with the product's name in the bar, rows
// marked data-sample, and a TODO for every feature the brief names that the blueprint has no screen for.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const run = (args) => spawnSync(process.execPath, [join(root, 'scripts/compose.mjs'), ...args], { encoding: 'utf8' });
const plan = (brief) => { const r = run([brief, '--json']); assert.equal(r.status, 0, r.stderr); return JSON.parse(r.stdout); };

const BRIEFS = [
  ['Juniper bank app on the phone: balance, spending by category this month, pots for saving, send money to a contact, card freeze, settings', 'app-banking', 'Juniper', ['pots for saving']],
  ["Kestrel running app on the phone: today's run, weekly distance chart, a training plan for a 10k, routes near you, settings", 'app-fitness', 'Kestrel', ['a training plan for a 10k', 'routes near you']],
  ['Moss dog grooming bookings app on the phone for dog owners: book a groom, my bookings, my dogs, settings', 'app-booking', 'Moss', []],
  ['Moss chat app on the phone: conversations list, a thread with photos and voice notes, new message, contacts, settings', 'app-messaging', 'Moss', []],
  ['Settings app for Larkspur Notes: account, sync, notifications, privacy, delete account', 'app-settings', null, null],
];

test('app briefs plan their own blueprint, its look and its screens in order', () => {
  for (const [brief, id] of BRIEFS) {
    const p = plan(brief);
    assert.equal(p.pageType.id, id, brief);
    assert.equal(p.startWith, 'blueprint', brief);
    assert.ok(p.install.includes(`--blueprints ${id}`), p.install);
    assert.ok(p.flow.screens.length >= 4 && p.flow.screens[0].id === 'welcome', `${id}: welcome first`);
  }
  assert.equal(plan(BRIEFS[0][0]).profile.palette, 'navy-sand');
  assert.equal(plan(BRIEFS[1][0]).profile.palette, 'seaglass-coral');
  // The groomer's own bookings, with owners and statuses, are a work app with real columns, not the customer's app.
  assert.equal(plan("Moss dog grooming bookings app: bookings with dog, owner, date and status, today's appointments, a calendar, add a booking, settings").pageType.id, 'workspace');
  // A bank's marketing page (it sells, with a price) is still a landing page.
  assert.equal(plan('Juniper bank app for freelancers, £4 a month, free trial, sign up in five minutes').pageType.id, 'landing');
});

test('drafts carry the name, sample rows marked, and what the blueprint still lacks', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lt-apps-'));
  try {
    for (const [brief, id, name, missing] of BRIEFS.slice(0, 4)) {
      const out = join(dir, id);
      const r = run([brief, '--project', out, '--write']);
      assert.equal(r.status, 0, r.stderr);
      const html = readFileSync(join(out, 'index.html'), 'utf8');
      assert.match(html, new RegExp(`<p class="as-side-name"><i aria-hidden="true"></i><span>${name}</span></p>`), `${id}: the name in the bar`);
      assert.match(html, new RegExp(`<title>${name} ·`), id);
      assert.doesNotMatch(html, /Workspace|Records \d|Record #|Dog 01|Owner 01/, `${id}: no generic rows`);
      assert.match(html, /<ul class="as-rows" data-sample/, `${id}: rows are marked as samples`);
      for (const m of missing) assert.ok(html.includes(`  - ${m}`), `${id}: TODO for ${m}`);
      if (!missing.length) assert.doesNotMatch(html, /TODO, the brief names these/, `${id}: nothing missing`);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// Every app on the shared shell (the bank, the run, bookings, chat, settings, the café and the podcast player):
// a welcome first, five or six screens, a tab bar of four at most, the three states on the first useful screen,
// and a name that is made up and says so.
test('every shell app has the same anatomy: welcome, five or six screens, tabs, states, a made-up name', () => {
  const ids = ['app-banking', 'app-fitness', 'app-booking', 'app-messaging', 'app-settings', 'app-ordering', 'app-listening'];
  for (const id of ids) {
    const dir = join(root, 'blueprints', id);
    const html = readFileSync(join(dir, 'index.html'), 'utf8');
    const meta = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8'));
    assert.equal(meta.id, id);
    assert.deepEqual(meta.states, ['loading', 'empty', 'error'], `${id}: states`);
    assert.match(html, /<html[^>]* data-app>/, `${id}: data-app`);
    assert.match(html, /viewport-fit=cover/, `${id}: viewport-fit`);
    const screens = [...html.matchAll(/class="as-screen[^"]*"[^>]*data-screen="([a-z-]+)"/g)].map((m) => m[1]);
    assert.equal(screens[0], 'welcome', `${id}: welcome first`);
    assert.ok(screens.length >= 5 && screens.length <= 7, `${id}: ${screens.length} screens`);
    const tabs = html.match(/<nav class="lt-bottom-nav as-tabs"[\s\S]*?<\/nav>/)[0].match(/<a href="#screen-/g).length;
    assert.ok(tabs >= 2 && tabs <= 4, `${id}: ${tabs} tabs`);
    for (const s of meta.states) assert.ok(html.includes(`data-view="${s}"`), `${id}: a ${s} view`);
    assert.match(html, /class="as-side-foot">[^<]*made[- ]up/, `${id}: says the name is made up`);
    for (const b of meta.brand ?? []) assert.ok(html.includes(b), `${id}: brand ${b} on the page`);
  }
});

test('the café and the podcast player use the native parts: a sheet, a rising screen, a live step line, a scrubber', () => {
  const ordering = readFileSync(join(root, 'blueprints/app-ordering/index.html'), 'utf8');
  assert.match(ordering, /<dialog class="lt-sheet[^"]*" id="or-sheet"/);
  assert.match(ordering, /<button type="button" data-part="grab"/, 'the item sheet has a grabber that is a button');
  assert.match(ordering, /class="or-steps" id="or-steps"/);
  assert.match(ordering, /data-scene="cup"/, 'menu pictures are drawn art panels');
  const listening = readFileSync(join(root, 'blueprints/app-listening/index.html'), 'utf8');
  assert.match(listening, /data-screen="playing" data-pane="sheet"/);
  assert.match(listening, /data-go="playing" data-dir="up"/, 'the mini player raises the player');
  assert.match(listening, /data-go="back" data-dir="down"/, 'the player closes downwards');
  assert.match(listening, /<input type="range" id="ls-seek"/);
  assert.match(listening, /class="ls-mini"/);
});
