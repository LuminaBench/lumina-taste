import { combine, dismissable, emit, on, type Cleanup, revealInList } from '../../_shared/dom';

/** Searchable select (WAI-ARIA combobox with list autocomplete, aria-activedescendant). */
export function enhance(root: HTMLElement): Cleanup {
  const input = root.querySelector<HTMLInputElement>('[role="combobox"]')!;
  const list = root.querySelector<HTMLElement>('[role="listbox"]')!;
  const empty = root.querySelector<HTMLElement>('[data-part="empty"]');
  const toggle = root.querySelector<HTMLButtonElement>('[data-part="toggle"]');
  const options = [...list.querySelectorAll<HTMLElement>('[role="option"]')];
  const labels = new Map(options.map((o) => [o, o.querySelector('[data-part="text"]')!.textContent!.trim()]));
  let active = -1;
  let undismiss: Cleanup | null = null;
  const visible = () => options.filter((o) => !o.hidden);
  const setActive = (i: number) => {
    const vis = visible();
    active = vis.length ? (i + vis.length) % vis.length : -1;
    options.forEach((o) => o.removeAttribute('data-active'));
    const el = vis[active];
    if (el) { el.setAttribute('data-active', ''); input.setAttribute('aria-activedescendant', el.id); revealInList(el); }
    else input.removeAttribute('aria-activedescendant');
  };
  const filter = () => {
    const q = input.value.trim().toLowerCase();
    for (const o of options) {
      const text = labels.get(o)!;
      const at = text.toLowerCase().indexOf(q);
      o.hidden = !!q && at < 0;
      const slot = o.querySelector<HTMLElement>('[data-part="text"]')!;
      slot.innerHTML = q && at >= 0 ? `${esc(text.slice(0, at))}<mark>${esc(text.slice(at, at + q.length))}</mark>${esc(text.slice(at + q.length))}` : esc(text);
    }
  };
  const open = () => {
    if (!list.hidden) return;
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    filter();
    if (empty) empty.hidden = visible().length > 0;
    undismiss = dismissable(root, close);
  };
  function close() {
    list.hidden = true;
    if (empty) empty.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
    undismiss?.(); undismiss = null;
  }
  const choose = (o: HTMLElement) => {
    options.forEach((x) => x.setAttribute('aria-selected', String(x === o)));
    input.value = labels.get(o)!;
    close();
    emit(root, { value: o.dataset.value, label: input.value });
  };
  return combine(
    on(input, 'input', () => { open(); filter(); setActive(0); if (empty) empty.hidden = visible().length > 0; }),
    on(input, 'click', open),
    toggle ? on(toggle, 'click', () => { if (list.hidden) { open(); input.focus(); } else close(); }) : () => {},
    on(input, 'keydown', (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); open(); setActive(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); open(); setActive(active - 1); }
      else if (e.key === 'Enter' && !list.hidden && visible()[active]) { e.preventDefault(); choose(visible()[active]); }
      else if (e.key === 'Escape') { if (!list.hidden) { e.preventDefault(); close(); } else input.value = ''; }
    }),
    on(list, 'pointerdown', (e: PointerEvent) => e.preventDefault()),
    on(list, 'click', (e: MouseEvent) => { const o = (e.target as Element).closest<HTMLElement>('[role="option"]'); if (o) choose(o); }),
    () => undismiss?.(),
  );
}
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
