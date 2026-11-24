import { Fragment } from 'react';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './otp-input';
import './otp-input.css';

export interface OtpInputProps { length?: number; label?: string; expected?: string; onComplete?: (code: string, ok: boolean) => void; className?: string }

export function OtpInput({ length = 6, label = `Enter the ${length}-digit code`, expected, onComplete, className }: OtpInputProps) {
  const ref = useEnhance<HTMLFieldSetElement, { value: string; complete: boolean }>(enhance, (d) => onComplete?.(d.value, d.complete));
  const half = Math.ceil(length / 2);
  return (
    <fieldset ref={ref} className={cx('lt-otp', className)} data-expected={expected}>
      <legend>{label}</legend>
      <div data-part="fields">
        {Array.from({ length }, (_, i) => (
          <Fragment key={i}>
            {i === half && length > 4 && <span data-part="sep" aria-hidden="true" />}
            <input inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : undefined} maxLength={1} aria-label={`Digit ${i + 1}`} />
          </Fragment>
        ))}
      </div>
      <p data-part="status" role="status" aria-live="polite" />
    </fieldset>
  );
}
