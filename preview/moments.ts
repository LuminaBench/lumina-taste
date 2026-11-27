// Moments: every scroll moment and micro-interaction playing with motion on, each in its own stage with a
// replay button and a reduced-motion switch. Before / after: a generic section beside the kit's version.
// Scroll moments play in an iframe of the gallery itself (./?stage=<id>, see stage.ts): it has a real viewport,
// so sticky pinning, svh and scroll-driven animation behave exactly as on a page. This view scrolls it.
import { UI } from './generated/registry';
import { AXES, ICON, esc, html as doc, onTheme, theme, themeAttrs } from './core';
import { MICROS, MOMENTS, PAIRS, beforeDoc, type Micro, type Moment } from './stage-content';

type Comp = { id: string; enhance: ((el: HTMLElement) => () => void) | null };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

const reducedSwitch = (id: string) => `<label class="lt-switch g-reduced"><input type="checkbox" role="switch" data-reduced aria-describedby="${id}-t"><span data-part="track" aria-hidden="true"><span data-part="thumb"></span></span><span data-part="label">Reduced motion</span></label>`;
const replayBtn = (name: string) => `<button type="button" class="lt-btn" data-variant="secondary" data-size="sm" data-replay aria-label="Replay ${esc(name)}">${ICON.reset}<span data-part="label">Replay</span></button>`;
const bar = (id: string, name: string, line: string, api: string) => `<div class="g-mbar">
  <div class="g-mtext"><h3 id="${id}-t">${esc(name)}</h3><p>${esc(line)}</p><code>${esc(api)}</code></div>
  <div class="g-mtools">${reducedSwitch(id)}${replayBtn(name)}</div>
</div>`;

/** The theme of the gallery, as stage URL parameters (motion is the stage's own). */
const stageQuery = (reduced: boolean) => AXES.filter((k) => k !== 'motion').map((k) => `${k}=${encodeURIComponent(theme()[k])}`).join('&') + (reduced ? '&motion=reduced' : '');

/**
 * A frame that shows a page at a fixed virtual size (a desktop at 1280 wide, or a phone at 390 when the stage is
 * narrow), scaled down to the stage's width. Returns a refit function.
 */
function fitFrame(stage: HTMLElement, frame: HTMLIFrameElement, height: (wide: boolean) => number) {
  const run = () => {
    const w = stage.clientWidth;
    const wide = w >= 560;
    const vw = wide ? 1280 : 390, vh = height(wide);
    const s = w / vw;
    Object.assign(frame.style, { width: `${vw}px`, height: `${vh}px`, transform: `scale(${s.toFixed(4)})` });
    stage.style.height = `${Math.round(vh * s)}px`;
  };
  const ro = new ResizeObserver(run);
  ro.observe(stage);
  run();
  return Object.assign(() => ro.disconnect(), { refit: run });
}

// ------------------------------------------------------------------ Moments
function momentCard(m: Moment) {
  return `<article class="g-moment" id="m-${m.id}" data-moment="${m.id}">
    <div class="g-mstage" data-frame-stage><iframe title="${esc(m.name)}, playing" tabindex="-1"></iframe></div>
    ${bar(`m-${m.id}`, m.name, m.line, m.api)}
  </article>`;
}
function microCard(c: Micro) {
  return `<article class="g-micro" id="mi-${c.id}" data-micro="${c.id}">
    <div class="g-micro-stage" data-theme-root data-lock="motion" ${themeAttrs().replace(/data-motion="[^"]*"/, 'data-motion="snappy"')}>${c.body}</div>
    ${bar(`mi-${c.id}`, c.name, c.line, c.api)}
  </article>`;
}

/**
 * Plays one scroll moment: scrolls its stage page from top to bottom, or drives its slider, or reloads it.
 * Each stage is a whole page, so a stage is loaded only near the screen and emptied again when far from it.
 */
function player(card: HTMLElement, m: Moment) {
  const frame = card.querySelector('iframe')!;
  let raf = 0, run = 0, reduced = false, live = false;
  const stop = () => { cancelAnimationFrame(raf); run++; };
  const url = () => `./?stage=${m.id}&${stageQuery(reduced)}`;
  const loaded = () => live;
  const load = () => { if (!live) { live = true; frame.src = url(); } };
  const unload = () => { stop(); if (live) { live = false; frame.src = 'about:blank'; } };
  const ready = (me: number) => new Promise<boolean>((res) => {
    const ok = () => !!frame.contentDocument?.documentElement?.hasAttribute('data-stage-ready');
    const t = setInterval(() => { if (me !== run || !loaded()) { clearInterval(t); res(false); } else if (ok()) { clearInterval(t); res(true); } }, 50);
  });
  const play = async () => {
    stop();
    const me = run;
    // An entrance plays on load: reload a stage page that is up; one still loading plays it anyway (reloading it
    // now would reload about:blank and cancel it).
    if (m.kind === 'load') { if (!loaded()) load(); else if (frame.contentDocument?.documentElement?.hasAttribute('data-stage-ready')) frame.contentWindow?.location.reload(); return; }
    load();
    if (!(await ready(me)) || me !== run) return;
    const win = frame.contentWindow!, d = frame.contentDocument!;
    // Someone scrolling or dragging inside the stage takes over from the player.
    for (const t of ['wheel', 'touchstart', 'pointerdown', 'keydown']) win.addEventListener(t, stop, { once: true, passive: true });
    if (m.kind === 'slider') {
      const range = d.querySelector<HTMLInputElement>('input[type="range"]');
      if (!range) return;
      const path = [50, 18, 82, 50];
      const t0 = performance.now();
      const step = (now: number) => {
        if (me !== run) return;
        const t = Math.min(1, (now - t0) / m.ms), seg = Math.min(path.length - 2, Math.floor(t * (path.length - 1)));
        const local = t * (path.length - 1) - seg;
        range.value = String(Math.round(path[seg] + (path[seg + 1] - path[seg]) * ease(local)));
        range.dispatchEvent(new Event('input', { bubbles: true }));
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      return;
    }
    win.scrollTo(0, 0);
    await sleep(350);
    if (me !== run) return;
    // End with the block in view: its last screen at the bottom, or (a statement) its top near the top, where
    // the moment has finished. Not the empty space after it.
    const block = d.querySelector<HTMLElement>('.g-stage-page > :not(.g-stage-lead, .g-stage-tail)');
    const top = block ? block.getBoundingClientRect().top + win.scrollY : 0, vh = win.innerHeight;
    const bh = block?.offsetHeight ?? 0;
    const end = m.until != null ? top - m.until * vh : bh < vh ? top - (vh - bh) / 2 : top + bh - vh + 40;
    const max = Math.max(0, Math.min(d.documentElement.scrollHeight - vh, end));
    const t0 = performance.now();
    const step = (now: number) => {
      if (me !== run) return;
      const t = Math.min(1, (now - t0) / m.ms);
      win.scrollTo(0, Math.round(max * ease(t)));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };
  const setReduced = (on: boolean) => {
    stop();
    reduced = on;
    live = true;
    frame.src = url();
    void play();
  };
  return { play, stop, setReduced, load, unload };
}

/** Plays one micro-interaction by putting the control through its states, as a hand would. */
async function playMicro(stage: HTMLElement, id: string, alive: () => boolean) {
  const press = async (el: Element | null, ms = 130) => { if (!el) return; el.setAttribute('data-pressing', ''); await sleep(ms); el.removeAttribute('data-pressing'); };
  if (id === 'press') {
    for (const b of stage.querySelectorAll('.lt-btn')) { if (!alive()) return; await press(b, 140); await sleep(520); }
  } else if (id === 'switch') {
    for (const l of stage.querySelectorAll('.lt-switch')) {
      if (!alive()) return;
      const input = l.querySelector('input')!;
      l.setAttribute('data-pressing', ''); await sleep(160);
      input.checked = !input.checked; l.removeAttribute('data-pressing');
      await sleep(620);
    }
  } else if (id === 'tick') {
    for (const l of stage.querySelectorAll('.lt-check')) {
      if (!alive()) return;
      const input = l.querySelector('input')!;
      if (input.checked) { input.checked = false; input.dispatchEvent(new Event('change', { bubbles: true })); await sleep(220); }
      await press(l, 110);
      input.checked = true; input.dispatchEvent(new Event('change', { bubbles: true }));
      await sleep(560);
    }
  } else if (id === 'shake') {
    const form = stage.querySelector<HTMLFormElement>('form')!, input = form.querySelector('input')!;
    input.value = 'mara at kestrel';
    input.type = 'text'; input.type = 'email';
    await sleep(200);
    if (!alive()) return;
    // The check that runs when someone leaves the field, without moving their focus: a replay never steals it.
    input.dispatchEvent(new Event('blur'));
  } else if (id === 'copy') {
    const b = stage.querySelector<HTMLElement>('.lt-copy')!, text = b.querySelector('[data-part="text"]')!;
    await press(b, 120);
    // The replay shows the confirmation without writing to the clipboard; a real click copies.
    b.setAttribute('data-copied', ''); text.textContent = 'Copied';
    await sleep(1600);
    b.removeAttribute('data-copied'); text.textContent = 'Copy';
  }
}

export function viewMoments(main: HTMLElement, id?: string): () => void {
  main.innerHTML = `<section class="g-hero g-hero-sm"><h1>How the kit moves</h1><p class="g-sub">Each one plays when it comes into view. Replay it, or switch on reduced motion to see the still version every visitor who asks for it gets.</p><p class="g-meta">${MOMENTS.length} scroll moments · ${MICROS.length} micro-interactions · motion on</p></section>
    <section class="g-msec" aria-labelledby="g-ms-scroll"><h2 id="g-ms-scroll">Scroll moments</h2><p class="g-rule">At most two per page, never side by side. Each stage is a page of its own, scrolled for you.</p><div class="g-moment-grid">${MOMENTS.map(momentCard).join('')}</div></section>
    <section class="g-msec" aria-labelledby="g-ms-micro"><h2 id="g-ms-micro">Micro-interactions</h2><p class="g-rule">How a control answers a touch: transform and opacity only, nothing reflows, all still under reduced motion. Try them.</p><div class="g-micro-grid">${MICROS.map(microCard).join('')}</div></section>`;
  const offs: Array<() => void> = [];
  const comps = UI as Comp[];

  // Scroll moments
  const players = new Map<HTMLElement, ReturnType<typeof player>>();
  for (const card of main.querySelectorAll<HTMLElement>('[data-moment]')) {
    const m = MOMENTS.find((x) => x.id === card.dataset.moment)!;
    const frame = card.querySelector('iframe')!;
    offs.push(fitFrame(card.querySelector('[data-frame-stage]')!, frame, (wide) => (wide ? 760 : 700)));
    const p = player(card, m);
    players.set(card, p);
    card.querySelector('[data-replay]')!.addEventListener('click', () => void p.play());
    card.querySelector<HTMLInputElement>('[data-reduced]')!.addEventListener('change', (e) => p.setReduced((e.target as HTMLInputElement).checked));
    offs.push(p.stop);
  }
  // Micro-interactions
  const microRuns = new Map<HTMLElement, number>();
  const runMicro = (card: HTMLElement) => {
    const n = (microRuns.get(card) ?? 0) + 1;
    microRuns.set(card, n);
    void playMicro(card.querySelector('.g-micro-stage')!, card.dataset.micro!, () => microRuns.get(card) === n && card.isConnected);
  };
  for (const card of main.querySelectorAll<HTMLElement>('[data-micro]')) {
    const c = MICROS.find((x) => x.id === card.dataset.micro)!;
    const stage = card.querySelector<HTMLElement>('.g-micro-stage')!;
    for (const el of stage.querySelectorAll<HTMLElement>('[data-lt]')) { const fn = comps.find((x) => c.enhance.includes(x.id) && x.id === el.dataset.lt)?.enhance; if (fn) offs.push(fn(el)); }
    card.querySelector('[data-replay]')!.addEventListener('click', () => runMicro(card));
    card.querySelector<HTMLInputElement>('[data-reduced]')!.addEventListener('change', (e) => { stage.dataset.motion = (e.target as HTMLInputElement).checked ? 'reduced' : 'snappy'; runMicro(card); });
  }
  // Play each stage as it comes into view; leaving and coming back plays it again.
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const card = e.target as HTMLElement;
      if (!e.isIntersecting) { card.removeAttribute('data-played'); players.get(card)?.stop(); continue; }
      if (card.hasAttribute('data-played')) continue;
      card.setAttribute('data-played', '');
      if (card.dataset.micro) runMicro(card); else void players.get(card)?.play();
    }
  }, { threshold: 0.6 });
  main.querySelectorAll('[data-moment], [data-micro]').forEach((c) => io.observe(c));
  // Stages within a screen or so of the viewport are loaded; the rest are emptied.
  const near = new IntersectionObserver((entries) => {
    for (const e of entries) { const p = players.get(e.target as HTMLElement); if (e.isIntersecting) p?.load(); else p?.unload(); }
  }, { rootMargin: '60% 0px' });
  main.querySelectorAll('[data-moment]').forEach((c) => near.observe(c));
  offs.push(() => near.disconnect());
  // The stages follow the gallery's theme (but keep their own motion setting).
  offs.push(onTheme(() => main.querySelectorAll<HTMLIFrameElement>('.g-mstage iframe').forEach((f) => {
    const r = f.contentDocument?.documentElement;
    if (r) for (const k of AXES) if (k !== 'motion') r.dataset[k] = doc.dataset[k]!;
  })));
  if (id) requestAnimationFrame(() => main.querySelector(`#m-${CSS.escape(id)}, #mi-${CSS.escape(id)}`)?.scrollIntoView({ block: 'start' }));
  return () => { io.disconnect(); microRuns.clear(); offs.forEach((f) => f()); };
}

// ------------------------------------------------------------------ Before / after
export function viewBeforeAfter(main: HTMLElement): () => void {
  const dark = theme().mode === 'dark';
  main.innerHTML = `<section class="g-hero g-hero-sm"><h1>The same section, generated and designed</h1><p class="g-sub">On the left, what an assistant writes when nothing pushes it. On the right, the kit’s version of the same section for the same business.</p><p class="g-meta">${PAIRS.length} sections · one made-up roaster</p></section>
    ${PAIRS.map((p) => `<section class="g-pair" id="ba-${p.id}" aria-labelledby="ba-${p.id}-t">
      <h2 id="ba-${p.id}-t">${esc(p.title)}</h2>
      <p class="g-rule">${esc(p.rule)}</p>
      <div class="g-pair-row">
        <figure class="g-side" data-side="before"><div class="g-mstage" data-frame-stage><iframe title="${esc(p.title)}: the generic version" tabindex="-1" srcdoc="${esc(beforeDoc(p.id, dark))}"></iframe></div><figcaption>Generic</figcaption></figure>
        <figure class="g-side" data-side="after"><div class="g-mstage" data-frame-stage><iframe title="${esc(p.title)}: the kit’s version" tabindex="-1" src="./?stage=after-${p.id}&${stageQuery(false)}"></iframe></div><figcaption>With the kit</figcaption></figure>
      </div>
    </section>`).join('')}`;
  const offs: Array<() => void> = [];
  for (const row of main.querySelectorAll<HTMLElement>('.g-pair-row')) {
    const frames = [...row.querySelectorAll('iframe')];
    // Both sides of a pair share one height: the taller of the two pages, so they line up.
    let h = { wide: 640, narrow: 720 };
    const fits = frames.map((f) => fitFrame(f.parentElement!, f, (wide) => (wide ? h.wide : h.narrow)));
    const measure = () => {
      const heights = frames.map((f) => f.contentDocument?.documentElement?.scrollHeight ?? 0);
      const wide = (frames[0].parentElement!.clientWidth ?? 0) >= 560;
      const tallest = Math.min(1200, Math.max(320, ...heights));
      h = wide ? { ...h, wide: tallest } : { ...h, narrow: tallest };
      fits.forEach((f) => f.refit());
    };
    frames.forEach((f) => f.addEventListener('load', () => { measure(); setTimeout(measure, 400); }));
    offs.push(...fits);
  }
  offs.push(onTheme(() => {
    const d = theme().mode === 'dark';
    main.querySelectorAll<HTMLIFrameElement>('[data-side="before"] iframe').forEach((f) => f.contentDocument?.documentElement?.classList.toggle('dark', d));
    main.querySelectorAll<HTMLIFrameElement>('[data-side="after"] iframe').forEach((f) => {
      const r = f.contentDocument?.documentElement;
      if (r) for (const k of AXES) if (k !== 'motion') r.dataset[k] = doc.dataset[k]!;
    });
  }));
  return () => offs.forEach((f) => f());
}
