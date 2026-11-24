import { useEffect, useRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../../_shared/react';
import './checkbox.css';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> { label: ReactNode; indeterminate?: boolean }

/** Animated checkbox: the tick draws itself; supports indeterminate. */
export function Checkbox({ label, indeterminate = false, className, ...input }: CheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate; }, [indeterminate]);
  return (
    <label className={cx('lt-check', className)}>
      <input ref={ref} type="checkbox" {...input} />
      <span data-part="box" aria-hidden="true">
        <svg viewBox="0 0 16 16"><path data-part="tick" d="m3.5 8.5 3 3 6-7" /><path data-part="dash" d="M4 8h8" /></svg>
      </span>
      {label}
    </label>
  );
}
