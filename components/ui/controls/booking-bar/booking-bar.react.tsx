import { useId } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './booking-bar';
import '../date-picker/date-picker.css';
import '../number-stepper/number-stepper.css';
import './booking-bar.css';

/** Date, time and party size with one action. onCheck gets the request; return the sentence to show. */
export function BookingBar({ title, times, defaultDate, min, maxPeople = 8, action = 'Check availability', onCheck, className }: { title: string; times: string[]; defaultDate?: string; min?: string; maxPeople?: number; action?: string; onCheck?: (request: { date: string; time: string; people: number }) => void; className?: string }) {
  const id = useId();
  const ref = useEnhance<HTMLFormElement, { date: string; time: string; people: number }>(enhance, (d) => { if (d && 'time' in d) onCheck?.(d); });
  return (
    <form ref={ref} className={cx('lt-booking', className)} aria-label={title} noValidate>
      <h3>{title}</h3>
      <div data-part="fields">
        <div className="lt-date" data-value={defaultDate} data-min={min}>
          <label htmlFor={`${id}-d`}>Date</label>
          <div data-part="field"><input id={`${id}-d`} type="text" inputMode="numeric" autoComplete="off" placeholder="DD/MM/YYYY" /><button type="button" data-part="open" aria-label="Choose a date" aria-haspopup="dialog" aria-expanded="false"><Icon name="calendar" size={16} /></button></div>
          <p data-part="hint" />
          <div data-part="popover" role="dialog" aria-modal="false" aria-label="Choose a date" hidden>
            <div data-part="head"><button type="button" data-part="prev" aria-label="Previous month"><Icon name="chevron-left" size={16} /></button><h2 data-part="month" aria-live="polite" /><button type="button" data-part="next" aria-label="Next month"><Icon name="chevron-right" size={16} /></button></div>
            <table data-part="grid" role="grid" aria-label="Calendar" />
            <div data-part="foot"><button type="button" data-part="today">Today</button><button type="button" data-part="clear">Clear</button></div>
          </div>
        </div>
        <div data-part="field-time"><label htmlFor={`${id}-t`}>Time</label><select id={`${id}-t`} name="time">{times.map((t) => <option key={t}>{t}</option>)}</select></div>
        <div className="lt-stepper">
          <label htmlFor={`${id}-p`}>People</label>
          <div data-part="control">
            <button type="button" data-part="dec" aria-label="One person fewer"><Icon name="minus" size={16} /></button>
            <input id={`${id}-p`} type="number" inputMode="numeric" min={1} max={maxPeople} step={1} defaultValue={2} />
            <button type="button" data-part="inc" aria-label="One person more"><Icon name="plus" size={16} /></button>
          </div>
        </div>
        <button type="submit" className="lt-btn" data-variant="primary" data-size="lg"><span data-part="label">{action}</span></button>
      </div>
      <p data-part="result" role="status" />
    </form>
  );
}
