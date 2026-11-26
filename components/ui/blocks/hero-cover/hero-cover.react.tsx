import type { ReactNode } from 'react';
import { cx } from '../../_shared/react';
import './hero-cover.css';

export interface HeroCoverProps {
  /** The name, set as a masthead across the column. */
  name: string;
  /** Two or three short facts for the date line; a date is best given as { date, label }. */
  dateline: Array<string | { date: string; label: string }>;
  /** The cover line: the claim in one sentence. */
  line: string; primary: { label: string; href: string }; secondary?: { label: string; href: string };
  /** One large picture: a photograph, an art panel or a device frame. */
  visual?: ReactNode; className?: string;
}

/** Hero set like a magazine cover: masthead, date line, one picture and the cover line. */
export function HeroCover({ name, dateline, line, primary, secondary, visual, className }: HeroCoverProps) {
  return (
    <section className={cx('lt-hero-cover', className)} aria-label={name}>
      <h1 data-part="masthead" style={{ ['--cover-len' as string]: name.length }}>{name}</h1>
      <p data-part="dateline">{dateline.map((d) => (typeof d === 'string' ? <span key={d}>{d}</span> : <time key={d.date} dateTime={d.date}>{d.label}</time>))}</p>
      {visual && <div data-part="visual">{visual}</div>}
      <div data-part="copy">
        <p data-part="lede">{line}</p>
        <div data-part="cta"><a className="lt-btn" data-variant="primary" data-size="lg" href={primary.href}>{primary.label}</a>{secondary && <a className="lt-btn" data-variant="ghost" data-size="lg" href={secondary.href}>{secondary.label}</a>}</div>
      </div>
    </section>
  );
}
