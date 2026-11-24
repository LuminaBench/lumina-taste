import { useId } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './date-range-picker';
import '../button/button.css';
import './date-range-picker.css';

export interface DateRangePickerProps { label: string; month?: string; defaultStart?: string; defaultEnd?: string; onChange?: (r: { start: string; end: string }) => void; className?: string }

/** Dates are ISO strings (YYYY-MM-DD). `month` (YYYY-MM) sets the first visible month. */
export function DateRangePicker({ label, month, defaultStart, defaultEnd, onChange, className }: DateRangePickerProps) {
  const id = useId();
  const ref = useEnhance<HTMLDivElement, { start: string; end: string }>(enhance, onChange);
  return (
    <div ref={ref} className={cx('lt-daterange', className)} data-month={month} data-start={defaultStart} data-end={defaultEnd}>
      <span id={`${id}l`} data-part="label">{label}</span>
      <button type="button" data-part="trigger" aria-haspopup="dialog" aria-expanded={false} aria-labelledby={`${id}l ${id}v`}>
        <Icon name="calendar" /><span id={`${id}v`} data-part="value" /><Icon name="chevron-down" />
      </button>
      <div data-part="popover" role="dialog" aria-modal="false" aria-label="Choose dates" hidden>
        <div data-part="head">
          <button type="button" data-part="prev" aria-label="Previous month"><Icon name="chevron-left" /></button>
          <h2 data-part="month" aria-live="polite" />
          <button type="button" data-part="next" aria-label="Next month"><Icon name="chevron-right" /></button>
        </div>
        <table data-part="grid" role="grid" />
        <div data-part="foot">
          <span data-part="hint" />
          <button type="button" data-part="apply" className="lt-btn" data-variant="primary" data-size="sm"><span data-part="label">Apply</span></button>
        </div>
      </div>
    </div>
  );
}
