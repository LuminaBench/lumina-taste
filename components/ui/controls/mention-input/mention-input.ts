import { $$, combine, emit, on, part, type Cleanup, revealInList } from '../../_shared/dom';

/**
 * @-mentions in a textarea: typing "@" plus letters opens a filtered listbox under the caret;
 * arrows move, Enter or Tab inserts "@handle ", Esc closes. The textarea keeps focus throughout.
 */
export function enhance(root: HTMLElement): Cleanup {
  const ta = root.querySelector('textarea')!;
  const list = part(root, 'list')!;
  const opts = $$<HTMLElement>(list, '[role="option"]');
  let start = -1, active = 0;
  const visible = () => opts.filter((o) => !o.hidden);
  const close = () => { list.hidden = true; ta.setAttribute('aria-expanded', 'false'); ta.removeAttribute('aria-activedescendant'); start = -1; };
  const highlight = (i: number) => {
    const v = visible();
    if (!v.length) return;
    active = (i + v.length) % v.length;
    opts.forEach((o) => o.setAttribute('aria-selected', String(o === v[active])));
    ta.setAttribute('aria-activedescendant', v[active].id);
    revealInList(v[active]);
  };
  // Place the list under the caret using a mirror element.
  const caret = () => {
    const m = document.createElement('div');
    const cs = getComputedStyle(ta);
    for (const p of ['font', 'lineHeight', 'padding', 'border', 'width', 'letterSpacing', 'boxSizing'] as const) (m.style as unknown as Record<string, string>)[p] = cs[p];
    Object.assign(m.style, { position: 'absolute', visibility: 'hidden', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', top: '0', left: '0' });
    m.textContent = ta.value.slice(0, ta.selectionStart);
    const mark = document.createElement('span');
    mark.textContent = '\u200b';
    m.append(mark);
    ta.parentElement!.append(m);
    const x = Math.min(mark.offsetLeft, ta.clientWidth - 240), y = mark.offsetTop + parseFloat(cs.lineHeight) - ta.scrollTop;
    m.remove();
    list.style.setProperty('--x', `${Math.max(4, x)}px`);
    list.style.setProperty('--y', `${y}px`);
  };
  const update = () => {
    const pos = ta.selectionStart;
    const m = /(^|\s)@([\w.-]{0,20})$/.exec(ta.value.slice(0, pos));
    if (!m) return close();
    start = pos - m[2].length - 1;
    const q = m[2].toLowerCase();
    let shown = 0;
    opts.forEach((o) => { const hit = !q || o.dataset.handle!.startsWith(q) || o.textContent!.toLowerCase().includes(q); o.hidden = !hit; if (hit) shown++; });
    if (!shown) return close();
    list.hidden = false;
    ta.setAttribute('aria-expanded', 'true');
    caret();
    highlight(0);
  };
  const insert = (o: HTMLElement) => {
    const handle = `@${o.dataset.handle} `;
    const end = ta.selectionStart;
    ta.value = ta.value.slice(0, start) + handle + ta.value.slice(end);
    const at = start + handle.length;
    ta.setSelectionRange(at, at);
    close();
    ta.focus();
    emit(root, { mention: o.dataset.handle, value: ta.value });
  };
  return combine(
    on(ta, 'input', update),
    on(ta, 'click', update),
    on(ta, 'keydown', (e: KeyboardEvent) => {
      if (list.hidden) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); highlight(active + (e.key === 'ArrowDown' ? 1 : -1)); }
      else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insert(visible()[active]); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    }),
    on(list, 'pointerdown', (e: PointerEvent) => { const o = (e.target as Element).closest<HTMLElement>('[role="option"]'); if (o) { e.preventDefault(); insert(o); } }),
    on(ta, 'blur', () => setTimeout(close, 120)),
  );
}
