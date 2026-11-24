import { Icon } from '../../_shared/Icon';
import { cx } from '../../_shared/react';
import { SegmentedControl } from '../../controls/segmented-control/segmented-control.react';
import './filter-bar.css';

export interface FilterBarProps { ranges: Array<{ value: string; label: string }>; range: string; filters: string[]; onRangeChange: (v: string) => void; onRemove: (f: string) => void; onAdd: () => void; onReset: () => void; className?: string }

/** Controlled global filter bar: one per dashboard; cards inherit its state. */
export function FilterBar({ ranges, range, filters, onRangeChange, onRemove, onAdd, onReset, className }: FilterBarProps) {
  return (
    <div className={cx('lt-filterbar', className)} role="toolbar" aria-label="Dashboard filters">
      <SegmentedControl label="Date range" options={ranges} defaultValue={range} onChange={onRangeChange} />
      {filters.map((f) => <button key={f} type="button" data-part="chip" aria-pressed="true" aria-label={`Remove filter ${f}`} onClick={() => onRemove(f)}>{f} <Icon name="x" size={12} /></button>)}
      <button type="button" data-part="add" onClick={onAdd}><Icon name="plus" size={14} />Add filter</button>
      <button type="button" data-part="reset" onClick={onReset}>Reset</button>
    </div>
  );
}
