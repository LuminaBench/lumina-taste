import { $$, combine, emit, on, part, roving, type Cleanup } from '../../_shared/dom';

/**
 * WAI-ARIA toolbar: one tab stop, arrows move between controls, toggle buttons use aria-pressed and
 * the alignment pair is a radiogroup. ⌘B / ⌘I work while the toolbar or its text has focus.
 */
export function enhance(root: HTMLElement): Cleanup {
  const bar = part(root, 'toolbar')!;
  const text = part(root, 'text')!;
  const controls = () => $$<HTMLButtonElement>(bar, 'button');
  const state = () => ({
    bold: bar.querySelector('[data-cmd="bold"]')!.getAttribute('aria-pressed') === 'true',
    italic: bar.querySelector('[data-cmd="italic"]')!.getAttribute('aria-pressed') === 'true',
    align: bar.querySelector('[aria-checked="true"]')?.getAttribute('data-align') ?? 'left',
  });
  const apply = () => {
    const s = state();
    text.toggleAttribute('data-bold', s.bold);
    text.toggleAttribute('data-italic', s.italic);
    text.dataset.align = s.align;
    emit(root, s);
  };
  const toggle = (cmd: string) => { const b = bar.querySelector<HTMLButtonElement>(`[data-cmd="${cmd}"]`); if (b) { b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); apply(); } };
  return combine(
    roving(bar, controls, { orientation: 'horizontal' }),
    on(bar, 'click', (e) => {
      const b = (e.target as Element).closest<HTMLButtonElement>('button');
      if (!b) return;
      controls().forEach((x) => (x.tabIndex = x === b ? 0 : -1));
      if (b.dataset.cmd === 'link') { emit(root, { ...state(), link: true }); return; }
      if (b.dataset.cmd) return toggle(b.dataset.cmd);
      if (b.dataset.align) { $$(bar, '[data-align]').forEach((r) => r.setAttribute('aria-checked', String(r === b))); apply(); }
    }),
    on(root, 'keydown', (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k === 'b' || k === 'i') { e.preventDefault(); toggle(k === 'b' ? 'bold' : 'italic'); }
    }),
  );
}
