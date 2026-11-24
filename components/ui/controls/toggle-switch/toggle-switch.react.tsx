import type { InputHTMLAttributes, ReactNode } from 'react';
import { cx } from '../../_shared/react';
import './toggle-switch.css';

export interface ToggleSwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'role'> { label: ReactNode }

/** Tactile settings switch. Native checkbox underneath, so forms and keyboard just work. */
export function ToggleSwitch({ label, className, ...input }: ToggleSwitchProps) {
  return (
    <label className={cx('lt-switch', className)}>
      <input type="checkbox" role="switch" {...input} />
      <span data-part="track" aria-hidden="true"><span data-part="thumb" /></span>
      <span data-part="label">{label}</span>
    </label>
  );
}
