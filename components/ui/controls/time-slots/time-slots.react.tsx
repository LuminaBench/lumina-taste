import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './time-slots';
import './time-slots.css';

export interface TimeSlotsProps { day: string; zone?: string; groups: Array<{ label: string; slots: Array<{ time: string; booked?: boolean }> }>; defaultValue?: string; onChange?: (time: string) => void; className?: string }

/** Calendar-style time-slot picker with booked slots skipped by the keyboard. */
export function TimeSlots({ day, zone, groups, defaultValue, onChange, className }: TimeSlotsProps) {
  const ref = useEnhance<HTMLDivElement, { time: string }>(enhance, (d) => onChange?.(d.time));
  return (
    <div ref={ref} className={cx('lt-slots', className)}>
      <p data-part="day">{day} {zone && <span>· {zone}</span>}</p>
      {groups.map((g) => (
        <div key={g.label} role="radiogroup" aria-label={g.label} data-part="group">
          <p data-part="label" aria-hidden>{g.label}</p>
          <div data-part="grid">
            {g.slots.map((s) => (
              <button key={s.time} type="button" role="radio" aria-checked={s.time === defaultValue} aria-disabled={s.booked || undefined} data-part="slot">{s.time}</button>
            ))}
          </div>
        </div>
      ))}
      <p data-part="summary" aria-live="polite" />
    </div>
  );
}
