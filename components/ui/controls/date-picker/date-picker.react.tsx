import { useId } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './date-picker';
import './date-picker.css';

/** One date, typed or picked: <DatePicker label="Due date" defaultValue="2026-12-24" min="2026-11-25" onChange={(iso) => …} />. */
export function DatePicker({ label, defaultValue, min, max, order = 'dmy', hint, onChange, className }: { label: string; defaultValue?: string; min?: string; max?: string; order?: 'dmy' | 'mdy'; hint?: string; onChange?: (value: string | null) => void; className?: string }) {
  const id = useId();
  const ref = useEnhance<HTMLDivElement, { value: string | null }>(enhance, (d) => onChange?.(d.value));
  return (
    <div ref={ref} className={cx('lt-date', className)} data-value={defaultValue} data-min={min} data-max={max} data-order={order}>
      <label htmlFor={id}>{label}</label>
      <div data-part="field"><input id={id} type="text" inputMode="numeric" autoComplete="off" placeholder={order === 'mdy' ? 'MM/DD/YYYY' : 'DD/MM/YYYY'} aria-describedby={`${id}-hint`} /><button type="button" data-part="open" aria-label="Choose a date" aria-haspopup="dialog" aria-expanded="false"><Icon name="calendar" size={16} /></button></div>
      <p id={`${id}-hint`} data-part="hint">{hint ?? (order === 'mdy' ? 'Month, day, year.' : 'Day, month, year.')}</p>
      <div data-part="popover" role="dialog" aria-modal="false" aria-label="Choose a date" hidden>
        <div data-part="head"><button type="button" data-part="prev" aria-label="Previous month"><Icon name="chevron-left" size={16} /></button><h2 data-part="month" aria-live="polite" /><button type="button" data-part="next" aria-label="Next month"><Icon name="chevron-right" size={16} /></button></div>
        <table data-part="grid" role="grid" aria-label="Calendar" />
        <div data-part="foot"><button type="button" data-part="today">Today</button><button type="button" data-part="clear">Clear</button></div>
      </div>
    </div>
  );
}
