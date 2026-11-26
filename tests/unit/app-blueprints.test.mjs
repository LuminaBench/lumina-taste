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
  ["Moss dog grooming bookings app: bookings with dog, owner, date and status, today's appointments, a calendar, add a booking, settings", 'app-booking', 'Moss', []],
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
