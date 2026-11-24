import { on, type Cleanup } from '../../_shared/dom';

/** Re-runs the stagger animation (demo). In apps, the CSS alone animates items as they mount. */
export function enhance(root: HTMLElement): Cleanup {
  const list = root.querySelector<HTMLElement>('.lt-stagger')!;
  return on(root.querySelector('[data-part="replay"]')!, 'click', () => {
    list.classList.remove('lt-stagger');
    void list.offsetWidth;
    list.classList.add('lt-stagger');
  });
}
