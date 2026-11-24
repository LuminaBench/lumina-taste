import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeProfile, normalizeProfile, serializeProfile, validateProfile, DEFAULT_PROFILE } from '../../engine/profiles/profile.mjs';

test('default profile is valid and deterministic', () => {
  assert.deepEqual(validateProfile(normalizeProfile()), []);
  assert.equal(serializeProfile({ locks: ['radius', 'palette'] }), serializeProfile({ locks: ['palette', 'radius', 'palette'] }));
});

test('locked axes survive a merge, unlocked axes change', () => {
  const current = { ...DEFAULT_PROFILE, palette: 'navy-sand', locks: ['palette', 'overrides.accent-solid'], overrides: { 'accent-solid': 'oklch(0.4 0.1 260)' } };
  const { profile, applied, blocked } = mergeProfile(current, { palette: 'mono-lime', density: 'dense', overrides: { 'accent-solid': 'red', 'radius-md': '10px' } });
  assert.equal(profile.palette, 'navy-sand');
  assert.equal(profile.density, 'dense');
  assert.equal(profile.overrides['accent-solid'], 'oklch(0.4 0.1 260)');
  assert.equal(profile.overrides['radius-md'], '10px');
  assert.deepEqual(blocked.sort(), ['overrides.accent-solid', 'palette']);
  assert.ok(applied.includes('density'));
});

test('force overrides locks', () => {
  const { profile } = mergeProfile({ ...DEFAULT_PROFILE, locks: ['mode'] }, { mode: 'dark' }, { force: true });
  assert.equal(profile.mode, 'dark');
});

test('validation rejects unknown values and unsafe overrides', () => {
  const errs = validateProfile({ ...DEFAULT_PROFILE, palette: 'purple-haze', overrides: { 'x': 'red; } body{display:none' }, locks: ['vibes'] });
  assert.equal(errs.length, 3);
});
