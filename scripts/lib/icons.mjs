// Reads the icon table from components/ui/_shared/icons.ts so Node scripts share one source of truth.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function loadIcons(root) {
  const src = readFileSync(join(root, 'components/ui/_shared/icons.ts'), 'utf8');
  const icons = {};
  for (const m of src.matchAll(/^\s+'?([\w-]+)'?: '(.+)',$/gm)) icons[m[1]] = m[2];
  return icons;
}

export function iconSvg(icons, name, size = 16) {
  if (!icons[name]) throw new Error(`Unknown icon "${name}"`);
  return `<svg class="lt-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
}

/** Replace {{icon:name}} / {{icon:name:size}} placeholders with inline SVG. */
export function expandIcons(html, icons) {
  return html.replace(/\{\{icon:([\w-]+)(?::(\d+))?\}\}/g, (_, n, s) => iconSvg(icons, n, s ? +s : 16));
}
