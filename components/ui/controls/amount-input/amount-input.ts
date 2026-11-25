import { combine, emit, on, type Cleanup } from '../../_shared/dom';

/**
 * Amount input: typing keeps digits and one decimal point; leaving the field formats the value with
 * thousands separators and two decimals. data-min / data-max validate on blur and explain the limit in
 * the hint. data-locale (en-GB) and data-decimals (2) set the format. Emits lt-change { value } as a number.
 */
export function enhance(root: HTMLElement): Cleanup {
  const input = root.querySelector<HTMLInputElement>('input');
  const hint = root.querySelector<HTMLElement>('[data-part="hint"]');
  if (!input) return () => {};
  const decimals = Number(root.dataset.decimals ?? 2);
  const fmt = new Intl.NumberFormat(root.dataset.locale ?? 'en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const symbol = root.querySelector('[data-part="symbol"]')?.textContent ?? '';
  const help = hint?.textContent ?? '';
  const read = () => { const v = parseFloat(input.value.replace(/[^\d.]/g, '')); return Number.isFinite(v) ? v : null; };
  const clean = () => {
    // Digits and the first decimal point only; no more decimals than the currency has.
    let v = input.value.replace(/[^\d.]/g, '');
    const dot = v.indexOf('.');
    if (dot >= 0) v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, '').slice(0, decimals);
    if (v !== input.value) input.value = v;
    root.removeAttribute('data-state'); input.removeAttribute('aria-invalid');
    if (hint) hint.textContent = help;
  };
  const commit = () => {
    const v = read();
    if (v === null) { input.value = ''; return; }
    input.value = fmt.format(v);
    const min = root.dataset.min ? Number(root.dataset.min) : null, max = root.dataset.max ? Number(root.dataset.max) : null;
    const problem = max !== null && v > max ? `The most you can enter is ${symbol}${fmt.format(max)}.` : min !== null && v < min ? `The least you can enter is ${symbol}${fmt.format(min)}.` : '';
    if (problem) { root.setAttribute('data-state', 'error'); input.setAttribute('aria-invalid', 'true'); if (hint) hint.textContent = problem; }
    emit(root, { value: v, valid: !problem });
  };
  return combine(on(input, 'input', clean), on(input, 'blur', commit), on(input, 'focus', () => { const v = read(); if (v !== null) input.value = String(v); input.select(); }), on(input, 'keydown', (e) => { if (e.key === 'Enter') input.blur(); }));
}
