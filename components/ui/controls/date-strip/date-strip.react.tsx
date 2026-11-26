import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './date-strip';
import './date-strip.css';

export interface StripDay {
  /** ISO date, "2026-12-01". */
  date: string; weekday: string; day: number;
  /** Read out after the day: "December, 6 times free". */
  label: string;
  /** A day with nothing free, or closed. */
  disabled?: boolean;
}
export interface DateStripProps { days: StripDay[]; defaultDate?: string; label?: string; onChange?: (date: string) => void; className?: string }

/** A row of days to choose one from, sideways on a phone. */
export function DateStrip({ days, defaultDate, label = 'Day', onChange, className }: DateStripProps) {
  const ref = useEnhance<HTMLDivElement, { date: string }>(enhance, (d) => onChange?.(d.date));
  const chosen = defaultDate ?? days.find((d) => !d.disabled)?.date;
  return (
    <div ref={ref} className={cx('lt-datestrip', className)}>
      <div data-part="track" role="radiogroup" aria-label={label}>
        {days.map((d) => (
          <button key={d.date} type="button" role="radio" aria-checked={d.date === chosen} aria-disabled={d.disabled || undefined} tabIndex={d.date === chosen ? 0 : -1} data-date={d.date}>
            <span>{d.weekday}</span><b>{d.day}</b>{!d.disabled && <i data-part="dot" aria-hidden="true" />}<span className="lt-visually-hidden">{d.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
