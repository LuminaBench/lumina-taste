import { $$, combine, emit, on, part, reserveWidth, type Cleanup } from '../../_shared/dom';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/**
 * JSON viewer: renders data-json as a WAI-ARIA tree. Objects and arrays collapse; arrows move,
 * Right/Left expand and collapse, Home/End jump. Values are typed by colour and by their text.
 */
export function enhance(root: HTMLElement): Cleanup {
  const tree = part(root, 'tree')!;
  const toggleAll = part<HTMLButtonElement>(root, 'toggle-all');
  let data: unknown;
  try { data = JSON.parse(root.dataset.json ?? 'null'); } catch { tree.textContent = 'Invalid JSON'; return () => {}; }
  const value = (v: unknown): string => {
    if (v === null) return '<span data-t="null">null</span>';
    if (typeof v === 'string') return `<span data-t="string">"${esc(v)}"</span>`;
    if (typeof v === 'number') return `<span data-t="number">${v}</span>`;
    if (typeof v === 'boolean') return `<span data-t="boolean">${v}</span>`;
    return '';
  };
  const node = (key: string | null, v: unknown, depth: number): string => {
    const k = key === null ? '' : `<span data-part="key">${esc(key)}</span>: `;
    if (v && typeof v === 'object') {
      const entries = Array.isArray(v) ? v.map((x, i) => [String(i), x] as const) : Object.entries(v as Record<string, unknown>);
      const hint = Array.isArray(v) ? `[${entries.length}]` : `{${entries.length}}`;
      return `<li role="treeitem" aria-expanded="true" aria-level="${depth}" tabindex="-1"><span data-part="row"><span data-part="caret" aria-hidden="true">›</span>${k}<span data-part="hint">${hint}</span></span><ul role="group">${entries.map(([ck, cv]) => node(ck, cv, depth + 1)).join('')}</ul></li>`;
    }
    return `<li role="treeitem" aria-level="${depth}" tabindex="-1"><span data-part="row"><span data-part="caret" aria-hidden="true"></span>${k}${value(v)}</span></li>`;
  };
  tree.innerHTML = `<ul>${node(null, data, 1)}</ul>`;
  const items = () => $$<HTMLElement>(tree, '[role="treeitem"]').filter((el) => !el.parentElement!.closest('[aria-expanded="false"]'));
  const first = items()[0];
  if (first) first.tabIndex = 0;
  const focus = (el: HTMLElement) => { $$<HTMLElement>(tree, '[role="treeitem"]').forEach((x) => (x.tabIndex = x === el ? 0 : -1)); el.focus(); };
  const toggle = (el: HTMLElement, open?: boolean) => { if (!el.hasAttribute('aria-expanded')) return; const next = open ?? el.getAttribute('aria-expanded') !== 'true'; el.setAttribute('aria-expanded', String(next)); emit(root, { path: el.querySelector('[data-part="key"]')?.textContent ?? 'root', open: next }); };
  return combine(
    toggleAll ? reserveWidth(toggleAll, ['Collapse all', 'Expand all']) : () => {},
    on(tree, 'click', (e) => { const row = (e.target as Element).closest('[data-part="row"]'); const it = row?.parentElement as HTMLElement | undefined; if (it) { toggle(it); focus(it); } }),
    on(tree, 'keydown', (e: KeyboardEvent) => {
      const it = (e.target as Element).closest<HTMLElement>('[role="treeitem"]');
      if (!it) return;
      const list = items(), i = list.indexOf(it);
      const open = it.getAttribute('aria-expanded') === 'true';
      if (e.key === 'ArrowDown' && list[i + 1]) focus(list[i + 1]);
      else if (e.key === 'ArrowUp' && list[i - 1]) focus(list[i - 1]);
      else if (e.key === 'ArrowRight') { if (it.hasAttribute('aria-expanded') && !open) toggle(it, true); else if (open) focus(items()[i + 1]); }
      else if (e.key === 'ArrowLeft') { if (open) toggle(it, false); else { const parent = it.parentElement!.closest<HTMLElement>('[role="treeitem"]'); if (parent) focus(parent); } }
      else if (e.key === 'Home') focus(list[0]);
      else if (e.key === 'End') focus(list[list.length - 1]);
      else if (e.key === 'Enter' || e.key === ' ') toggle(it);
      else return;
      e.preventDefault();
    }),
    toggleAll ? on(toggleAll, 'click', () => {
      const collapse = toggleAll.getAttribute('aria-pressed') !== 'true';
      $$<HTMLElement>(tree, '[aria-expanded]').forEach((el, k) => k > 0 && el.setAttribute('aria-expanded', String(!collapse)));
      toggleAll.setAttribute('aria-pressed', String(collapse));
      toggleAll.textContent = collapse ? 'Expand all' : 'Collapse all';
    }) : () => {},
  );
}
