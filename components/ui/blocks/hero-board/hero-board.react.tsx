import type { ReactNode } from 'react';
import { cx } from '../../_shared/react';
import './hero-board.css';

export interface BoardRow {
  /** A coffee, a dish, a destination. */
  name: string;
  /** Menu: the price ("£3.40"). Departures: the time ("07:12"). */
  figure: string;
  /** Menu: what is in it, one line. Departures: the stop or platform. */
  note?: string;
  /** Departures only: "On time", "Boarding", "8 min late". */
  status?: string;
}
export interface HeroBoardProps {
  title: string; eyebrow?: string; lede?: string; primary: { label: string; href: string };
  variant?: 'menu' | 'departures';
  /** The board's own heading ("On the bar today", "Departures from Kestrel Point") and a note on its right. */
  board: { title: string; aside?: string; rows: BoardRow[]; foot?: string };
  /** An optional photograph, art panel or device that the board rises over. */
  visual?: ReactNode; className?: string;
}

/** Hero whose picture is the subject's own board: a menu with prices or departures with times. */
export function HeroBoard({ title, eyebrow, lede, primary, variant = 'menu', board, visual, className }: HeroBoardProps) {
  const timeOf = (t: string) => (/^\d{1,2}:\d\d$/.test(t) ? t.padStart(5, '0') : undefined);
  return (
    <section className={cx('lt-hero-board', className)} data-variant={variant} aria-label={title}>
      <div data-part="copy">
        {eyebrow && <p data-part="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {lede && <p data-part="lede">{lede}</p>}
        <div data-part="cta"><a className="lt-btn" data-variant="primary" data-size="lg" href={primary.href}>{primary.label}</a></div>
      </div>
      <figure data-part="board" data-tone="dark">
        <figcaption><b>{board.title}</b>{board.aside && <span>{board.aside}</span>}</figcaption>
        <ol data-part="rows">
          {board.rows.map((r) => variant === 'departures'
            ? <li key={r.name + r.figure}><time dateTime={timeOf(r.figure)}>{r.figure}</time><b>{r.name}</b><span>{r.note}</span><span data-part="status">{r.status}</span></li>
            : <li key={r.name}><b>{r.name}</b><data value={r.figure.replace(/[^\d.]/g, '')}>{r.figure}</data>{r.note && <small>{r.note}</small>}</li>)}
        </ol>
        {board.foot && <p data-part="foot">{board.foot}</p>}
      </figure>
      {visual && <div data-part="visual">{visual}</div>}
    </section>
  );
}
