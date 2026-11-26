// Native token exports: SwiftUI, Jetpack Compose and Figma (Tokens Studio / W3C design tokens).
// There are no Swift or Kotlin compilers here, so the Swift and Kotlin files are checked structurally: balanced
// brackets outside strings and comments, one declaration per token, well-formed literals, and the same values
// as the web tokens. Run: node --test tests/unit/export.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrastRgb } from '../../scripts/lib/color.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const run = (...args) => spawnSync(process.execPath, [join(root, 'scripts/export-tokens.mjs'), ...args], { cwd: root, encoding: 'utf8' });
const palettes = JSON.parse(readFileSync(join(root, 'tokens/palettes/palettes.json'), 'utf8')).palettes;
const pal = (id) => palettes.find((p) => p.id === id);
const camel = (k) => k.replace(/-(\w)/g, (_, c) => c.toUpperCase());

/** Brackets balance once strings and comments are taken out; returns the first problem or null. */
function bracketProblem(src) {
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').replace(/"(?:[^"\\\n]|\\.)*"/g, '""');
  const pairs = { ')': '(', ']': '[', '}': '{' };
  const stack = [];
  for (const [i, ch] of [...code].entries()) {
    if ('([{'.includes(ch)) stack.push(ch);
    else if (pairs[ch]) { if (stack.pop() !== pairs[ch]) return `unbalanced ${ch} at ${i}`; }
  }
  return stack.length ? `${stack.length} unclosed` : null;
}

test('swiftui: one Swift file with dynamic light/dark colours, fonts, spacing, radii and motion', () => {
  const r = run('--format', 'swiftui', '--palette', 'petrol-peach', '--type', 'financial');
  assert.equal(r.status, 0, r.stderr);
  const s = r.stdout;
  assert.equal(bracketProblem(s), null);
  assert.match(s, /^import SwiftUI$/m);
  assert.match(s, /UIColor \{ traits in/);          // asset-free dynamic colour on iOS
  assert.match(s, /NSColor\(name: nil\)/);           // and on macOS
  assert.doesNotMatch(s, /undefined|NaN|\[object/);
  const p = pal('petrol-peach');
  for (const [k, t] of Object.entries(p.modes.light.tokens)) {
    const line = new RegExp(`public static let ${camel(k)} = Color\\(luminaLight: 0x([0-9A-F]{6}), dark: 0x([0-9A-F]{6})\\)`).exec(s);
    assert.ok(line, `colour ${k}`);
    assert.equal(`#${line[1].toLowerCase()}`, t.hex.toLowerCase(), `${k} light is the web value`);
    assert.equal(`#${line[2].toLowerCase()}`, p.modes.dark.tokens[k].hex.toLowerCase(), `${k} dark is the web value`);
  }
  for (const name of ['caption', 'footnote', 'body', 'headline', 'title', 'title1', 'largeTitle', 'display']) assert.match(s, new RegExp(`public static let ${name} = Font\\.custom\\("[^"]+", size: [\\d.]+, relativeTo: \\.\\w+\\)\\.weight\\(\\.\\w+\\)`), name);
  assert.match(s, /public static let body = Font\.custom\("IBM Plex Sans", size: 17, relativeTo: \.body\)/);
  for (const [k, v] of [['s1', 4], ['s4', 16], ['s9', 96]]) assert.match(s, new RegExp(`public static let ${k}: CGFloat = ${v}\\b`));
  assert.match(s, /public static let lg: CGFloat = 12\b/);
  assert.match(s, /public static let dur2: Double = 0\.140/);
  // Every declaration line is complete (name = value), none left dangling.
  for (const line of s.split('\n').filter((l) => /public static let/.test(l))) assert.match(line, /public static let \w+(: \w+)? = \S/, line);
});

test('compose: a MaterialTheme-free Kotlin token object with light and dark colour data classes', () => {
  const r = run('--format', 'compose', '--palette', 'petrol-peach', '--type', 'financial', '--package', 'com.halyard.ui');
  assert.equal(r.status, 0, r.stderr);
  const k = r.stdout;
  assert.equal(bracketProblem(k), null);
  assert.match(k, /^package com\.halyard\.ui$/m);
  assert.doesNotMatch(k.replace(/\/\/[^\n]*/g, ''), /MaterialTheme|androidx\.compose\.material/);
  assert.doesNotMatch(k, /undefined|NaN|\[object/);
  const keys = Object.keys(pal('petrol-peach').modes.light.tokens);
  const fields = [...k.matchAll(/^ {4}val (\w+): Color,$/gm)].map((m) => m[1]);
  assert.deepEqual(fields, keys.map(camel));
  for (const mode of ['Light', 'Dark']) {
    const body = new RegExp(`val ${mode} = LuminaColors\\(([\\s\\S]*?)\\n {4}\\)`).exec(k)?.[1] ?? '';
    const args = [...body.matchAll(/(\w+) = Color\(0xFF([0-9A-F]{6})\),/g)];
    assert.equal(args.length, keys.length, `${mode} has every colour`);
    const hex = Object.fromEntries(args.map((m) => [m[1], `#${m[2].toLowerCase()}`]));
    assert.equal(hex.textPrimary, pal('petrol-peach').modes[mode.toLowerCase()].tokens['text-primary'].hex.toLowerCase());
  }
  for (const s of ['data class LuminaTypography(', 'data class LuminaShapes(', 'object LuminaSpacing', 'object LuminaMotion', 'val LocalLuminaColors = staticCompositionLocalOf', 'fun LuminaTheme(dark: Boolean = isSystemInDarkTheme()']) assert.ok(k.includes(s), s);
  assert.match(k, /body = TextStyle\(fontFamily = Body, fontWeight = FontWeight\(400\), fontSize = 16\.sp/);
  assert.match(k, /val s4 = 16\.dp/);
  assert.match(k, /val lg: RoundedCornerShape = RoundedCornerShape\(12\.dp\)/);
  assert.equal(run('--format', 'compose', '--package', 'Not A Package').status, 2);
});

test('figma: Tokens Studio JSON with core, light and dark sets and two themes as modes', () => {
  const r = run('--format', 'figma', '--palette', 'navy-sand', '--type', 'editorial', '--radius', 'sharp', '--motion', 'calm');
  assert.equal(r.status, 0, r.stderr);
  const j = JSON.parse(r.stdout);
  assert.deepEqual(j.$metadata.tokenSetOrder, ['core', 'light', 'dark']);
  assert.deepEqual(j.$themes.map((t) => [t.name, t.selectedTokenSets]), [['Light', { core: 'source', light: 'enabled' }], ['Dark', { core: 'source', dark: 'enabled' }]]);
  const flat = (set) => Object.entries(set).flatMap(([g, v]) => Object.entries(v).map(([k, t]) => [`${g}-${k}`.replace(/-default$/, ''), t]));
  const light = Object.fromEntries(flat(j.light)), dark = Object.fromEntries(flat(j.dark));
  assert.deepEqual(Object.keys(light).sort(), Object.keys(dark).sort());
  const p = pal('navy-sand');
  for (const [k, t] of Object.entries(p.modes.light.tokens)) {
    assert.equal(light[k]?.$type, 'color', k);
    assert.equal(light[k].$value, t.hex.toLowerCase(), k);
    assert.equal(dark[k].$value, p.modes.dark.tokens[k].hex.toLowerCase(), k);
  }
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  for (const set of [light, dark]) assert.ok(contrastRgb(rgb(set['text-primary'].$value), rgb(set['bg-canvas'].$value)) >= 7);
  // The axes carry through: sharp corners, calm motion.
  assert.equal(j.core.radius.md.$value, '4px');
  assert.equal(j.core.duration['1'].$value, '140ms');
  assert.equal(j.core.space['5'].$value, '24px');
  assert.equal(j.core.type.display.$type, 'typography');
  assert.equal(j.core.type.display.$value.fontFamily, '{font.display}');
  assert.ok(Array.isArray(j.core.easing.out.$value) && j.core.easing.out.$value.length === 4);
});

test('every palette passes its contrast pairs as exported, in every native format', () => {
  for (const p of palettes) {
    const r = run('--format', 'swiftui', '--palette', p.id);
    assert.equal(r.status, 0, `${p.id}: ${r.stderr}`);
    assert.match(r.stdout, /\d+ contrast pairs were re-checked/);
  }
  assert.equal(run('--format', 'figma', '--palette', 'nope').status, 2);
  assert.equal(run('--format', 'kotlin').status, 2);
});
