// Elements: the index grid (live mini previews) and the element page (contained live demo,
// anatomy pins, plain explanation, agent prompts, names in code).
import { BLUEPRINTS, CHARTS, FAMILIES, STYLES, UI } from './generated/registry';
import { ICON, copyText, esc, fit, onTheme, syncRoots, themeAttrs } from './core';
import { rank } from './search';

export interface Part { sel: string; name: string; api?: string; text: string }
export interface Doc {
  id: string; name: string; family: string; familyTitle: string; summary: string; aliases: string[]; pattern: string; states: string[];
  react: string; html: string; enhance: ((el: HTMLElement) => () => void) | null; wide?: boolean; fill?: boolean;
  w?: number; preview?: Array<[string, string, string?]>;
  api?: string; about?: string; called?: string[]; anatomy?: Part[]; prompt?: string; debug?: string; code?: Array<[string, string, string]>; seeAlso?: string[]; added?: number;
}
const ALL = UI as Doc[];
export const byId = (id: string) => ALL.find((c) => c.id === id);

/** Fill any missing documentation with sensible, plain defaults. */
export function doc(c: Doc) {
  const api = c.api ?? `.lt-${c.id}`;
  return {
    api,
    about: c.about ?? c.summary,
    called: c.called?.length ? c.called : c.aliases.map((a) => a),
    anatomy: c.anatomy ?? [],
    prompt: c.prompt ?? `Add a ${c.name.toLowerCase()}: ${c.summary.replace(/\.$/, '').toLowerCase()}. Follow the ${c.pattern} pattern, use semantic tokens only, and keep every state reachable by keyboard.`,
    debug: c.debug ?? `Debug my ${c.name.toLowerCase()}. Check the ARIA state attributes update on every change, focus stays visible, nothing jumps in width while it animates, and reduced motion removes the movement. The symptom:`,
    code: c.code ?? [
      ['lumina-taste', `${c.id}.html + enhance()`, 'vanilla markup and behaviour'],
      ['lumina-taste', `<${c.react} />`, 'React component'],
      ['Pattern', c.pattern, ''],
    ],
    seeAlso: (c.seeAlso ?? ALL.filter((x) => x.family === c.family && x.id !== c.id).slice(0, 4).map((x) => x.id)).map(byId).filter(Boolean) as Doc[],
  };
}

// ------------------------------------------------------------------ index
function card(c: Doc) {
  // An <article> with a stretched title link: demos contain their own links, and links cannot nest.
  return `<article class="g-card" data-id="${c.id}" id="card-${c.id}"${(c.w ?? 0) >= 620 ? ' data-wide' : ''}>
    <div class="g-prev" data-stage data-theme-root data-contained inert ${themeAttrs()}><div class="g-prev-in" ${widthOf(c)}>${c.html}</div></div>
    <div class="g-card-body">
      <div class="g-card-title"><h3><a class="g-stretch" href="#/ui/${c.id}">${esc(c.name)}</a>${c.added ? '<span class="g-new">New</span>' : ''}</h3><span class="g-tag">${esc(c.familyTitle.split(' ')[0].replace(',', ''))}</span></div>
      <code class="g-api">${esc(doc(c).api)}</code>
      <p>${esc(c.summary)}</p>
    </div>
  </article>`;
}

/** Put a demo into its most telling state (an open menu, a typed query) so the preview shows the thing itself. */
export function runPreview(c: Doc, inner: HTMLElement) {
  for (const [kind, sel, text] of c.preview ?? []) {
    const el = inner.querySelector<HTMLElement>(sel);
    if (!el) continue;
    if (kind === 'click') el.click();
    else if (kind === 'type' && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) { el.value = text ?? ''; el.dispatchEvent(new Event('input', { bubbles: true })); }
    else if (kind === 'scroll') el.scrollTop = +(text ?? 0);
  }
}
const widthOf = (c: Doc) => (c.w ? `style="width:${c.w}px"` : '');

let mounted: Array<() => void> = [];
function mountPreviews(scope: ParentNode) {
  scope.querySelectorAll<HTMLElement>('.g-prev').forEach((box) => {
    const id = box.closest<HTMLElement>('[data-id]')!.dataset.id!;
    const c = byId(id)!;
    const inner = box.firstElementChild as HTMLElement;
    if (c.enhance) for (const el of inner.querySelectorAll<HTMLElement>('[data-lt]')) mounted.push(c.enhance(el));
    requestAnimationFrame(() => runPreview(c, inner));
    mounted.push(fit(box, inner, 18));
  });
}
export const unmountPreviews = () => { mounted.splice(0).forEach((f) => { try { f(); } catch { /* already gone */ } }); };

const EXAMPLES = ['the arrow that rotates when it opens', 'nine dots that open more apps', 'the bar that appears when I tick rows', 'boxes for a 6-digit code', 'numbers that roll like an odometer', 'search everything with cmd k'];

export function viewIndex(main: HTMLElement, query: string, family: string, sort: string) {
  const list = query ? rank(query, ALL) : sort === 'az' ? [...ALL].sort((a, b) => a.name.localeCompare(b.name)) : sort === 'new' ? [...ALL].sort((a, b) => (b.added ?? 0) - (a.added ?? 0)) : ALL;
  const shown = family === 'all' ? list : list.filter((c) => c.family === family);
  main.innerHTML = `
    <section class="g-hero">
      <p class="g-kicker">${ALL.length} elements · ${CHARTS.length} charts · ${STYLES.length} styles · ${BLUEPRINTS.length} pages</p>
      <h1>What is that UI element called?</h1>
      <p class="g-sub">Describe it in your own words. Get the real name, working code in vanilla and React, and a prompt your coding agent can build from.</p>
      <div class="g-examples">${EXAMPLES.map((e) => `<button type="button" data-example="${esc(e)}">“${esc(e)}”</button>`).join('')}</div>
    </section>
    <div class="g-filters" role="toolbar" aria-label="Filter elements">
      <div class="g-chips">
        <button type="button" data-fam="all" aria-pressed="${family === 'all'}">All <span>${ALL.length}</span></button>
        ${FAMILIES.map((f: { id: string; title: string }) => `<button type="button" data-fam="${f.id}" aria-pressed="${family === f.id}">${esc(f.title.split(' ')[0].replace(',', ''))} <span>${ALL.filter((c) => c.family === f.id).length}</span></button>`).join('')}
      </div>
      <div class="g-sort">
        <button type="button" data-g-sort="featured" aria-pressed="${sort === 'featured'}">Featured</button>
        <button type="button" data-g-sort="new" aria-pressed="${sort === 'new'}">New</button>
        <button type="button" data-g-sort="az" aria-pressed="${sort === 'az'}">A–Z</button>
        <button type="button" data-surprise>${ICON.shuffle}<span>Surprise me</span></button>
      </div>
    </div>
    ${query ? `<p class="g-count">${shown.length} match${shown.length === 1 ? '' : 'es'} for “${esc(query)}”</p>` : ''}
    <div class="g-grid">${shown.map(card).join('') || `<div class="g-none"><h2>Nothing by that name yet</h2><p>Try fewer words, like “menu”, “toggle” or “table”.</p></div>`}</div>`;
  mountPreviews(main);
}

// ------------------------------------------------------------------ element page
export function viewElement(main: HTMLElement, id: string) {
  const c = byId(id);
  if (!c) { location.hash = '#/'; return; }
  const d = doc(c);
  const fam = FAMILIES.find((f: { id: string }) => f.id === c.family) as { title: string } | undefined;
  main.innerHTML = `
    <nav class="g-crumbs" aria-label="Breadcrumb"><a href="#/">Elements</a><span aria-hidden="true">/</span><a href="#/?f=${c.family}">${esc(fam?.title ?? c.family)}</a></nav>
    <article class="g-el" id="ui-${c.id}" data-id="${c.id}">
      <div class="g-el-left">
        <div class="g-stagebox">
          <div class="g-stage-tools" role="toolbar" aria-label="Preview controls">
            <button type="button" class="g-tool" data-local-mode aria-pressed="false">${ICON.moon}<span>Flip mode</span></button>
            <button type="button" class="g-tool" data-pins aria-pressed="true">${ICON.pins}<span>Parts</span></button>
            <button type="button" class="g-tool" data-replay>${ICON.reset}<span>Reset</span></button>
          </div>
          <div class="g-stage" data-stage data-theme-root data-contained ${themeAttrs()}>
            <div class="g-stage-in" ${widthOf(c)}>${c.html}</div>
            <div class="g-pins" aria-hidden="true" data-audit-ignore></div>
          </div>
        </div>
        <p class="g-caption">Live and contained: everything opens inside this box. Flip mode changes only the preview.</p>
      </div>
      <div class="g-el-right">
        <h1>${esc(c.name)}</h1>
        <p class="g-apis"><code>${esc(d.api)}</code>${c.pattern ? `<span>·</span><span>${esc(c.pattern)}</span>` : ''}</p>
        <p class="g-aka"><span>Also called</span> ${c.aliases.map(esc).join(', ')}</p>
        <p class="g-about">${esc(d.about)}</p>

        <section class="g-sec"><h2>If you called it…</h2><ul class="g-called">${d.called.slice(0, 6).map((p) => `<li>“${esc(p)}”</li>`).join('')}</ul><p class="g-meant">…you meant <b>${esc(c.name)}</b>.</p></section>

        ${d.anatomy.length ? `<section class="g-sec"><h2>Anatomy</h2><ol class="g-anatomy">${d.anatomy.map((p, i) => `<li><span class="g-num">${i + 1}</span><div><b>${esc(p.name)}</b>${p.api ? `<code>${esc(p.api)}</code>` : ''}<p>${esc(p.text)}</p></div></li>`).join('')}</ol></section>` : ''}

        <section class="g-sec"><h2>States</h2><div class="g-states">${c.states.map((s) => `<span>${esc(s)}</span>`).join('')}</div></section>

        <section class="g-sec"><div class="g-sec-head"><h2>Prompt for your agent</h2><button type="button" class="g-copy" data-copy-prompt>${ICON.copy}<span>Copy</span></button></div><pre class="g-prompt">${esc(d.prompt)}</pre></section>
        <section class="g-sec"><div class="g-sec-head"><h2>When it misbehaves</h2><button type="button" class="g-copy" data-copy-debug>${ICON.copy}<span>Copy</span></button></div><pre class="g-prompt">${esc(d.debug)}</pre></section>

        <section class="g-sec"><h2>In code</h2><table class="g-code-table"><tbody>${d.code.map(([lib, name, note]) => `<tr><th scope="row">${esc(lib)}</th><td><code>${esc(name)}</code></td><td>${esc(note)}</td></tr>`).join('')}</tbody></table></section>

        <section class="g-sec"><div class="g-sec-head"><h2>Install</h2><button type="button" class="g-copy" data-copy-install>${ICON.copy}<span>Copy</span></button></div>
          <pre class="g-prompt g-mono">node scripts/install-taste.mjs --components ${c.id}</pre>
          <p class="g-files">${['html', 'css', ...(c.enhance ? ['ts'] : []), 'react.tsx'].map((x) => `<code>${c.id}.${x}</code>`).join(' ')}</p>
        </section>

        ${d.seeAlso.length ? `<section class="g-sec"><h2>See also</h2><div class="g-see">${d.seeAlso.map((s) => `<a href="#/ui/${s.id}"><b>${esc(s.name)}</b><span>${esc(s.summary)}</span></a>`).join('')}</div></section>` : ''}
      </div>
    </article>`;

  const stage = main.querySelector<HTMLElement>('.g-stage')!;
  const inner = stage.querySelector<HTMLElement>('.g-stage-in')!;
  const pinsLayer = stage.querySelector<HTMLElement>('.g-pins')!;
  let cleanup: Array<() => void> = [];
  let fitter: ReturnType<typeof fit> | null = null;
  // First load shows the demo in its most telling state (menu open, row ticked…); Reset gives a clean one.
  const mount = (preview = true) => {
    cleanup.splice(0).forEach((f) => f());
    inner.innerHTML = c.html;
    if (c.enhance) for (const el of inner.querySelectorAll<HTMLElement>('[data-lt]')) cleanup.push(c.enhance(el));
    fitter = fit(stage, inner, 28);
    cleanup.push(fitter);
    requestAnimationFrame(() => { if (preview) runPreview(c, inner); requestAnimationFrame(placePins); });
  };
  const showPins = () => main.querySelector('[data-pins]')!.getAttribute('aria-pressed') === 'true';
  function placePins() {
    pinsLayer.innerHTML = '';
    if (!showPins()) return;
    const box = stage.getBoundingClientRect();
    d.anatomy.forEach((p, i) => {
      const el = inner.querySelector<HTMLElement>(p.sel);
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      const pin = document.createElement('span');
      pin.className = 'g-pin';
      pin.textContent = String(i + 1);
      pin.style.left = `${Math.max(4, Math.min(box.width - 24, r.left - box.left - 10))}px`;
      pin.style.top = `${Math.max(4, Math.min(box.height - 24, r.top - box.top - 10))}px`;
      pinsLayer.append(pin);
    });
  }
  mount();
  let raf = 0;
  let refitTimer = 0;
  const mo = new MutationObserver((records) => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(placePins);
    // Opening a menu or dialog changes what the demo draws: re-fit, ignoring our own transform writes.
    if (records.some((r) => !(r.target === inner && r.attributeName === 'style'))) { clearTimeout(refitTimer); refitTimer = window.setTimeout(() => fitter?.refit(), 60); }
  });
  mo.observe(inner, { attributes: true, subtree: true, childList: true });
  const ro = new ResizeObserver(() => requestAnimationFrame(placePins));
  ro.observe(stage);
  cleanup.push(() => { mo.disconnect(); ro.disconnect(); });
  const offTheme = onTheme(() => requestAnimationFrame(placePins));

  main.querySelector('[data-local-mode]')!.addEventListener('click', (e) => {
    const b = e.currentTarget as HTMLElement;
    const next = stage.dataset.mode === 'dark' ? 'light' : 'dark';
    stage.classList.add('lt-mode-fade');
    setTimeout(() => stage.classList.remove('lt-mode-fade'), 420);
    stage.dataset.mode = next;
    stage.dataset.lock = 'mode';
    b.setAttribute('aria-pressed', 'true');
    b.innerHTML = `${next === 'dark' ? ICON.sun : ICON.moon}<span>Flip mode</span>`;
  });
  main.querySelector('[data-pins]')!.addEventListener('click', (e) => {
    const b = e.currentTarget as HTMLElement;
    b.setAttribute('aria-pressed', String(!showPins()));
    placePins();
  });
  main.querySelector('[data-replay]')!.addEventListener('click', () => { delete stage.dataset.lock; syncRoots(main); mount(false); });
  main.querySelector('[data-copy-prompt]')!.addEventListener('click', (e) => copyText(d.prompt, e.currentTarget as HTMLElement));
  main.querySelector('[data-copy-debug]')!.addEventListener('click', (e) => copyText(d.debug, e.currentTarget as HTMLElement));
  main.querySelector('[data-copy-install]')!.addEventListener('click', (e) => copyText(`node scripts/install-taste.mjs --components ${c.id}`, e.currentTarget as HTMLElement));
  // Links inside demos are samples: keep them from changing the gallery route.
  stage.addEventListener('click', (e) => { const a = (e.target as Element).closest('a[href^="#"]'); if (a) e.preventDefault(); });
  mounted.push(() => { cleanup.forEach((f) => f()); offTheme(); });
}
