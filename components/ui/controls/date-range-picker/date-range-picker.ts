import { combine, dismissable, emit, on, type Cleanup } from '../../_shared/dom';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = (s?: string) => (s ? new Date(`${s}T12:00:00`) : null);
const short = (d: Date) => `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);

/** Date range picker: calendar grid in a non-modal dialog, full arrow-key navigation (APG date picker). */
export function enhance(root: HTMLElement): Cleanup {
  const trigger = root.querySelector<HTMLButtonElement>('[data-part="trigger"]')!;
  const pop = root.querySelector<HTMLElement>('[data-part="popover"]')!;
  const grid = root.querySelector<HTMLTableElement>('[data-part="grid"]')!;
  const monthEl = root.querySelector<HTMLElement>('[data-part="month"]')!;
  const valueEl = root.querySelector<HTMLElement>('[data-part="value"]')!;
  const hint = root.querySelector<HTMLElement>('[data-part="hint"]')!;
  let start = parse(root.dataset.start);
  let end = parse(root.dataset.end);
  let view = parse(`${root.dataset.month ?? iso(new Date()).slice(0, 7)}-01`)!;
  let focus = start ?? view;
  let hover: Date | null = null;
  const today = iso(new Date());
  let undismiss: Cleanup | null = null;

  const label = () => {
    if (!start) return 'Select dates';
    const y = (end ?? start).getFullYear();
    return end ? `${short(start)} – ${short(end)}, ${y}` : `${short(start)} – …`;
  };
  const draw = () => {
    monthEl.textContent = `${MONTHS[view.getMonth()]} ${view.getFullYear()}`;
    const first = new Date(view.getFullYear(), view.getMonth(), 1, 12);
    const offset = (first.getDay() + 6) % 7;
    const cells: string[] = [];
    const lo = start, hi = end ?? (start && hover ? hover : null);
    const [a, b] = lo && hi && hi < lo ? [hi, lo] : [lo, hi];
    for (let i = 0; i < 42; i++) {
      const d = addDays(first, i - offset);
      const k = iso(d);
      const attrs = [
        d.getMonth() !== view.getMonth() ? 'data-outside' : '',
        k === today ? 'data-today' : '',
        a && iso(a) === k ? 'data-start' : '',
        b && iso(b) === k ? 'data-end' : '',
        a && b && d > a && d < b ? 'data-in-range' : '',
      ].join(' ');
      const sel = (a && iso(a) === k) || (b && iso(b) === k);
      cells.push(`<td role="gridcell" aria-selected="${!!sel}"><button type="button" data-date="${k}" tabindex="${k === iso(focus) ? 0 : -1}" aria-label="${d.toDateString()}" ${attrs}>${d.getDate()}</button></td>`);
    }
    grid.innerHTML = `<thead><tr>${DAYS.map((d) => `<th scope="col" abbr="${d}">${d}</th>`).join('')}</tr></thead><tbody>${Array.from({ length: 6 }, (_, r) => `<tr>${cells.slice(r * 7, r * 7 + 7).join('')}</tr>`).join('')}</tbody>`;
    hint.textContent = start && !end ? 'Now pick an end date' : start && end ? `${Math.round((+end - +start) / 864e5) + 1} days` : 'Pick a start and end date';
  };
  const focusDate = (d: Date) => {
    focus = d;
    if (d.getMonth() !== view.getMonth() || d.getFullYear() !== view.getFullYear()) view = new Date(d.getFullYear(), d.getMonth(), 1, 12);
    draw();
    grid.querySelector<HTMLElement>(`[data-date="${iso(d)}"]`)?.focus();
  };
  const open = () => {
    pop.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    focus = start ?? view;
    draw();
    grid.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
    undismiss = dismissable(root, () => close(false));
  };
  const close = (refocus = true) => {
    pop.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    undismiss?.(); undismiss = null;
    if (refocus) trigger.focus();
  };
  const pick = (d: Date) => {
    if (!start || end) { start = d; end = null; }
    else { end = d < start ? start : d; start = d < start ? d : start; }
    focus = d;
    draw();
    grid.querySelector<HTMLElement>(`[data-date="${iso(d)}"]`)?.focus();
  };
  const apply = () => {
    valueEl.textContent = label();
    if (start && end) emit(root, { start: iso(start), end: iso(end) });
    close();
  };
  valueEl.textContent = label();
  return combine(
    on(trigger, 'click', () => (pop.hidden ? open() : close())),
    on(root.querySelector('[data-part="prev"]')!, 'click', () => { view = new Date(view.getFullYear(), view.getMonth() - 1, 1, 12); draw(); }),
    on(root.querySelector('[data-part="next"]')!, 'click', () => { view = new Date(view.getFullYear(), view.getMonth() + 1, 1, 12); draw(); }),
    on(root.querySelector('[data-part="apply"]')!, 'click', apply),
    on(grid, 'click', (e: MouseEvent) => {
      const b = (e.target as Element).closest<HTMLElement>('[data-date]');
      if (b) pick(parse(b.dataset.date)!);
    }),
    on(grid, 'pointerover', (e: PointerEvent) => {
      const b = (e.target as Element).closest<HTMLElement>('[data-date]');
      if (b && start && !end) { hover = parse(b.dataset.date); draw(); }
    }),
    on(pop, 'keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (!(e.target as Element).closest('[data-date]')) return;
      const moves: Record<string, () => Date> = {
        ArrowLeft: () => addDays(focus, -1), ArrowRight: () => addDays(focus, 1),
        ArrowUp: () => addDays(focus, -7), ArrowDown: () => addDays(focus, 7),
        PageUp: () => new Date(focus.getFullYear(), focus.getMonth() - 1, focus.getDate(), 12),
        PageDown: () => new Date(focus.getFullYear(), focus.getMonth() + 1, focus.getDate(), 12),
        Home: () => addDays(focus, -((focus.getDay() + 6) % 7)), End: () => addDays(focus, 6 - ((focus.getDay() + 6) % 7)),
      };
      if (moves[e.key]) { e.preventDefault(); focusDate(moves[e.key]()); }
    }),
    () => undismiss?.(),
  );
}
