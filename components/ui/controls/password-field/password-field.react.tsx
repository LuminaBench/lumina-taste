import { useId } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './password-field';
import './password-field.css';

/** New-password field: show/hide, strength meter, rules that tick as you type. */
export function PasswordField({ label = 'New password', onChange, className }: { label?: string; onChange?: (score: number) => void; className?: string }) {
  const id = useId();
  const ref = useEnhance<HTMLDivElement, { score: number }>(enhance, (d) => onChange?.(d.score));
  return (
    <div ref={ref} className={cx('lt-password', className)}>
      <label htmlFor={id}>{label}</label>
      <div data-part="box"><input id={id} type="password" autoComplete="new-password" aria-describedby={`${id}-rules ${id}-s`} /><button type="button" data-part="reveal" aria-pressed="false" aria-label="Show password"><Icon name="eye" /></button></div>
      <div data-part="meter" aria-hidden><i /><i /><i /><i /></div>
      <p id={`${id}-s`} data-part="strength" aria-live="polite" />
      <ul id={`${id}-rules`} data-part="rules"><li data-rule="len">At least 12 characters</li><li data-rule="mix">Upper and lower case</li><li data-rule="num">A number or symbol</li></ul>
    </div>
  );
}
