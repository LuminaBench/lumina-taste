// Every pairing a component may render, with its WCAG 2.x minimum.
// 7 = AAA body text, 4.5 = AA text, 3 = AA non-text UI (borders, focus rings, chart marks).
const SURFACES = ['bg-canvas', 'bg-surface-1', 'bg-surface-2', 'bg-surface-3'];
const READING = ['bg-canvas', 'bg-surface-1', 'bg-surface-2'];
const STATUS = ['positive', 'negative', 'warning', 'info'];

export const CHART_SERIES = 8;

export const RULES = [
  ['text-primary', SURFACES, 7],
  ['text-primary', ['accent-soft', ...STATUS.map((s) => `status-${s}-soft`)], 4.5],
  ['text-secondary', SURFACES, 4.5],
  ['text-muted', READING, 4.5],
  ['accent-ink', ['accent-solid', 'accent-hover'], 4.5],
  ['accent-solid', ['bg-canvas', 'bg-surface-1'], 3],
  ['accent-text', [...READING, 'accent-soft'], 4.5],
  ['focus-ring', READING, 3],
  ['border-strong', ['bg-canvas', 'bg-surface-1'], 3],
  ...STATUS.map((s) => [`status-${s}`, [...READING, `status-${s}-soft`], 4.5]),
  ...Array.from({ length: CHART_SERIES }, (_, i) => [`chart-${i + 1}`, ['bg-canvas', 'bg-surface-1'], 3]),
];

export const STATUS_NAMES = STATUS;
