import { useId } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx } from '../../_shared/react';
import './radio-cards.css';

export interface RadioCard { value: string; title: string; description?: string; price?: string; priceValue?: number; unit?: string }
export interface RadioCardsProps { legend: string; options: RadioCard[]; defaultValue?: string; onChange?: (value: string) => void; className?: string }

export function RadioCards({ legend, options, defaultValue, onChange, className }: RadioCardsProps) {
  const name = useId();
  return (
    <fieldset className={cx('lt-radio-cards', className)}>
      <legend>{legend}</legend>
      {options.map((o) => (
        <label data-part="card" key={o.value}>
          <input type="radio" name={name} value={o.value} defaultChecked={o.value === defaultValue} onChange={() => onChange?.(o.value)} />
          <span data-part="check" aria-hidden="true"><Icon name="check" size={14} /></span>
          <span data-part="title">{o.title}</span>
          {o.description && <span data-part="desc">{o.description}</span>}
          {o.price && <span data-part="price"><data value={o.priceValue}>{o.price}</data>{o.unit && ` / ${o.unit}`}</span>}
        </label>
      ))}
    </fieldset>
  );
}
