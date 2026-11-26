// A stage: the gallery bundle opened as ./?stage=<id> inside an iframe by the Moments and Before / after views.
// It drops the gallery chrome and renders one moment (or one section of a before-and-after pair) as a page of
// its own, so scroll-driven animation, sticky pinning and svh units have a real viewport. The parent view
// scrolls it (same origin) and reloads it with &motion=reduced to show the still version.
import { UI } from './generated/registry';
import { ensureFont } from './core';
import { MOMENTS, PAIRS } from './stage-content';

const params = new URLSearchParams(location.search);
export const STAGE = params.get('stage');

type Comp = { id: string; enhance: ((el: HTMLElement) => () => void) | null };

export function bootStage(id: string) {
  const root = document.documentElement;
  for (const k of ['palette', 'mode', 'type', 'density', 'radius', 'style'] as const) {
    const v = params.get(k);
    if (v && /^[a-z-]+$/.test(v)) root.dataset[k] = v;
  }
  root.dataset.motion = params.get('motion') === 'reduced' ? 'reduced' : 'snappy';
  root.dataset.view = 'stage';
  ensureFont(root.dataset.type!);
  document.querySelectorAll('.g-top, .g-foot, .g-skip').forEach((n) => n.remove());
  const main = document.getElementById('g-main')!;
  main.className = 'g-stage-page';
  main.removeAttribute('tabindex');

  const moment = MOMENTS.find((m) => m.id === id);
  const pair = PAIRS.find((p) => `after-${p.id}` === id);
  if (moment) {
    document.title = `${moment.name}, playing`;
    main.toggleAttribute('data-scroll', !!moment.reveal);
    // A scroll moment needs room to arrive from below and leave above; the parent scrolls through it.
    main.innerHTML = moment.kind === 'scroll' ? `<div class="g-stage-lead"></div>${moment.body()}<div class="g-stage-tail"></div>` : moment.body();
  } else if (pair) {
    document.title = `${pair.title}, the kit's version`;
    main.innerHTML = pair.body();
    main.dataset.pair = pair.id;
  } else {
    main.innerHTML = '<p class="g-stage-missing">Nothing on this stage.</p>';
  }
  // Every [data-lt] element boots with its component's enhancer, as on a real page.
  const comps = UI as Comp[];
  for (const el of main.querySelectorAll<HTMLElement>('[data-lt]')) comps.find((c) => c.id === el.dataset.lt)?.enhance?.(el);
  root.dataset.stageReady = '';
}
