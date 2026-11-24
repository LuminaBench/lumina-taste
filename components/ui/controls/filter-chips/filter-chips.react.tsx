import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './filter-chips';
import './filter-chips.css';

export interface FilterChipsProps { label: string; options: string[]; allLabel?: string; defaultSelected?: string[]; onChange?: (selected: string[]) => void; className?: string }

/** Multi-select filter chips with an "All" chip that clears the rest. */
export function FilterChips({ label, options, allLabel = 'All', defaultSelected = [], onChange, className }: FilterChipsProps) {
  const ref = useEnhance<HTMLDivElement, { selected: string[] }>(enhance, (d) => onChange?.(d.selected));
  return (
    <div ref={ref} className={cx('lt-chips', className)} role="group" aria-label={label}>
      <button type="button" data-part="chip" data-all aria-pressed={defaultSelected.length === 0}><span data-part="check" aria-hidden><Icon name="check" /></span>{allLabel}</button>
      {options.map((o) => <button key={o} type="button" data-part="chip" aria-pressed={defaultSelected.includes(o)}><span data-part="check" aria-hidden><Icon name="check" /></span>{o}</button>)}
      <p data-part="summary" className="lt-visually-hidden" aria-live="polite" />
    </div>
  );
}
