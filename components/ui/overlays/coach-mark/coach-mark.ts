import { combine, emit, on, trapFocus, type Cleanup } from '../../_shared/dom';

/** Product tour: a spotlight cut-out moves across [data-tour] targets (in order) with a step card. Esc or Skip ends it. */
export function enhance(root: HTMLElement): Cleanup {
  const layer = root.querySelector<HTMLElement>('[data-part="layer"]')!;
  const spot = layer.querySelector<HTMLElement>('[data-part="spot"]')!;
  const card = layer.querySelector<HTMLElement>('[data-part="card"]')!;
  const startBtn = root.querySelector<HTMLElement>('[data-part="start"]');
  const steps = () => [...root.querySelectorAll<HTMLElement>('[data-tour]')].sort((a, b) => +a.dataset.tour! - +b.dataset.tour!);
  let i = 0;
  const show = () => {
    const list = steps();
    const t = list[i];
    if (!t.closest('[data-contained]')) t.scrollIntoView({ block: 'nearest' });
    const t0 = t.getBoundingClientRect();
    const box = layer.getBoundingClientRect(); // the viewport, or the contained preview box
    const r = { left: t0.left - box.left, top: t0.top - box.top, width: t0.width, height: t0.height, bottom: t0.bottom - box.top };
    const W = box.width, H = box.height;
    const pad = 6;
    spot.style.cssText = `--x:${r.left - pad}px;--y:${r.top - pad}px;--w:${r.width + pad * 2}px;--h:${r.height + pad * 2}px`;
    const cw = Math.min(300, W - 24);
    const below = r.bottom + 14 + 180 < H;
    card.style.setProperty('--cx', `${Math.min(Math.max(12, r.left), W - cw - 12)}px`);
    card.style.setProperty('--cy', `${below ? r.bottom + 14 : Math.max(12, r.top - 14 - card.offsetHeight)}px`);
    card.querySelector('[data-part="step"]')!.textContent = `Step ${i + 1} of ${list.length}`;
    card.querySelector('h3')!.textContent = t.dataset.title ?? '';
    card.querySelector('h3 + p')!.textContent = t.dataset.body ?? '';
    (card.querySelector('[data-part="back"]') as HTMLButtonElement).disabled = i === 0;
    card.querySelector('[data-part="next"] [data-part="label"]')!.textContent = i === list.length - 1 ? 'Done' : 'Next';
  };
  const end = (completed: boolean) => { layer.hidden = true; emit(root, { completed, step: i + 1 }); startBtn?.focus(); };
  const start = () => { i = 0; layer.hidden = false; show(); (card.querySelector('[data-part="next"]') as HTMLElement).focus(); };
  return combine(
    startBtn ? on(startBtn, 'click', start) : () => {},
    on(card, 'click', (e: MouseEvent) => {
      const t = e.target as Element;
      if (t.closest('[data-part="skip"]')) end(false);
      else if (t.closest('[data-part="back"]')) { i = Math.max(0, i - 1); show(); }
      else if (t.closest('[data-part="next"]')) { if (i === steps().length - 1) end(true); else { i++; show(); } }
    }),
    on(layer, 'keydown', (e: KeyboardEvent) => { if (e.key === 'Escape') end(false); }),
    on(window, 'resize', () => { if (!layer.hidden) show(); }),
    trapFocus(card),
  );
}
