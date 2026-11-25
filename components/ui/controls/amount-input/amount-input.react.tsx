import { useId } from 'react';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './amount-input';
import './amount-input.css';

/** A money field: <AmountInput label="Amount" symbol="£" code="GBP" defaultValue="1,250.00" max={10000} onChange={(v) => …} />. */
export function AmountInput({ label, symbol, code, defaultValue = '', hint, min, max, locale, onChange, className }: { label: string; symbol: string; code?: string; defaultValue?: string; hint?: string; min?: number; max?: number; locale?: string; onChange?: (value: number, valid: boolean) => void; className?: string }) {
  const id = useId();
  const ref = useEnhance<HTMLDivElement, { value: number; valid: boolean }>(enhance, (d) => onChange?.(d.value, d.valid));
  return (
    <div ref={ref} className={cx('lt-amount', className)} data-min={min} data-max={max} data-locale={locale}>
      <label htmlFor={id}>{label}</label>
      <div data-part="field"><span data-part="symbol" aria-hidden>{symbol}</span><input id={id} type="text" inputMode="decimal" autoComplete="off" defaultValue={defaultValue} aria-describedby={`${id}-hint`} />{code && <span data-part="code">{code}</span>}</div>
      <p id={`${id}-hint`} data-part="hint">{hint}</p>
    </div>
  );
}
