// lumina-taste gallery. Vanilla TS, bundled by scripts/build.mjs.
import '../tokens/base.css';
import '../tokens/palettes/all.css';
import '../tokens/typography/typography.css';
import '../tokens/styles/styles.css';
import '../components/ui/_shared/shared.css';
import './gallery.css';
import { BLUEPRINTS, CHARTS, COMPARE, STYLES, UI } from './generated/registry';
import { PALETTES, TYPOGRAPHY } from '../engine/profiles/options.mjs';
import { ICON, announce, copyText, ensureFont, esc, html, setTheme, syncRoots, theme, themeAttrs } from './core';
import { byId, unmountPreviews, viewElement, viewIndex } from './elements';
import { viewCompare } from './compare';
import { rank } from './search';

const main = document.getElementById('g-main')!;
const q = document.querySelector<HTMLInputElement>('#g-q')!;
const results = document.getElementById('g-results')!;
const cleanups: Array<() => void> = [];
ensureFont(html.dataset.type!);
const state = { family: 'all', sort: 'featured', chartGroup: 'all' };

// ------------------------------------------------------------------ mode button
const modeBtn = document.getElementById('g-mode')!;
const syncModeBtn = () => modeBtn.setAttribute('aria-label', html.dataset.mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
syncModeBtn();
modeBtn.addEventListener('click', () => {
  document.body.classList.add('lt-mode-fade');
  setTimeout(() => document.body.classList.remove('lt-mode-fade'), 420);
  setTheme({ mode: html.dataset.mode === 'dark' ? 'light' : 'dark' });
  syncModeBtn();
});

// ------------------------------------------------------------------ theme panel
const panel = document.getElementById('g-theme')!;
const themeBtn = document.getElementById('g-theme-btn')!;
const seg = (axis: string, opts: string[]) =>
  `<div class="g-seg" role="radiogroup" aria-label="${axis}">${opts.map((o) => `<button type="button" role="radio" data-axis="${axis}" data-value="${o}" aria-checked="${theme()[axis as 'mode'] === o}">${o[0].toUpperCase() + o.slice(1)}</button>`).join('')}</div>`;
function renderPanel() {
  const t = theme();
  panel.innerHTML = `
    <div class="g-panel-head"><h2>Theme</h2><button type="button" class="g-icon-btn" data-close aria-label="Close theme panel"><svg class="lt-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <h3>Palette <span>${esc(PALETTES.find((p) => p.id === t.palette)?.name)}</span></h3>
    <div class="g-swatches">${PALETTES.map((p) => `<button type="button" class="g-sw" data-axis="palette" data-value="${p.id}" aria-pressed="${p.id === t.palette}" aria-label="${esc(p.name)}" title="${esc(p.name)}" data-palette="${p.id}" data-mode="${t.mode}"><i></i><i></i></button>`).join('')}</div>
    <h3>Mode</h3>${seg('mode', ['light', 'dark'])}
    <h3>Type</h3><div class="g-type-list">${TYPOGRAPHY.map((ty) => `<button type="button" data-axis="type" data-value="${ty.id}" aria-pressed="${ty.id === t.type}" data-type="${ty.id}"><span class="g-type-sample">Ag</span><span>${esc(ty.name)}</span></button>`).join('')}</div>
    <h3>Density</h3>${seg('density', ['spacious', 'balanced', 'dense'])}
    <h3>Corners</h3>${seg('radius', ['sharp', 'balanced', 'soft'])}
    <h3>Motion</h3>${seg('motion', ['snappy', 'calm', 'reduced'])}
    <a class="g-panel-link" href="#/styles">Browse whole styles ${ICON.arrow}</a>`;
  TYPOGRAPHY.forEach((ty) => ensureFont(ty.id));
}
function openPanel(open: boolean) {
  panel.hidden = !open;
  themeBtn.setAttribute('aria-expanded', String(open));
  if (open) { renderPanel(); panel.querySelector<HTMLElement>('[aria-pressed="true"], [aria-checked="true"]')?.focus(); }
}
themeBtn.addEventListener('click', () => openPanel(panel.hidden));
panel.addEventListener('click', (e) => {
  const t = e.target as Element;
  if (t.closest('[data-close]')) return openPanel(false);
  if (t.closest('a')) return openPanel(false);
  const b = t.closest<HTMLElement>('[data-axis]');
  if (!b) return;
  setTheme({ [b.dataset.axis!]: b.dataset.value! });
  syncModeBtn();
  renderPanel();
  panel.querySelector<HTMLElement>(`[data-axis="${b.dataset.axis}"][data-value="${b.dataset.value}"]`)?.focus();
});
document.addEventListener('pointerdown', (e) => { if (!panel.hidden && !panel.contains(e.target as Node) && !themeBtn.contains(e.target as Node)) openPanel(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) { openPanel(false); themeBtn.focus(); } });

// ------------------------------------------------------------------ omnibox search
type Hit = { kind: string; id: string; name: string; summary: string; href: string; aliases?: string[] };
const INDEX: Hit[] = [
  ...UI.map((c) => ({ kind: 'Element', id: c.id, name: c.name, summary: c.summary, aliases: c.aliases, href: `#/ui/${c.id}` })),
  ...CHARTS.map((c) => ({ kind: 'Chart', id: c.meta.id, name: c.meta.name, summary: c.meta.summary, aliases: c.meta.aliases, href: `#/charts/${c.meta.id}` })),
  ...STYLES.map((s) => ({ kind: 'Style', id: s.id, name: s.name, summary: s.summary, aliases: s.aliases, href: `#/styles/${s.id}` })),
  ...BLUEPRINTS.map((b) => ({ kind: 'Page', id: b.id, name: b.name, summary: b.summary, aliases: b.aliases, href: `#/pages/${b.id}` })),
  ...COMPARE.pairs.map((p) => ({ kind: 'Compare', id: p.id, name: p.title, summary: p.rule, aliases: p.ids, href: `#/compare/${p.id}` })),
  ...PALETTES.map((p) => ({ kind: 'Palette', id: p.id, name: p.name, summary: `${p.category} palette`, href: `#/palettes/${p.id}` })),
];
let active = 0;
let hits: Hit[] = [];
function showResults() {
  const v = q.value.trim();
  hits = v ? rank(v, INDEX).slice(0, 8) : [];
  results.hidden = !hits.length || document.activeElement !== q;
  q.setAttribute('aria-expanded', String(!results.hidden));
  active = 0;
  results.innerHTML = hits.map((h, i) => `<a role="option" id="g-r${i}" href="${h.href}" aria-selected="${i === 0}"><span class="g-r-kind">${h.kind}</span><b>${esc(h.name)}</b><span class="g-r-sum">${esc(h.summary)}</span></a>`).join('');
  if (hits.length) q.setAttribute('aria-activedescendant', 'g-r0'); else q.removeAttribute('aria-activedescendant');
}
q.addEventListener('input', () => {
  showResults();
  if (route().name === 'ui' && !route().id) render();
});
q.addEventListener('focus', showResults);
q.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { results.hidden = true; q.setAttribute('aria-expanded', 'false'); return; }
  if (!hits.length) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    active = (active + (e.key === 'ArrowDown' ? 1 : -1) + hits.length) % hits.length;
    results.querySelectorAll('[role="option"]').forEach((o, i) => o.setAttribute('aria-selected', String(i === active)));
    q.setAttribute('aria-activedescendant', `g-r${active}`);
  } else if (e.key === 'Enter') { e.preventDefault(); location.hash = hits[active].href; results.hidden = true; q.blur(); }
});
q.addEventListener('blur', () => setTimeout(() => { results.hidden = true; q.setAttribute('aria-expanded', 'false'); }, 150));
results.addEventListener('pointerdown', (e) => e.preventDefault());
results.addEventListener('click', () => { results.hidden = true; });
document.addEventListener('keydown', (e) => {
  const t = e.target as HTMLElement;
  const inDemo = t.closest?.('[data-contained]');
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && !inDemo) { e.preventDefault(); q.focus(); q.select(); }
  else if (e.key === '/' && !t.closest('input, textarea, [contenteditable]')) { e.preventDefault(); q.focus(); }
});

// ------------------------------------------------------------------ charts
function chartCard(m: any, big = false) {
  return `<article class="g-chart-card${m.wide || big ? ' is-wide' : ''}" data-chart="${m.id}" id="chart-${m.id}">
    <header><a href="#/charts/${m.id}"><h3>${esc(m.name)}</h3></a><span class="g-tag">${esc(m.group)}</span></header>
    <div class="g-chart-stage" data-chart-stage data-no-export data-theme-root ${themeAttrs()}></div>
  </article>`;
}
function mountCharts(list: any[]) {
  for (const c of list) {
    const stage = main.querySelector<HTMLElement>(`[data-chart="${c.meta.id}"] [data-chart-stage]`);
    if (!stage) continue;
    const inst = c.mod.demo(stage);
    cleanups.push(() => inst?.destroy?.());
  }
}
function viewCharts(id?: string) {
  const all = CHARTS;
  if (id) {
    const c = all.find((x) => x.meta.id === id);
    if (!c) { location.hash = '#/charts'; return; }
    const m = c.meta;
    const prompt = `Add a ${m.name.toLowerCase()} with lumina-taste's ${m.id} engine. Title it with the one-sentence finding, put the unit in the subtitle, label series directly, keep gridlines horizontal and dashed, and format numbers with formatNumber.`;
    main.innerHTML = `<nav class="g-crumbs" aria-label="Breadcrumb"><a href="#/charts">Charts</a><span aria-hidden="true">/</span><span>${esc(m.group)}</span></nav>
      <div class="g-chart-detail">
        ${chartCard(m, true)}
        <div class="g-chart-doc">
          <h1>${esc(m.name)}</h1>
          <p class="g-about">${esc(m.summary)}</p>
          <dl class="g-dl"><div><dt>Use it for</dt><dd>${esc(m.bestFor)}</dd></div><div><dt>Avoid it for</dt><dd>${esc(m.avoidFor)}</dd></div><div><dt>Data shape</dt><dd><code>${esc(m.dataShape)}</code></dd></div><div><dt>Also called</dt><dd>${(m.aliases ?? []).map(esc).join(', ')}</dd></div></dl>
          <section class="g-sec"><div class="g-sec-head"><h2>Prompt for your agent</h2><button type="button" class="g-copy" data-copy>${ICON.copy}<span>Copy</span></button></div><pre class="g-prompt">${esc(prompt)}</pre></section>
          <section class="g-sec"><h2>Install</h2><pre class="g-prompt g-mono">node scripts/install-taste.mjs --charts ${m.id}</pre></section>
        </div>
      </div>`;
    main.querySelector('[data-copy]')?.addEventListener('click', (e) => copyText(prompt, e.currentTarget as HTMLElement));
    mountCharts([c]);
    return;
  }
  const groups = [...new Set(all.map((c) => c.meta.group))];
  const list = state.chartGroup === 'all' ? all : all.filter((c) => c.meta.group === state.chartGroup);
  main.innerHTML = `<section class="g-hero g-hero-sm"><p class="g-kicker">${all.length} chart engines · SVG and Canvas · no dependencies</p><h1>Charts that explain themselves</h1><p class="g-sub">Titled with the finding, labelled directly, with tabular axes, a magnetic crosshair and keyboard navigation. Hover any chart.</p></section>
    <div class="g-filters"><div class="g-chips"><button type="button" data-cgroup="all" aria-pressed="${state.chartGroup === 'all'}">All <span>${all.length}</span></button>${groups.map((g) => `<button type="button" data-cgroup="${esc(g)}" aria-pressed="${state.chartGroup === g}">${esc(g)} <span>${all.filter((c) => c.meta.group === g).length}</span></button>`).join('')}</div></div>
    <div class="g-chart-grid">${list.map((c) => chartCard(c.meta)).join('')}</div>`;
  mountCharts(list);
}

// ------------------------------------------------------------------ styles atlas
function styleMini(s: any) {
  return `<div class="g-style-prev" data-theme-root data-lock="palette mode type radius density style" data-palette="${s.palette}" data-mode="${s.mode}" data-type="${s.type}" data-radius="${s.radius}" data-density="balanced" data-motion="snappy" data-style="${s.id}">
    <div class="g-mini">
      <div class="g-mini-card">
        <span class="lt-eyebrow">${esc(s.sample?.eyebrow ?? 'Plan')}</span>
        <strong>${esc(s.sample?.title ?? 'Team workspace')}</strong>
        <p>${esc(s.sample?.body ?? '12 seats · renews 1 Feb')}</p>
        <div class="g-mini-row"><span class="lt-btn" data-variant="primary" data-size="sm"><span data-part="label">${esc(s.sample?.cta ?? 'Upgrade')}</span></span><span class="lt-btn" data-variant="secondary" data-size="sm"><span data-part="label">Details</span></span></div>
      </div>
      <div class="g-mini-side"><span class="lt-badge" data-tone="accent">${esc(s.sample?.badge ?? 'New')}</span><span class="g-mini-switch"><i></i></span><span class="g-mini-field">Search…</span></div>
    </div>
  </div>`;
}
function viewStyles(id?: string) {
  STYLES.forEach((x) => ensureFont(x.type));
  if (id) {
    const s = STYLES.find((x) => x.id === id);
    if (!s) { location.hash = '#/styles'; return; }
    const brief = `Style the interface as ${s.name}: ${s.signals.join('; ')}. ${s.brief} Use lumina-taste with data-style="${s.id}", palette ${s.palette}, type ${s.type}, corners ${s.radius}.`;
    main.innerHTML = `<nav class="g-crumbs" aria-label="Breadcrumb"><a href="#/styles">Styles</a><span aria-hidden="true">/</span><span>${esc(s.kind)}</span></nav>
      <div class="g-style-detail">
        <div class="g-style-big">${styleMini(s)}</div>
        <div>
          <h1>${esc(s.name)}</h1>
          <p class="g-aka"><span>Also called</span> ${(s.aliases ?? []).map(esc).join(', ')}</p>
          <p class="g-about">${esc(s.summary)}</p>
          <section class="g-sec"><h2>The signals</h2><ul class="g-signals">${s.signals.map((x: string) => `<li>${esc(x)}</li>`).join('')}</ul></section>
          <section class="g-sec"><h2>Use it for</h2><p class="g-plain">${esc(s.useFor)}</p></section>
          <section class="g-sec"><h2>Not to be confused with</h2><p class="g-plain">${esc(s.notTo)}</p></section>
          <section class="g-sec"><div class="g-sec-head"><h2>Brief for your agent</h2><button type="button" class="g-copy" data-copy>${ICON.copy}<span>Copy</span></button></div><pre class="g-prompt">${esc(brief)}</pre></section>
          <div class="g-actions"><button type="button" class="lt-btn" data-variant="primary" data-apply><span data-part="label">Apply to the whole gallery</span></button><a class="lt-btn" data-variant="ghost" href="#/"><span data-part="label">See it on every element</span></a></div>
        </div>
      </div>`;
    main.querySelector('[data-copy]')?.addEventListener('click', (e) => copyText(brief, e.currentTarget as HTMLElement));
    main.querySelector('[data-apply]')?.addEventListener('click', () => { setTheme({ style: s.id, palette: s.palette, mode: s.mode, type: s.type, radius: s.radius }); syncModeBtn(); announce(`Applied ${s.name}`); });
    return;
  }
  main.innerHTML = `<section class="g-hero g-hero-sm"><p class="g-kicker">${STYLES.length} styles</p><h1>What style is this?</h1><p class="g-sub">Whole looks, not just colours: borders, depth, corners, type and surfaces change together. Pick one, read its signals, copy the brief.</p></section>
    <div class="g-style-grid">${STYLES.map((s) => `<a class="g-style-card" href="#/styles/${s.id}" data-id="${s.id}">${styleMini(s)}<div class="g-card-body"><div class="g-card-title"><h3>${esc(s.name)}</h3><span class="g-tag">${esc(s.kind)}</span></div><p class="g-quote">“${esc(s.aliases?.[0] ?? s.summary)}”</p><div class="g-signal-tags">${s.signals.slice(0, 3).map((x: string) => `<span>${esc(x)}</span>`).join('')}</div></div></a>`).join('')}</div>`;
}

// ------------------------------------------------------------------ pages (blueprints)
function viewPages(id?: string) {
  const bp = BLUEPRINTS.find((b) => b.id === id);
  if (bp) {
    main.innerHTML = `<div class="g-viewer-bar"><a class="g-back" href="#/pages">${ICON.back}<span>All pages</span></a>
      <label class="lt-visually-hidden" for="g-bp-switch">Page</label>
      <span class="g-select"><select id="g-bp-switch">${BLUEPRINTS.map((b) => `<option value="${b.id}"${b.id === bp.id ? ' selected' : ''}>${esc(b.name)}</option>`).join('')}</select></span>
      <div class="g-seg" role="radiogroup" aria-label="Viewport"><button type="button" role="radio" aria-checked="true" data-vp="100%">Desktop</button><button type="button" role="radio" aria-checked="false" data-vp="390px">Mobile</button></div>
      ${bp.states?.length ? `<div class="g-seg" role="radiogroup" aria-label="Page state"><button type="button" role="radio" aria-checked="true" data-state="">Ready</button>${bp.states.map((s: string) => `<button type="button" role="radio" aria-checked="false" data-state="${esc(s)}">${esc(s[0].toUpperCase() + s.slice(1).replace('-', ' '))}</button>`).join('')}</div>` : ''}
      <a class="g-back g-push" href="./blueprints/${bp.id}/" target="_blank" rel="noopener">${ICON.external}<span>Open full page</span></a></div>
      <div class="g-frame"><iframe data-blueprint title="${esc(bp.name)}" src="./blueprints/${bp.id}/"></iframe></div>`;
    const frame = main.querySelector<HTMLIFrameElement>('iframe')!;
    frame.addEventListener('load', () => syncRoots());
    main.querySelector<HTMLSelectElement>('#g-bp-switch')!.addEventListener('change', (e) => (location.hash = `#/pages/${(e.target as HTMLSelectElement).value}`));
    main.querySelectorAll<HTMLElement>('[data-vp]').forEach((b) => b.addEventListener('click', () => {
      main.querySelectorAll('[data-vp]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
      frame.style.width = b.dataset.vp!;
    }));
    // Page states: the blueprint reads ?state=… and shows its loading, empty or error view.
    main.querySelectorAll<HTMLElement>('[data-state]').forEach((b) => b.addEventListener('click', () => {
      main.querySelectorAll('[data-state]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
      frame.src = `./blueprints/${bp.id}/${b.dataset.state ? `?state=${b.dataset.state}` : ''}`;
    }));
    return;
  }
  main.innerHTML = `<section class="g-hero g-hero-sm"><p class="g-kicker">${BLUEPRINTS.length} pages</p><h1>Whole pages, already laid out</h1><p class="g-sub">Each one follows the page-flow rules: one primary action, a 4px rhythm, the right navigation for the job. They follow your theme.</p></section>
    <div class="g-page-grid">${BLUEPRINTS.map((b) => `<a class="g-page-card" href="#/pages/${b.id}"><div class="g-page-thumb"><iframe data-blueprint tabindex="-1" aria-hidden="true" loading="lazy" title="${esc(b.name)} thumbnail" src="./blueprints/${b.id}/"></iframe></div><div class="g-card-body"><div class="g-card-title"><h3>${esc(b.name)}</h3>${b.states?.length ? `<span class="g-new">${b.states.length + 1} states</span>` : ''}</div><p>${esc(b.summary)}</p></div></a>`).join('')}</div>`;
  main.querySelectorAll<HTMLIFrameElement>('iframe').forEach((f) => f.addEventListener('load', () => syncRoots()));
  const ro = new ResizeObserver((entries) => entries.forEach((en) => (en.target as HTMLElement).style.setProperty('--s', String(en.contentRect.width / 1440))));
  main.querySelectorAll<HTMLElement>('.g-page-thumb').forEach((t) => ro.observe(t));
  cleanups.push(() => ro.disconnect());
}

// ------------------------------------------------------------------ palettes
const SW = ['bg-canvas', 'bg-surface-2', 'text-primary', 'accent-solid', 'accent-soft', 'status-positive', 'status-negative', 'chart-2', 'chart-3'];
function viewPalettes(id?: string) {
  const p = PALETTES.find((x) => x.id === id);
  if (p) {
    const tokens = ['bg-canvas', 'bg-surface-1', 'bg-surface-2', 'bg-surface-3', 'border-hairline', 'border-strong', 'text-primary', 'text-secondary', 'text-muted', 'accent-solid', 'accent-hover', 'accent-ink', 'accent-soft', 'accent-text', 'status-positive', 'status-negative', 'status-warning', 'status-info', 'chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5', 'chart-6', 'chart-7', 'chart-8'];
    main.innerHTML = `<nav class="g-crumbs" aria-label="Breadcrumb"><a href="#/palettes">Palettes</a><span aria-hidden="true">/</span><span>${esc(p.category)}</span></nav>
      <div class="g-pal-head"><h1>${esc(p.name)}</h1><button type="button" class="lt-btn" data-variant="primary" data-apply><span data-part="label">Use this palette</span></button></div>
      <div class="g-pal-modes">${['light', 'dark'].map((m) => `<section class="g-pal-mode" data-palette="${p.id}" data-mode="${m}"><h2>${m === 'light' ? 'Light' : 'Dark'}</h2><ul>${tokens.map((t) => `<li><i style="background: var(--${t})"></i><code>--${t}</code></li>`).join('')}</ul></section>`).join('')}</div>`;
    main.querySelector('[data-apply]')!.addEventListener('click', () => { setTheme({ palette: p.id }); announce(`Palette: ${p.name}`); });
    return;
  }
  main.innerHTML = `<section class="g-hero g-hero-sm"><p class="g-kicker">18 palettes · light and dark · 2,196 contrast checks</p><h1>Colour you do not have to check</h1><p class="g-sub">Every text, control and chart colour pairing passes WCAG: primary text at 7:1 or better, all other text at 4.5:1, controls and chart marks at 3:1.</p></section>
    <div class="g-pal-grid">${PALETTES.map((pp) => `<a class="g-pal" href="#/palettes/${pp.id}" data-palette="${pp.id}" data-mode="${theme().mode}" aria-current="${pp.id === theme().palette ? 'true' : 'false'}"><span class="g-pal-sw">${SW.map((t) => `<i style="background:var(--${t})"></i>`).join('')}</span><span class="g-pal-name">${esc(pp.name)}</span><span class="g-pal-cat">${pp.category === 'dev-tool' ? 'Dev tools' : pp.category}</span></a>`).join('')}</div>`;
}

// ------------------------------------------------------------------ router
function route() {
  const [path, query = ''] = location.hash.replace(/^#/, '').split('?');
  const [, name = '', id] = path.split('/');
  return { name: name === 'ui' || name === '' ? 'ui' : name, id, params: new URLSearchParams(query) };
}
function render() {
  cleanups.splice(0).forEach((f) => f());
  unmountPreviews();
  const r = route();
  document.querySelectorAll<HTMLAnchorElement>('.g-nav a').forEach((a) => a.toggleAttribute('aria-current', a.dataset.route === (r.name === 'blueprints' ? 'pages' : r.name)));
  html.dataset.view = r.id ? `${r.name}-detail` : r.name;
  if (r.params.get('f')) state.family = r.params.get('f')!;
  if (r.name === 'charts') viewCharts(r.id);
  else if (r.name === 'styles') viewStyles(r.id);
  else if (r.name === 'pages' || r.name === 'blueprints') viewPages(r.id);
  else if (r.name === 'palettes') viewPalettes(r.id);
  else if (r.name === 'compare') viewCompare(main, r.id);
  else if (r.id && byId(r.id)) viewElement(main, r.id);
  else viewIndex(main, q.value.trim(), state.family, state.sort);
}
main.addEventListener('click', (e) => {
  const t = e.target as Element;
  // Clicks inside a live demo belong to the demo, never to the gallery chrome.
  if (t.closest('[data-stage], [data-chart-stage], .g-pal-live')) return;
  const fam = t.closest<HTMLElement>('[data-fam]');
  if (fam) { state.family = fam.dataset.fam!; if (location.hash.includes('?')) history.replaceState(null, '', '#/'); return render(); }
  const sort = t.closest<HTMLElement>('[data-g-sort]');
  if (sort) { state.sort = sort.dataset.gSort!; return render(); }
  if (t.closest('[data-surprise]')) { const c = UI[Math.floor(Math.random() * UI.length)]; location.hash = `#/ui/${c.id}`; return; }
  const ex = t.closest<HTMLElement>('[data-example]');
  if (ex) { q.value = ex.dataset.example!; q.focus(); q.dispatchEvent(new Event('input')); return; }
  const cg = t.closest<HTMLElement>('[data-cgroup]');
  if (cg) { state.chartGroup = cg.dataset.cgroup!; return render(); }
});
// Remember where each list was scrolled, so Back returns to the same card instead of the top.
const scrollMemory = new Map<string, number>();
let lastHash = location.hash;
addEventListener('scroll', () => scrollMemory.set(lastHash, scrollY), { passive: true });
window.addEventListener('hashchange', () => {
  lastHash = location.hash;
  render();
  main.focus({ preventScroll: true });
  const y = scrollMemory.get(location.hash) ?? 0;
  scrollTo({ top: 0 });
  // Previews fit themselves over a couple of frames; restore once layout has settled.
  if (y) requestAnimationFrame(() => requestAnimationFrame(() => scrollTo({ top: y })));
});
render();
