import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './visit-info';
import './visit-info.css';

/** Where a place is, how to get there and when it is open. days: Monday first; hours like "8:00 to 16:00" or "Closed". */
export function VisitInfo({ title, address, directions = [], phone, email, days, note, now, className }: { title: string; address: string[]; directions?: Array<{ by: string; text: string }>; phone?: string; email?: string; days: Array<{ day: string; hours: string }>; note?: string; now?: string; className?: string }) {
  const ref = useEnhance<HTMLElement>(enhance, undefined, [now]);
  return (
    <section ref={ref} className={cx('lt-visit', className)} aria-label={title} data-now={now}>
      <header><h2>{title}</h2></header>
      <div data-part="cols">
        <div data-part="where">
          <h3>Address</h3>
          <address>{address.map((l, i) => <span key={i}>{l}{i < address.length - 1 && <br />}</span>)}</address>
          {directions.length > 0 && <><h3>Getting here</h3><ul>{directions.map((d) => <li key={d.by}><b>{d.by}</b> {d.text}</li>)}</ul></>}
          <p data-part="links">{phone && <a href={`tel:${phone.replace(/\s/g, '')}`}>{phone}</a>}{email && <a href={`mailto:${email}`}>{email}</a>}</p>
        </div>
        <div data-part="when">
          <h3>Opening hours</h3>
          <p data-part="now" role="status" />
          <table><tbody>{days.map((d, i) => <tr key={d.day} data-day={i + 1}><th scope="row">{d.day}</th><td data-closed={d.hours === 'Closed' ? '' : undefined}>{d.hours}</td></tr>)}</tbody></table>
          {note && <p data-part="note">{note}</p>}
        </div>
      </div>
    </section>
  );
}
