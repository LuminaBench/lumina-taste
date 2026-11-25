import { combine, dismissable, emit, on, type Cleanup } from '../../_shared/dom';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = [['Mo', 'Monday'], ['Tu', 'Tuesday'], ['We', 'Wednesday'], ['Th', 'Thursday'], ['Fr', 'Friday'], ['Sa', 'Saturday'], ['Su', 'Sunday']];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fromIso = (s?: string | null) => (s ? new Date(`${s}T12:00:00`) : null);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);
const show = (d: Date, us: boolean) => { const dd = String(d.getDate()).padStart(2, '0'), mm = String(d.getMonth() + 1).padStart(2, '0'); return us ? `${mm}/${dd}/${d.getFullYear()}` : `${dd}/${mm}/${d.getFullYear()}`; };

/**
 * Date picker: one date, typed or picked. The text field is the control (people type dates they know);
 * the calendar is help for dates they need to see. Typing accepts 24/12/2026, 24.12.26, 24 12 2026 and
 * 2026-12-24; data-order="mdy" reads month first. data-min / data-max (ISO) limit the range and say why.
 * The grid follows the APG date-picker pattern. Emits lt-change { value } as an ISO date, or null.
 */
export function enhance(root: HTMLElement): Cleanup {
  const input = root.querySelector<HTMLInputElement>('input');
  const opener = root.querySelector<HTMLButtonElement>('[data-part="open"]');
  const pop = root.querySelector<HTMLElement>('[data-part="popover"]');
  const grid = root.querySelector<HTMLTableElement>('[data-part="grid"]');
  const monthEl = root.querySelector<HTMLElement>('[data-part="month"]');
  const hint = root.querySelector<HTMLElement>('[data-part="hint"]');
  if (!input || !opener || !pop || !grid) return () => {};
  const us = root.dataset.order === 'mdy';
  const min = fromIso(root.dataset.min), max = fromIso(root.dataset.max);
  const help = hint?.textContent ?? '';
  let value = fromIso(root.dataset.value);
  let view = value ?? new Date();
  let focus = value ?? new Date(new Date().setHours(12, 0, 0, 0));
  let undismiss: Cleanup | null = null;
  const today = iso(new Date());
  const allowed = (d: Date) => (!min || iso(d) >= iso(min)) && (!max || iso(d) <= iso(max));

  const parse = (text: string): Date | null | 'bad' => {
    const t = text.trim();
    if (!t) return null;
    let y: number, m: number, d: number;
    const isoM = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    const m3 = t.match(/^(\d{1,2})[\s./-](\d{1,2})[\s./-](\d{2}|\d{4})$/);
    if (isoM) [y, m, d] = [Number(isoM[1]), Number(isoM[2]), Number(isoM[3])];
    else if (m3) { const a = Number(m3[1]), b = Number(m3[2]); y = Number(m3[3]); if (y < 100) y += 2000; [d, m] = us ? [b, a] : [a, b]; }
    else return 'bad';
    const date = new Date(y, m - 1, d, 12);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : 'bad';
  };
  const fail = (message: string) => { root.setAttribute('data-state', 'error'); input.setAttribute('aria-invalid', 'true'); if (hint) hint.textContent = message; };
  const ok = () => { root.removeAttribute('data-state'); input.removeAttribute('aria-invalid'); if (hint) hint.textContent = help; };
  const set = (d: Date | null, announce = true) => {
    value = d;
    input.value = d ? show(d, us) : '';
    if (d) { root.dataset.value = iso(d); view = d; focus = d; } else delete root.dataset.value;
    ok();
    if (announce) emit(root, { value: d ? iso(d) : null });
  };
  const commit = () => {
    const d = parse(input.value);
    if (d === 'bad') return fail(`Enter a date like ${show(new Date(2026, 11, 24, 12), us)}.`);
    if (d && !allowed(d)) return fail(min && iso(d) < iso(min) ? `Choose ${show(min, us)} or later.` : `Choose ${show(max!, us)} or earlier.`);
    if ((d ? iso(d) : null) !== (value ? iso(value) : null)) set(d); else ok();
  };

  const draw = () => {
    if (monthEl) monthEl.textContent = `${MONTHS[view.getMonth()]} ${view.getFullYear()}`;
    const first = new Date(view.getFullYear(), view.getMonth(), 1, 12);
    const offset = (first.getDay() + 6) % 7;
    const cells: string[] = [];
    for (let i = 0; i < 42; i++) {
      const d = addDays(first, i - offset), k = iso(d);
      const sel = !!value && iso(value) === k;
      cells.push(`<td role="gridcell" aria-selected="${sel}"><button type="button" data-date="${k}" tabindex="${k === iso(focus) ? 0 : -1}" aria-label="${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}"${allowed(d) ? '' : ' aria-disabled="true"'}${d.getMonth() !== view.getMonth() ? ' data-outside' : ''}${k === today ? ' data-today' : ''}${sel ? ' data-selected' : ''}>${d.getDate()}</button></td>`);
    }
    grid.innerHTML = `<thead><tr>${DAYS.map(([s, l]) => `<th scope="col" abbr="${l}">${s}</th>`).join('')}</tr></thead><tbody>${Array.from({ length: 6 }, (_, r) => `<tr>${cells.slice(r * 7, r * 7 + 7).join('')}</tr>`).join('')}</tbody>`;
  };
  const focusDate = (d: Date) => {
    focus = d;
    if (d.getMonth() !== view.getMonth() || d.getFullYear() !== view.getFullYear()) view = new Date(d.getFullYear(), d.getMonth(), 1, 12);
    draw();
    grid.querySelector<HTMLElement>(`[data-date="${iso(d)}"]`)?.focus();
  };
  const close = (refocus = true) => { if (pop.hidden) return; pop.hidden = true; opener.setAttribute('aria-expanded', 'false'); undismiss?.(); undismiss = null; if (refocus) opener.focus(); };
  const open = () => {
    const typed = parse(input.value);
    if (typed && typed !== 'bad') { view = typed; focus = typed; } else { view = value ?? new Date(); focus = value ?? new Date(new Date().setHours(12, 0, 0, 0)); }
    pop.hidden = false; opener.setAttribute('aria-expanded', 'true');
    draw();
    grid.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
    undismiss = dismissable(root, () => close(false));
  };
  const pick = (d: Date) => { if (!allowed(d)) return; set(d); close(); };
  const step = (n: number) => { view = new Date(view.getFullYear(), view.getMonth() + n, 1, 12); draw(); };

  if (value) input.value = show(value, us);
  return combine(
    on(opener, 'click', () => (pop.hidden ? open() : close())),
    on(input, 'change', commit),
    on(input, 'input', ok),
    on(input, 'keydown', (e: KeyboardEvent) => { if (e.key === 'ArrowDown' && e.altKey) { e.preventDefault(); open(); } }),
    on(root.querySelector('[data-part="prev"]')!, 'click', () => step(-1)),
    on(root.querySelector('[data-part="next"]')!, 'click', () => step(1)),
    on(grid, 'click', (e: MouseEvent) => { const b = (e.target as Element).closest<HTMLElement>('[data-date]'); if (b) pick(fromIso(b.dataset.date)!); }),
    on(pop, 'click', (e: MouseEvent) => {
      const t = (e.target as Element).closest<HTMLElement>('[data-part="today"], [data-part="clear"]');
      if (!t) return;
      if (t.dataset.part === 'clear') { set(null); close(); } else { const now = new Date(new Date().setHours(12, 0, 0, 0)); if (allowed(now)) pick(now); else focusDate(now); }
    }),
    on(pop, 'keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
      if (!(e.target as Element).closest('[data-date]')) return;
      const moves: Record<string, () => Date> = {
        ArrowLeft: () => addDays(focus, -1), ArrowRight: () => addDays(focus, 1), ArrowUp: () => addDays(focus, -7), ArrowDown: () => addDays(focus, 7),
        PageUp: () => new Date(focus.getFullYear(), focus.getMonth() - 1, focus.getDate(), 12), PageDown: () => new Date(focus.getFullYear(), focus.getMonth() + 1, focus.getDate(), 12),
        Home: () => addDays(focus, -((focus.getDay() + 6) % 7)), End: () => addDays(focus, 6 - ((focus.getDay() + 6) % 7)),
      };
      if (moves[e.key]) { e.preventDefault(); focusDate(moves[e.key]()); }
    }),
    () => undismiss?.(),
  );
}
