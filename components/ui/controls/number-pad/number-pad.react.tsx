import { cx, useEnhance } from '../../_shared/react';
import { Icon } from '../../_shared/Icon';
import { enhance } from './number-pad';
import './number-pad.css';

export interface NumberPadProps {
  /** The currency symbol before the amount. */
  currency?: string;
  /** Above this the hint turns into a warning and `over` is true. */
  max?: number;
  /** One line under the amount: the limit, the balance, who it goes to. */
  hint?: string;
  onChange?: (detail: { value: number; text: string; over: boolean }) => void;
  className?: string;
}

/** A large amount and twelve keys for a thumb (and the keyboard). */
export function NumberPad({ currency = '£', max, hint, onChange, className }: NumberPadProps) {
  const ref = useEnhance<HTMLDivElement, { value: number; text: string; over: boolean }>(enhance, onChange);
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'];
  return (
    <div ref={ref} className={cx('lt-numpad', className)} data-currency={currency} data-max={max}>
      <output data-part="display" aria-live="polite"><span data-part="symbol">{currency}</span><span data-part="value">0</span></output>
      <p data-part="hint">{hint}</p>
      <div data-part="keys" role="group" aria-label="Amount keypad">
        {keys.map((k) => <button key={k} type="button" data-key={k}>{k}</button>)}
        <button type="button" data-key="back" aria-label="Delete the last digit"><Icon name="x" size={22} /></button>
      </div>
    </div>
  );
}
