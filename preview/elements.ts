// Elements: the index grid (live mini previews) and the element page (contained live demo,
// anatomy pins, plain explanation, agent prompts, names in code).
import { BLUEPRINTS, CHARTS, COMPARE, FAMILIES, STYLES, UI } from './generated/registry';
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
/**
 * Show a top-layer popover (tooltip, popover, hover card) as a plain positioned box so thumbnails can
 * picture it. `anchor` is a selector inside the demo; a leading "^" places the box above it. The
 * static copy goes away the moment someone interacts, so the real component takes over.
 */
function staticOpen(inner: HTMLElement, sel: string, anchor?: string) {
  for (const pop of inner.querySelectorAll<HTMLElement>(sel)) {
    const root = pop.closest<HTMLElement>('[data-lt]') ?? pop.parentElement!;
    if (getComputedStyle(root).position === 'static') root.style.position = 'relative';
    const above = anchor?.startsWith('^');
    const a = (anchor ? root.querySelector<HTMLElement>(anchor.replace(/^\^/, '')) : pop.previousElementSibling) as HTMLElement | null;
    if (!a) continue;
    pop.setAttribute('data-static-open', '');
    pop.style.left = `${a.offsetLeft}px`;
    pop.style.top = above ? `${a.offsetTop - pop.offsetHeight - 8}px` : `${a.offsetTop + a.offsetHeight + 8}px`;
  }
  const clear = () => inner.querySelectorAll<HTMLElement>('[data-static-open]').forEach((p) => { p.removeAttribute('data-static-open'); p.style.left = p.style.top = ''; });
  for (const t of ['pointerdown', 'pointerover', 'focusin'] as const) inner.addEventListener(t, clear, { once: true });
}

export function runPreview(c: Doc, inner: HTMLElement) {
  for (const [kind, sel, text] of c.preview ?? []) {
    const el = inner.querySelector<HTMLElement>(sel);
    if (!el) continue;
    if (kind === 'click') el.click();
    else if (kind === 'type' && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) { el.value = text ?? ''; el.dispatchEvent(new Event('input', { bubbles: true })); }
    else if (kind === 'scroll') el.scrollTop = +(text ?? 0);
    else if (kind === 'static') staticOpen(inner, sel, text);
  }
}
const codeTabs = (c: Doc) => [
  { ext: 'html', label: 'HTML' }, { ext: 'css', label: 'CSS' },
  ...(c.enhance ? [{ ext: 'ts', label: 'TypeScript' }] : []),
  { ext: 'react.tsx', label: 'React' },
];
const srcCache = new Map<string, string>();
async function loadSource(id: string, ext: string) {
  const key = `${id}.${ext}`;
  if (!srcCache.has(key)) {
    const res = await fetch(`./src/${id}/${key}.txt`);
    srcCache.set(key, res.ok ? await res.text() : '// Not available');
  }
  return srcCache.get(key)!;
}
/** Tiny highlighter: comments muted, strings and attribute values in accent ink. Escapes first. */
function highlight(src: string) {
  const e = src.replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[ch]!);
  return e.replace(/(\/\*[\s\S]*?\*\/|\/\/[^\n]*|&lt;!--[\s\S]*?--&gt;)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)/g,
    (_m, com, str) => (com ? `<span class="g-tk-c">${com}</span>` : `<span class="g-tk-s">${str}</span>`));
}

const widthOf = (c: Doc) => (c.w ? `style="width:${c.w}px"` : '');

/** A compact card for comparison rows: live thumbnail, name and a one-line "use it for". */
export function miniCard(c: Doc, note: string) {
  return `<article class="g-card g-cmp-card" data-id="${c.id}">
    <div class="g-prev" data-stage data-theme-root data-contained inert ${themeAttrs()}><div class="g-prev-in" ${widthOf(c)}>${c.html}</div></div>
    <div class="g-card-body"><div class="g-card-title"><h3><a class="g-stretch" href="#/ui/${c.id}">${esc(c.name)}</a></h3></div><p>${esc(note)}</p></div>
  </article>`;
}

let mounted: Array<() => void> = [];
export function mountPreviews(scope: ParentNode) {
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
    <article class="g-el${(c.w ?? 0) >= 900 ? ' g-el-wide' : ''}" id="ui-${c.id}" data-id="${c.id}">
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

        ${COMPARE.pairs.filter((p) => p.ids.includes(c.id)).map((p) => `<section class="g-sec g-confused"><h2>Often confused with</h2><p class="g-rule">${esc(p.rule)}</p><div class="g-see">${p.ids.filter((x) => x !== c.id).map(byId).filter(Boolean).map((o) => `<a href="#/ui/${o!.id}"><b>${esc(o!.name)}</b><span>${esc(p.use[o!.id])}</span></a>`).join('')}</div><a class="g-more" href="#/compare/${p.id}">Compare side by side</a></section>`).join('')}
        <section class="g-sec"><h2>States</h2><div class="g-states">${c.states.map((s) => `<span>${esc(s)}</span>`).join('')}</div></section>

        <section class="g-sec"><div class="g-sec-head"><h2>Prompt for your agent</h2><button type="button" class="g-copy" data-copy-prompt>${ICON.copy}<span>Copy</span></button></div><pre class="g-prompt">${esc(d.prompt)}</pre></section>
        <section class="g-sec g-code-sec"><div class="g-sec-head"><h2>Code</h2><button type="button" class="g-copy" data-copy-code>${ICON.copy}<span>Copy</span></button></div>
          <div class="g-code-tabs" role="tablist" aria-label="Source files">${codeTabs(c).map((t, i) => `<button type="button" role="tab" id="g-tab-${t.ext.replace('.', '-')}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-ext="${t.ext}">${t.label}</button>`).join('')}</div>
          <pre class="g-src" role="tabpanel" tabindex="0" aria-live="polite"><code>Loading…</code></pre>
        </section>
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
    const placed: Array<{ x: number; y: number }> = [];
    const clearOfPins = (x: number, y: number) => placed.every((p) => Math.abs(p.x - x) > 22 || Math.abs(p.y - y) > 22);
    // A spot is good when no demo text sits under the pin's centre or corners.
    const overText = (x: number, y: number) => [[10, 10], [3, 3], [17, 3], [3, 17], [17, 17]].some(([dx, dy]) =>
      document.elementsFromPoint(box.left + x + dx, box.top + y + dy).some((el) => inner.contains(el) && (el instanceof SVGElement || el.matches('input, img, canvas') || [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()))));
    const free = (x: number, y: number) => clearOfPins(x, y) && !overText(x, y);
    d.anatomy.forEach((p, i) => {
      const el = inner.querySelector<HTMLElement>(p.sel);
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      // Prefer just outside the element's left edge, centred; then above its top-left corner;
      // then nudge down until the pin does not sit on another pin.
      const L = r.left - box.left, T = r.top - box.top;
      const left: [number, number] = [L - 26, T + Math.min(r.height, 40) / 2 - 10];
      const above: [number, number] = [L + Math.min(r.width, 40) / 2 - 10, T - 26];
      const right: [number, number] = [L + r.width + 6, T + Math.min(r.height, 40) / 2 - 10];
      // Small inline targets (a star, a chip) have neighbours on both sides: go above them.
      const below: [number, number] = [L + Math.min(r.width, 40) / 2 - 10, T + r.height + 6];
      const corner: [number, number] = [L - 10, T - 10];
      const far: Array<[number, number]> = [[above[0], T - 48], [L - 48, left[1]], [L + r.width + 28, right[1]], [below[0], T + r.height + 28]];
      const tries: Array<[number, number]> = [...(r.width < 120 ? [above, left, right, below] : [left, above, right, below]), ...far, corner];
      const inBox = ([tx, ty]: [number, number]) => tx >= 4 && ty >= 4 && tx <= box.width - 24 && ty <= box.height - 24;
      let [x, y] = tries.find((t) => inBox(t) && free(t[0], t[1])) ?? tries.find((t) => inBox(t) && clearOfPins(t[0], t[1])) ?? corner;
      x = Math.max(4, Math.min(box.width - 24, x));
      y = Math.max(4, Math.min(box.height - 24, y));
      for (let k = 0; k < 8 && !clearOfPins(x, y); k++) y = Math.min(box.height - 24, y + 22);
      placed.push({ x, y });
      const pin = document.createElement('span');
      pin.className = 'g-pin';
      pin.textContent = String(i + 1);
      pin.style.left = `${x}px`;
      pin.style.top = `${y}px`;
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
  // Code tabs: fetch the real source files on demand.
  const src = main.querySelector<HTMLElement>('.g-src code')!;
  const tabs = [...main.querySelectorAll<HTMLButtonElement>('.g-code-tabs [role="tab"]')];
  let currentExt = tabs[0]?.dataset.ext ?? 'html';
  const showTab = async (t: HTMLButtonElement) => {
    tabs.forEach((x) => { const on = x === t; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; });
    currentExt = t.dataset.ext!;
    src.parentElement!.setAttribute('aria-labelledby', t.id);
    src.innerHTML = highlight(await loadSource(c.id, currentExt));
  };
  tabs.forEach((t) => t.addEventListener('click', () => showTab(t)));
  main.querySelector('.g-code-tabs')?.addEventListener('keydown', (e) => {
    const k = (e as KeyboardEvent).key;
    if (k !== 'ArrowRight' && k !== 'ArrowLeft') return;
    const i = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
    const next = tabs[(i + (k === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    next.focus(); void showTab(next);
  });
  if (tabs[0]) void showTab(tabs[0]);
  main.querySelector('[data-copy-code]')!.addEventListener('click', async (e) => copyText(await loadSource(c.id, currentExt), e.currentTarget as HTMLElement));
  main.querySelector('[data-copy-debug]')!.addEventListener('click', (e) => copyText(d.debug, e.currentTarget as HTMLElement));
  main.querySelector('[data-copy-install]')!.addEventListener('click', (e) => copyText(`node scripts/install-taste.mjs --components ${c.id}`, e.currentTarget as HTMLElement));
  // Links inside demos are samples: keep them from changing the gallery route.
  stage.addEventListener('click', (e) => { const a = (e.target as Element).closest('a[href^="#"]'); if (a) e.preventDefault(); });
  mounted.push(() => { cleanup.forEach((f) => f()); offTheme(); });
}
