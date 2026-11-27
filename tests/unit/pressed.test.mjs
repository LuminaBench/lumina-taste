// Every control answers a touch: a base pressed state at zero specificity, still under reduced motion.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'tokens', 'base.css'), 'utf8');

test('base styles give buttons, tabs, switches, options and rows a pressed state', () => {
  const block = css.slice(css.indexOf('Pressed: every control answers a touch'));
  assert.match(block, /@media \(prefers-reduced-motion: no-preference\)\s*\{\s*:where\(button, \[role="button"\], \[role="tab"\], \[role="switch"\]/, 'small controls press down, only when motion is allowed');
  assert.match(block, /translate: 0 1px/, 'transform only: nothing reflows');
  assert.match(block, /:where\(\[role="option"\], \[role="menuitem"\]/, 'options and menu items darken');
  assert.match(block, /:not\(\.lt-btn/, 'the button keeps its own pressed state');
  assert.match(block, /forced-colors: active/, 'forced colours use the system highlight');
});
