import { combine, emit, on, type Cleanup } from '../../_shared/dom';

/** Session list: ↑ and ↓ move between sessions across projects; choosing one marks it current and emits its title. */
export function enhance(root: HTMLElement): Cleanup {
  const links = () => [...root.querySelectorAll<HTMLAnchorElement>('section a')];
  return combine(
    on(root, 'keydown', (e: KeyboardEvent) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const all = links(); const i = all.indexOf(document.activeElement as HTMLAnchorElement);
      if (i < 0) return;
      e.preventDefault();
      all[(i + (e.key === 'ArrowDown' ? 1 : -1) + all.length) % all.length].focus();
    }),
    on(root, 'click', (e: MouseEvent) => {
      const a = (e.target as Element).closest<HTMLAnchorElement>('section a');
      if (!a) return;
      for (const l of links()) l.removeAttribute('aria-current');
      a.setAttribute('aria-current', 'page');
      emit(root, { session: a.querySelector('[data-part="title"]')?.textContent ?? '' });
    }),
  );
}
