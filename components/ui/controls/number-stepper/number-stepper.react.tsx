import { useId } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './number-stepper';
import './number-stepper.css';

export interface NumberStepperProps { label: string; min?: number; max?: number; step?: number; defaultValue?: number; onChange?: (v: number) => void; className?: string }

export function NumberStepper({ label, min = 0, max = 99, step = 1, defaultValue = min, onChange, className }: NumberStepperProps) {
  const id = useId();
  const ref = useEnhance<HTMLDivElement, { value: number }>(enhance, (d) => onChange?.(d.value));
  return (
    <div ref={ref} className={cx('lt-stepper', className)}>
      <label htmlFor={id}>{label}</label>
      <div data-part="control">
        <button type="button" data-part="dec" aria-label={`Decrease ${label.toLowerCase()}`}><Icon name="minus" /></button>
        <input id={id} type="number" inputMode="numeric" min={min} max={max} step={step} defaultValue={defaultValue} />
        <button type="button" data-part="inc" aria-label={`Increase ${label.toLowerCase()}`}><Icon name="plus" /></button>
      </div>
    </div>
  );
}
