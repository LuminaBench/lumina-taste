import { combine, emit, on, part, type Cleanup } from '../../_shared/dom';

/**
 * Number pad: keys (and a hardware keyboard while focus is inside) build an amount with at most two decimals.
 * data-max caps it (the hint turns to a warning above it, data-over on the root); data-currency is the symbol.
 * Emits lt-change with { value: number, text: string, over: boolean }. setValue(root, "12.5") sets it from code.
 */
export function enhance(root: HTMLElement): Cleanup {
  const value = part(root, 'value')!;
  const hint = part(root, 'hint');
  const base = hint?.textContent ?? '';
  const max = Number(root.dataset.max ?? Infinity);
  const sym = root.dataset.currency ?? '';
  let text = root.dataset.value ?? '';
  const fmt = (t: string) => { if (!t) return '0'; const [i, d] = t.split('.'); return `${Number(i || 0).toLocaleString('en-GB')}${d !== undefined ? `.${d}` : ''}`; };
  const render = (fire = true) => {
    const n = Number(text || 0);
    const over = n > max;
    value.textContent = fmt(text);
    root.toggleAttribute('data-empty', !text);
    root.toggleAttribute('data-over', over);
    root.dataset.len = String(fmt(text).length);
    if (hint) hint.textContent = over ? `That is more than ${sym}${max.toLocaleString('en-GB')}, the daily limit` : base;
    root.dataset.value = text;
    if (fire) emit(root, { value: n, text, over });
  };
  const press = (k: string) => {
    if (k === 'back') text = text.slice(0, -1);
    else if (k === '.') { if (!text.includes('.')) text = (text || '0') + '.'; }
    else if (/^\d$/.test(k)) {
      const [, d] = text.split('.');
      if (d !== undefined && d.length >= 2) return;
      if (text === '0') text = '';
      if (text.replace('.', '').length >= 7) return;
      text += k;
    }
    render();
  };
  render(false);
  (root as HTMLElement & { ltSet?: (t: string) => void }).ltSet = (t: string) => { text = t; render(); };
  return combine(
    on(root, 'click', (e) => { const b = (e.target as Element).closest<HTMLButtonElement>('button[data-key]'); if (b) press(b.dataset.key!); }),
    on(root, 'keydown', (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key === 'Backspace' || e.key === 'Delete' ? 'back' : e.key === ',' ? '.' : e.key;
      if (!/^(\d|\.|back)$/.test(k)) return;
      e.preventDefault();
      press(k);
      const b = root.querySelector<HTMLButtonElement>(`button[data-key="${k}"]`);
      if (b) { b.setAttribute('data-pressed', ''); setTimeout(() => b.removeAttribute('data-pressed'), 120); }
    }),
  );
}

/** Set the pad's amount from code ("" clears it). */
export const setValue = (root: HTMLElement, text: string) => (root as HTMLElement & { ltSet?: (t: string) => void }).ltSet?.(text);
