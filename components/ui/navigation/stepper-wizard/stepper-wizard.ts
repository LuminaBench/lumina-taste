import { combine, emit, on, type Cleanup } from '../../_shared/dom';

/** Step indicator + wizard navigation. Steps get data-state done/current/upcoming and aria-current="step". */
export function enhance(root: HTMLElement): Cleanup {
  const steps = [...root.querySelectorAll<HTMLElement>('[data-part="step"]')];
  const back = root.querySelector<HTMLButtonElement>('[data-part="back"]');
  const next = root.querySelector<HTMLButtonElement>('[data-part="next"]');
  const status = root.querySelector<HTMLElement>('[data-part="status"]');
  let current = Math.max(1, Math.min(steps.length, +(root.dataset.step ?? 1)));
  const render = () => {
    steps.forEach((s, i) => {
      const state = i + 1 < current ? 'done' : i + 1 === current ? 'current' : 'upcoming';
      s.dataset.state = state;
      if (state === 'current') s.setAttribute('aria-current', 'step'); else s.removeAttribute('aria-current');
    });
    const name = steps[current - 1].querySelector('[data-part="name"]')?.textContent;
    if (status) status.textContent = `Step ${current} of ${steps.length}: ${name}`;
    if (back) back.disabled = current === 1;
    if (next) next.querySelector('[data-part="label"]')!.textContent = current === steps.length ? 'Finish' : 'Continue';
    root.dataset.step = String(current);
  };
  render();
  return combine(
    back ? on(back, 'click', () => { current = Math.max(1, current - 1); render(); emit(root, { step: current }); }) : () => {},
    next ? on(next, 'click', () => { current = current === steps.length ? 1 : current + 1; render(); emit(root, { step: current }); }) : () => {},
  );
}
