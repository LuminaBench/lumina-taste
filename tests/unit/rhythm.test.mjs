// The rhythm planner: every page type's bands obey the rules (never three busy in a row, one dark band and
// one brand band at most, the first screen and the close the loudest, neighbours on different grounds and
// layouts), and app screens are planned as one ground.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planRhythm, checkRhythm, orderSections, rhythmStrip, beatAttrs, PROOF } from '../../engine/compose/rhythm.mjs';
import { direct } from '../../scripts/lib/art-direction.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const kb = JSON.parse(readFileSync(join(root, 'engine/compose/page-types.json'), 'utf8'));
const cat = JSON.parse(readFileSync(join(root, 'catalog.json'), 'utf8'));
const uiIds = new Set(cat.ui.map((u) => u.id));

/** Plan one page the way compose.mjs does: rhythm, then order, then layouts over that order. */
function plan(type, domain = null, { draft = true, canInsert = true } = {}) {
  const sections = type.sections.map((s, i) => ({ n: i + 1, ...s }));
  const r0 = planRhythm({ type, sections, draft, canInsert });
  const { sections: ordered, rhythm } = orderSections(sections, r0);
  const art = direct({ type, domain, profile: { style: null }, sections: ordered.filter((s) => !(draft && s.optional && PROOF.has(s.id))), uiIds });
  const shapes = rhythm.beats.map((b) => {
    if (b.n === rhythm.beats[0].n && /^hero-/.test(b.id ?? '')) return null;
    return art.sectionLayouts.find((l) => l.n === b.n)?.shape ?? null;
  });
  return { rhythm, shapes, ordered, art };
}

test('all 27 page types: the rhythm rules hold, with and without the optional sections', () => {
  assert.equal(kb.pageTypes.length, 27);
  for (const type of kb.pageTypes) for (const draft of [true, false]) for (const domain of [null, ...kb.domains]) {
    const { rhythm, shapes } = plan(type, domain, { draft });
    assert.ok(rhythm.beats.length > 0, `${type.id}: no bands`);
    assert.deepEqual(checkRhythm(rhythm, shapes), [], `${type.id}/${domain?.id ?? '-'}${draft ? '' : ' (with optional)'}: ${rhythmStrip(rhythm)}`);
  }
});

test('marketing pages are banded; app screens are one ground', () => {
  for (const type of kb.pageTypes) {
    const { rhythm } = plan(type);
    assert.equal(rhythm.banded, type.kind === 'marketing', type.id);
    if (!rhythm.banded) assert.ok(rhythm.beats.every((b) => b.ground === 'screen'), type.id);
  }
});

test('the close says the action again: a closing band is moved to the end, and is the one brand band', () => {
  const venue = plan(kb.pageTypes.find((t) => t.id === 'venue')).rhythm;
  assert.equal(venue.beats.at(-1).id, 'booking-bar');
  assert.deepEqual(venue.moved, ['booking-bar']);
  const landing = plan(kb.pageTypes.find((t) => t.id === 'landing')).rhythm;
  assert.equal(landing.beats.at(-1).ground, 'brand');
  assert.equal(landing.beats.at(-1).scale, 'display');
  assert.equal(landing.beats[0].scale, 'display');
  // A page that has a dark picture band does not get a second dark band.
  assert.ok(!(landing.beats.some((b) => b.ground === 'picture') && landing.beats.some((b) => b.ground === 'dark')));
});

test('three busy bands in a row are broken: a flexible band goes quiet, or a breather is added', () => {
  const type = { id: 'x', kind: 'marketing', sections: [{ id: 'hero-split' }, { id: 'pricing-tiers' }, { id: 'comparison-table' }, { id: 'terminal-window' }, { id: 'api-endpoint' }, { id: 'faq-section' }, { id: 'cta-band' }] };
  const sections = type.sections.map((s, i) => ({ n: i + 1, role: s.id, ...s }));
  const r = planRhythm({ type, sections });
  assert.equal(r.inserted[0], 'scroll-statement');
  assert.deepEqual(checkRhythm(r), []);
  const noInsert = planRhythm({ type, sections, canInsert: false });
  assert.equal(noInsert.inserted.length, 0);
  assert.deepEqual(checkRhythm(noInsert), []);
});

test('the strip is compact and the draft attributes name the ground and the beat', () => {
  const { rhythm } = plan(kb.pageTypes.find((t) => t.id === 'service-landing'));
  const strip = rhythmStrip(rhythm);
  assert.match(strip, /^hero [▇▁] XL/);
  assert.match(strip, / · /);
  assert.ok(strip.length < 260, strip);
  const close = rhythm.beats.at(-1);
  assert.deepEqual(beatAttrs(close), { tone: 'accent', attrs: 'data-rhythm="quiet" data-scale="display"' });
  assert.equal(beatAttrs({ density: 'busy', scale: 'normal', ground: 'plain' }).tone, null);
});
