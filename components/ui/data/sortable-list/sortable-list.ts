import { combine, emit, on, type Cleanup } from '../../_shared/dom';

/** Drag-and-drop reorder with a pointer handle, plus a full keyboard alternative and live announcements. */
export function enhance(root: HTMLElement): Cleanup {
  const list = root.querySelector<HTMLElement>('.lt-sortable')!;
  const live = root.querySelector<HTMLElement>('[data-part="live"]');
  const items = () => [...list.children] as HTMLElement[];
  const name = (li: HTMLElement) => li.querySelector('span')?.textContent ?? '';
  const say = (msg: string) => { if (live) live.textContent = msg; };
  const done = () => emit(root, { order: items().map(name) });
  // Pointer drag
  let drag: { li: HTMLElement; y0: number; startIndex: number } | null = null;
  const onMove = (e: PointerEvent) => {
    if (!drag) return;
    const { li } = drag;
    li.style.translate = `0 ${e.clientY - drag.y0}px`;
    const mid = li.getBoundingClientRect().top + li.offsetHeight / 2;
    for (const other of items()) {
      if (other === li) continue;
      const r = other.getBoundingClientRect();
      const before = items().indexOf(other) < items().indexOf(li);
      if ((before && mid < r.top + r.height / 2) || (!before && mid > r.top + r.height / 2)) {
        const top0 = li.getBoundingClientRect().top;
        before ? other.before(li) : other.after(li);
        drag.y0 += li.getBoundingClientRect().top - top0;
        li.style.translate = `0 ${e.clientY - drag.y0}px`;
        break;
      }
    }
  };
  const onUp = () => {
    if (!drag) return;
    drag.li.removeAttribute('data-grabbed');
    drag.li.style.translate = '';
    say(`${name(drag.li)} dropped at position ${items().indexOf(drag.li) + 1} of ${items().length}`);
    drag = null;
    done();
  };
  // Keyboard
  let kb: { li: HTMLElement; startIndex: number } | null = null;
  return combine(
    on(list, 'pointerdown', (e: PointerEvent) => {
      const h = (e.target as Element).closest<HTMLElement>('[data-part="handle"]');
      if (!h || e.button !== 0) return;
      e.preventDefault();
      const li = h.closest('li') as HTMLElement;
      drag = { li, y0: e.clientY, startIndex: items().indexOf(li) };
      li.setAttribute('data-grabbed', '');
      h.focus();
    }),
    on(document, 'pointermove', onMove),
    on(document, 'pointerup', onUp),
    on(list, 'keydown', (e: KeyboardEvent) => {
      const h = (e.target as Element).closest<HTMLElement>('[data-part="handle"]');
      if (!h) return;
      const li = h.closest('li') as HTMLElement;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!kb) { kb = { li, startIndex: items().indexOf(li) }; li.setAttribute('data-grabbed', ''); li.setAttribute('data-kb', ''); say(`Picked up ${name(li)}. Position ${kb.startIndex + 1} of ${items().length}.`); }
        else { li.removeAttribute('data-grabbed'); li.removeAttribute('data-kb'); say(`${name(li)} dropped at position ${items().indexOf(li) + 1}.`); kb = null; done(); }
      } else if (kb && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        const i = items().indexOf(li);
        const j = e.key === 'ArrowUp' ? i - 1 : i + 1;
        if (j < 0 || j >= items().length) return;
        e.key === 'ArrowUp' ? items()[j].before(li) : items()[j].after(li);
        h.focus();
        say(`Position ${j + 1} of ${items().length}`);
      } else if (kb && e.key === 'Escape') {
        const ref = items().filter((x) => x !== li)[kb.startIndex];
        ref ? ref.before(li) : list.append(li);
        li.removeAttribute('data-grabbed'); li.removeAttribute('data-kb');
        say(`Reorder cancelled. ${name(li)} returned to position ${kb.startIndex + 1}.`);
        kb = null;
        h.focus();
      }
    }),
  );
}
