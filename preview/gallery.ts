// lumina-taste showcase gallery. Vanilla TS, bundled by scripts/build.mjs.
import '../tokens/base.css';
import '../tokens/palettes/all.css';
import '../tokens/typography/typography.css';
import '../components/ui/_shared/shared.css';
import './gallery.css';
import { BLUEPRINTS, CHARTS, FAMILIES, UI } from './generated/registry';
import { PALETTES, TYPOGRAPHY } from '../engine/profiles/options.mjs';
import { enhance as enhanceSegmented } from '../components/ui/controls/segmented-control/segmented-control';
import { enhance as enhanceThemeSwitch } from '../components/ui/controls/theme-switch/theme-switch';
import themeSwitchHtml from '../components/ui/controls/theme-switch/theme-switch.html';
import { rank } from './search';

type Axis = 'palette' | 'mode' | 'type' | 'density' | 'radius' | 'motion';
const html = document.documentElement;
const main = document.getElementById('g-main')!;
const announcer = document.querySelector<HTMLElement>('.g-announcer')!;
const cleanups: Array<() => void> = [];
const announce = (msg: string) => { announcer.textContent = ''; requestAnimationFrame(() => (announcer.textContent = msg)); };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

// ---------- theme state ----------
function save() {
  const s: Record<string, string> = {};
  for (const k of ['palette', 'mode', 'type', 'density', 'radius', 'motion'] as Axis[]) s[k] = html.dataset[k]!;
  try { localStorage.setItem('lt-gallery', JSON.stringify(s)); } catch { /* private mode */ }
  document.querySelectorAll<HTMLIFrameElement>('iframe[data-blueprint]').forEach(syncFrame);
}
function set(axis: Axis, value: string) {
  html.dataset[axis] = value;
  save();
}
function syncFrame(frame: HTMLIFrameElement) {
  const doc = frame.contentDocument?.documentElement;
  if (!doc) return;
  for (const k of ['palette', 'mode', 'type', 'density', 'radius', 'motion'] as Axis[]) doc.dataset[k] = html.dataset[k]!;
}

const paletteSel = document.querySelector<HTMLSelectElement>('#g-palette')!;
const groups = ['consumer', 'dev-tool', 'editorial', 'data'];
paletteSel.innerHTML = groups
  .map((g) => `<optgroup label="${g === 'dev-tool' ? 'Dev tools' : g[0].toUpperCase() + g.slice(1)}">${PALETTES.filter((p) => p.category === g).map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</optgroup>`)
  .join('');
paletteSel.value = html.dataset.palette!;
paletteSel.addEventListener('change', () => set('palette', paletteSel.value));
const typeSel = document.querySelector<HTMLSelectElement>('#g-type')!;
typeSel.innerHTML = TYPOGRAPHY.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join('');
typeSel.value = html.dataset.type!;
typeSel.addEventListener('change', () => set('type', typeSel.value));

for (const seg of document.querySelectorAll<HTMLElement>('.g-toolbar [data-g]')) {
  const axis = seg.dataset.g as Axis;
  seg.querySelectorAll<HTMLButtonElement>('[role="radio"]').forEach((b) => {
    const on = b.dataset.value === html.dataset[axis];
    b.setAttribute('aria-checked', String(on));
    b.tabIndex = on ? 0 : -1;
  });
  enhanceSegmented(seg);
  seg.addEventListener('lt-change', (e) => set(axis, (e as CustomEvent).detail.value));
}
const modeSlot = document.getElementById('g-mode-slot')!;
modeSlot.innerHTML = themeSwitchHtml;
const modeSwitch = modeSlot.firstElementChild as HTMLElement;
modeSwitch.setAttribute('aria-label', 'Dark mode');
enhanceThemeSwitch(modeSwitch);
modeSwitch.addEventListener('lt-change', () => save());

// ---------- search ----------
const q = document.querySelector<HTMLInputElement>('#g-q')!;
document.addEventListener('keydown', (e) => {
  const t = e.target as HTMLElement;
  if (e.key === '/' && !t.closest('input, textarea, [contenteditable]')) { e.preventDefault(); q.focus(); }
});
q.addEventListener('input', () => {
  const route = location.hash.split('/')[1];
  if (route !== 'ui' && route !== 'charts') location.hash = '#/ui';
  else render();
});

// ---------- views ----------
function stageListener(stage: HTMLElement) {
  // Every demo control does something visible: unhandled presses are announced.
  stage.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('button, a[href], [role="menuitem"], [role="option"]');
    if (!b || !stage.contains(b)) return;
    if (b.matches('a[href]')) e.preventDefault();
    announce(`Pressed: ${(b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 40)}`);
  });
}

function card(c: any, solo = false, showFamily = false) {
  const aliases = (c.aliases ?? []).slice(0, 3).map((a: string) => `“${esc(a)}”`).join(', ');
  return `<article class="g-card${c.wide ? ' is-wide' : ''}${solo ? ' is-solo' : ''}" id="ui-${c.id}" data-id="${c.id}">
    <header class="g-card-head">
      <h3><a href="#/ui/${c.id}">${esc(c.name)}</a></h3>
      ${showFamily ? `<span class="g-chip">${esc(c.familyTitle)}</span>` : ''}
    </header>
    <p class="g-card-sum">${esc(c.summary)}</p>
    <div class="g-stage" data-stage${c.fill ? ' data-fill' : ''}>${c.html}</div>
    <footer class="g-card-foot">
      ${aliases ? `<span class="g-aliases">Also called ${aliases}</span>` : '<span></span>'}
      <code class="g-files">${c.id}.html · .css${c.enhance ? ' · .ts' : ''} · .react.tsx</code>
    </footer>
  </article>`;
}

function mountStages(scope: ParentNode, list: any[]) {
  scope.querySelectorAll<HTMLElement>('[data-stage]').forEach((stage) => {
    const id = stage.closest<HTMLElement>('[data-id]')!.dataset.id;
    const c = list.find((x) => x.id === id);
    stageListener(stage);
    if (!c?.enhance) return;
    for (const el of stage.querySelectorAll<HTMLElement>('[data-lt]')) cleanups.push(c.enhance(el));
  });
}

function viewUI(sub?: string) {
  const query = q.value.trim();
  if (sub) {
    const c = UI.find((x) => x.id === sub);
    if (!c) return viewUI();
    main.innerHTML = `<div class="g-crumbs"><a href="#/ui">UI elements</a><span aria-hidden="true">/</span><span>${esc(c.name)}</span></div>
      <section class="g-grid is-solo">${card(c, true, true)}</section>
      <section class="g-doc"><h2>Use it</h2><dl>
        <div><dt>Pattern</dt><dd>${esc(c.pattern ?? 'Native HTML')}</dd></div>
        <div><dt>States</dt><dd>${esc((c.states ?? []).join(', '))}</dd></div>
        <div><dt>Aliases</dt><dd>${esc((c.aliases ?? []).join(', '))}</dd></div>
        <div><dt>Install</dt><dd><code>node scripts/install-taste.mjs --components ${c.id} --framework vanilla</code></dd></div>
      </dl></section>`;
    mountStages(main, UI);
    return;
  }
  const list = query ? rank(query, UI) : UI;
  const fams = query ? [{ id: '_results', title: `${list.length} match${list.length === 1 ? '' : 'es'} for “${esc(query)}”`, summary: '' }] : FAMILIES;
  main.innerHTML = `<div class="g-intro"><h1 class="lt-h2">UI encyclopedia</h1><p class="lt-lede">${UI.length} named patterns. Every one re-skins across all 36 themes, three densities and three radii, ships as vanilla HTML/CSS/TS and React, and works by keyboard.</p>
    ${query ? '' : `<nav class="g-pills" aria-label="Families">${FAMILIES.map((f: any) => `<a href="#fam-${f.id}">${esc(f.title)} <span>${UI.filter((c) => c.family === f.id).length}</span></a>`).join('')}</nav>`}</div>
    ${fams.map((f: any) => {
      const items = query ? list : UI.filter((c) => c.family === f.id);
      return `<section class="g-section" id="fam-${f.id}" aria-labelledby="fam-${f.id}-h"><div class="g-section-head"><h2 id="fam-${f.id}-h">${f.title}</h2>${f.summary ? `<p>${esc(f.summary)}</p>` : ''}</div>
        <div class="g-grid">${items.map((c: any) => card(c, false, !!query)).join('') || '<p class="g-empty">Nothing matches. Try “dropdown”, “toggle” or “table”.</p>'}</div></section>`;
    }).join('')}`;
  mountStages(main, UI);
}

function viewCharts(sub?: string) {
  const query = q.value.trim();
  const all = CHARTS.map((c) => ({ ...c.meta, mod: c.mod }));
  const list = sub ? all.filter((c) => c.id === sub) : query ? rank(query, all) : all;
  main.innerHTML = `<div class="g-intro"><h1 class="lt-h2">Graphs encyclopedia</h1><p class="lt-lede">${all.length} pure SVG and Canvas chart engines with tabular axes, dashed horizontal gridlines only, a magnetic crosshair and direct labels. Hover or tab through any chart.</p></div>
    <div class="g-grid g-grid-charts">${list.map((c) => `<article class="g-card is-chart${c.wide ? ' is-wide' : ''}" data-chart="${c.id}" id="chart-${c.id}">
      <header class="g-card-head"><h3><a href="#/charts/${c.id}">${esc(c.name)}</a></h3><span class="g-chip">${esc(c.group)}</span></header>
      <p class="g-card-sum">${esc(c.summary)}</p>
      <div class="g-chart-stage" data-chart-stage></div>
      <footer class="g-card-foot"><span class="g-aliases">Best for: ${esc(c.bestFor)}</span><code class="g-files">${c.id}.ts · .react.tsx</code></footer>
    </article>`).join('')}</div>`;
  for (const c of list) {
    const stage = main.querySelector<HTMLElement>(`[data-chart="${c.id}"] [data-chart-stage]`)!;
    const inst = c.mod.demo(stage);
    cleanups.push(() => inst?.destroy?.());
  }
}

function viewBlueprints(sub?: string) {
  const bp = BLUEPRINTS.find((b) => b.id === sub) ?? null;
  if (bp) {
    main.innerHTML = `<div class="g-bp-bar"><a class="g-back" href="#/blueprints">All blueprints</a>
      <label class="lt-visually-hidden" for="g-bp-switch">Blueprint</label>
      <span class="g-select"><select id="g-bp-switch">${BLUEPRINTS.map((b) => `<option value="${b.id}"${b.id === bp.id ? ' selected' : ''}>${esc(b.name)}</option>`).join('')}</select></span>
      <div class="lt-segmented" data-g-vp role="radiogroup" aria-label="Viewport"><span data-part="indicator" aria-hidden="true"></span><button type="button" role="radio" aria-checked="true" tabindex="0" data-value="100%">Desktop</button><button type="button" role="radio" aria-checked="false" tabindex="-1" data-value="390px">Mobile</button></div>
      <a class="g-open" href="./blueprints/${bp.id}/" target="_blank" rel="noopener">Open full page</a></div>
      <div class="g-frame-wrap"><iframe data-blueprint title="${esc(bp.name)} blueprint" src="./blueprints/${bp.id}/"></iframe></div>`;
    const frame = main.querySelector<HTMLIFrameElement>('iframe')!;
    frame.addEventListener('load', () => syncFrame(frame));
    main.querySelector<HTMLSelectElement>('#g-bp-switch')!.addEventListener('change', (e) => (location.hash = `#/blueprints/${(e.target as HTMLSelectElement).value}`));
    const vp = main.querySelector<HTMLElement>('[data-g-vp]')!;
    cleanups.push(enhanceSegmented(vp));
    vp.addEventListener('lt-change', (e) => (frame.style.width = (e as CustomEvent).detail.value));
    return;
  }
  main.innerHTML = `<div class="g-intro"><h1 class="lt-h2">Page blueprints</h1><p class="lt-lede">${BLUEPRINTS.length} complete, token-driven pages. Each one follows the page-flow rules and switches live with the toolbar above.</p></div>
    <div class="g-grid g-grid-bp">${BLUEPRINTS.map((b) => `<a class="g-bp-card" href="#/blueprints/${b.id}"><span class="g-bp-num">${String(b.order).padStart(2, '0')}</span><h3>${esc(b.name)}</h3><p>${esc(b.summary)}</p><span class="g-bp-meta">${esc(b.anatomy)}</span></a>`).join('')}</div>`;
}

function viewPalettes() {
  main.innerHTML = `<div class="g-intro"><h1 class="lt-h2">Palettes</h1><p class="lt-lede">18 curated OKLCH palettes, each in light and dark. Every text, control and chart pairing is verified: primary text at 7:1 or better, all other text at 4.5:1, UI marks at 3:1.</p></div>
    <div class="g-grid g-grid-pal">${PALETTES.map((p) => `<button type="button" class="g-pal" data-palette="${p.id}" data-mode="${html.dataset.mode}" aria-pressed="${p.id === html.dataset.palette}">
      <span class="g-pal-sw">${['bg-canvas', 'bg-surface-2', 'text-primary', 'accent-solid', 'accent-soft', 'status-positive', 'status-negative', 'chart-2', 'chart-3'].map((t) => `<i style="background:var(--${t})"></i>`).join('')}</span>
      <span class="g-pal-name">${esc(p.name)}</span><span class="g-pal-cat">${p.category === 'dev-tool' ? 'Dev tools' : p.category}</span>
    </button>`).join('')}</div>`;
  main.querySelectorAll<HTMLButtonElement>('.g-pal').forEach((b) =>
    b.addEventListener('click', () => {
      set('palette', b.dataset.palette!);
      paletteSel.value = b.dataset.palette!;
      main.querySelectorAll('.g-pal').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      announce(`Palette: ${b.querySelector('.g-pal-name')!.textContent}`);
    }),
  );
}

function render() {
  cleanups.splice(0).forEach((f) => f());
  const [, route = 'ui', sub] = location.hash.split('/');
  document.querySelectorAll<HTMLAnchorElement>('.g-tabs a').forEach((a) => a.toggleAttribute('aria-current', a.dataset.route === route));
  html.dataset.view = route;
  if (route === 'charts') viewCharts(sub);
  else if (route === 'blueprints') viewBlueprints(sub);
  else if (route === 'palettes') viewPalettes();
  else viewUI(sub);
}
new MutationObserver(() => {
  document.querySelectorAll<HTMLElement>('.g-pal').forEach((p) => (p.dataset.mode = html.dataset.mode!));
}).observe(html, { attributes: true, attributeFilter: ['data-mode'] });
window.addEventListener('hashchange', () => { render(); main.focus({ preventScroll: true }); scrollTo({ top: 0 }); });
render();
