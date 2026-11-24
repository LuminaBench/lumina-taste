import { useId } from 'react';
import { cx } from '../../_shared/react';
import './radio-group.css';

export interface RadioGroupProps { legend: string; options: Array<{ value: string; label: string; disabled?: boolean }>; defaultValue?: string; name?: string; onChange?: (value: string) => void; className?: string }

export function RadioGroup({ legend, options, defaultValue, name, onChange, className }: RadioGroupProps) {
  const auto = useId();
  return (
    <fieldset className={cx('lt-radio-group', className)}>
      <legend>{legend}</legend>
      {options.map((o) => (
        <label className="lt-radio" key={o.value}>
          <input type="radio" name={name ?? auto} value={o.value} defaultChecked={o.value === defaultValue} disabled={o.disabled} onChange={() => onChange?.(o.value)} />
          <span data-part="dot" aria-hidden="true" />
          {o.label}
        </label>
      ))}
    </fieldset>
  );
}
