import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './segmented-control';
import './segmented-control.css';

export interface SegmentedControlProps { label: string; options: Array<{ value: string; label: string }>; defaultValue?: string; onChange?: (value: string) => void; className?: string }

export function SegmentedControl({ label, options, defaultValue = options[0]?.value, onChange, className }: SegmentedControlProps) {
  const ref = useEnhance<HTMLDivElement, { value: string }>(enhance, (d) => onChange?.(d.value));
  return (
    <div ref={ref} className={cx('lt-segmented', className)} role="radiogroup" aria-label={label}>
      <span data-part="indicator" aria-hidden="true" />
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === defaultValue} tabIndex={o.value === defaultValue ? 0 : -1} data-value={o.value}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
