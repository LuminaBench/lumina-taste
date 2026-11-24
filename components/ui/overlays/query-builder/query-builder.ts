import { combine, emit, on, type Cleanup } from '../../_shared/dom';
import { enhance as segmented } from '../../controls/segmented-control/segmented-control';

const FIELDS: Record<string, { label: string; ops: string[]; type: string; placeholder: string }> = {
  plan: { label: 'Plan', ops: ['is', 'is not'], type: 'text', placeholder: 'Team' },
  mrr: { label: 'MRR (£)', ops: ['>', '<', '='], type: 'number', placeholder: '500' },
  country: { label: 'Country', ops: ['is', 'is not'], type: 'text', placeholder: 'GB' },
  seats: { label: 'Seats', ops: ['>', '<', '='], type: 'number', placeholder: '10' },
  signed_up: { label: 'Signed up', ops: ['after', 'before'], type: 'date', placeholder: '' },
};
const x = '<svg class="lt-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
let n = 0;

function ruleHtml(field = 'plan', op?: string, value = '') {
  const f = FIELDS[field];
  const id = `lt-q${++n}`;
  return `<li data-part="rule"><span data-part="joiner"></span>
    <select aria-label="Field" id="${id}f">${Object.entries(FIELDS).map(([k, v]) => `<option value="${k}"${k === field ? ' selected' : ''}>${v.label}</option>`).join('')}</select>
    <select aria-label="Operator">${f.ops.map((o) => `<option${o === op ? ' selected' : ''}>${o}</option>`).join('')}</select>
    <input aria-label="Value" type="${f.type}" placeholder="${f.placeholder}" value="${value}">
    <button type="button" data-part="remove" aria-label="Remove rule">${x}</button></li>`;
}

/** Rule / predicate query builder with AND/OR groups (one nested level) and a live query preview. */
export function enhance(root: HTMLElement): Cleanup {
  const top = root.querySelector<HTMLElement>('[data-part="group"]')!;
  const preview = root.querySelector<HTMLElement>('[data-part="preview"]')!;
  const cleanups: Cleanup[] = [];
  const logicOf = (g: Element) => g.querySelector<HTMLElement>(':scope > [data-part="group-head"] [aria-checked="true"]')?.dataset.value ?? 'AND';
  const serialize = (g: Element): string => {
    const parts = [...g.querySelectorAll(':scope > [data-part="rules"] > li')].map((li) => {
      if (li.matches('[data-part="nested"]')) return `(${serialize(li.querySelector('[data-part="group"]')!)})`;
      const [field, op] = [...li.querySelectorAll('select')].map((s) => s.value);
      const v = li.querySelector('input')!.value || '…';
      return `${field} ${op} ${FIELDS[field].type === 'number' ? v : `"${v}"`}`;
    });
    return parts.join(` ${logicOf(g)} `) || 'everything';
  };
  const refresh = () => {
    root.querySelectorAll<HTMLElement>('[data-part="group"]').forEach((g) => {
      const logic = logicOf(g);
      g.querySelectorAll<HTMLElement>(':scope > [data-part="rules"] > li > [data-part="joiner"]').forEach((j, i) => (j.textContent = i === 0 ? 'WHERE' : logic));
    });
    const q = serialize(top);
    preview.textContent = q;
    emit(root, { query: q });
  };
  const initGroup = (g: HTMLElement) => {
    const seg = g.querySelector<HTMLElement>(':scope > [data-part="group-head"] .lt-segmented');
    if (seg) { cleanups.push(segmented(seg)); seg.addEventListener('lt-change', (e) => { e.stopPropagation(); refresh(); }); }
  };
  const rulesOf = (g: Element) => g.querySelector<HTMLElement>(':scope > [data-part="rules"]')!;
  rulesOf(top).insertAdjacentHTML('beforeend', ruleHtml('plan', 'is', 'Team') + ruleHtml('mrr', '>', '500'));
  initGroup(top);
  refresh();
  return combine(
    on(root, 'click', (e: MouseEvent) => {
      const t = e.target as Element;
      const group = t.closest<HTMLElement>('[data-part="group"]');
      if (!group) return;
      if (t.closest('[data-part="add-rule"]')) { rulesOf(group).insertAdjacentHTML('beforeend', ruleHtml('country')); rulesOf(group).lastElementChild?.querySelector('select')?.focus(); }
      else if (t.closest('[data-part="add-group"]') && group.dataset.depth === '0') {
        rulesOf(group).insertAdjacentHTML('beforeend', `<li data-part="nested"><span data-part="joiner"></span><div data-part="group" data-depth="1"><div data-part="group-head"><div class="lt-segmented" role="radiogroup" aria-label="Combine nested rules with"><span data-part="indicator" aria-hidden="true"></span><button type="button" role="radio" aria-checked="false" tabindex="-1" data-value="AND">AND</button><button type="button" role="radio" aria-checked="true" tabindex="0" data-value="OR">OR</button></div><button type="button" data-part="remove" aria-label="Remove group">${x}</button></div><ol data-part="rules">${ruleHtml('seats', '>', '10')}${ruleHtml('country', 'is', 'US')}</ol><div data-part="group-actions"><button type="button" data-part="add-rule">Add rule</button></div></div></li>`);
        initGroup(rulesOf(group).lastElementChild!.querySelector('[data-part="group"]')!);
      } else if (t.closest('[data-part="remove"]')) {
        const li = t.closest('li[data-part="rule"]') ?? t.closest('li[data-part="nested"]');
        li?.remove();
      } else return;
      refresh();
    }),
    on(root, 'change', (e: Event) => {
      const sel = e.target as HTMLSelectElement;
      const li = sel.closest('li[data-part="rule"]');
      if (li && sel === li.querySelector('select')) li.outerHTML = ruleHtml(sel.value);
      refresh();
    }),
    on(root, 'input', refresh),
    () => cleanups.forEach((c) => c()),
  );
}
