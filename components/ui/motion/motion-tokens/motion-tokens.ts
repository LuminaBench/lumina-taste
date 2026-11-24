import { on, type Cleanup } from '../../_shared/dom';

/** Demo: replays each curve so the difference between ease-out, spring and in-out is visible side by side. */
export function enhance(root: HTMLElement): Cleanup {
  const run = () => { root.toggleAttribute('data-run'); };
  const t = setTimeout(run, 300);
  const off = on(root.querySelector('[data-part="replay"]')!, 'click', run);
  return () => { clearTimeout(t); off(); };
}
