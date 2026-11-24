import { $$, combine, emit, on, part, type Cleanup } from '../../_shared/dom';

/** Product card: colour swatches recolour the item, favourite toggles, Add confirms in place. */
export function enhance(root: HTMLElement): Cleanup {
  const fav = part<HTMLButtonElement>(root, 'fav')!;
  const add = part<HTMLButtonElement>(root, 'add')!;
  const name = part(root, 'colname')!;
  let t = 0;
  return combine(
    ...$$<HTMLInputElement>(root, '[data-part="sw"] input').map((r) => on(r, 'change', () => {
      root.style.setProperty('--c', (r.parentElement as HTMLElement).style.getPropertyValue('--c'));
      name.textContent = r.value;
      emit(root, { colour: r.value });
    })),
    on(fav, 'click', () => { const on = fav.getAttribute('aria-pressed') !== 'true'; fav.setAttribute('aria-pressed', String(on)); emit(root, { favourite: on }); }),
    on(add, 'click', () => {
      add.setAttribute('data-done', ''); add.textContent = 'Added';
      clearTimeout(t); t = window.setTimeout(() => { add.removeAttribute('data-done'); add.textContent = 'Add to basket'; }, 1800);
      emit(root, { added: true });
    }),
    () => clearTimeout(t),
  );
}
