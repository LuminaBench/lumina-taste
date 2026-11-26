import type { ReactNode } from 'react';
import { cx } from '../../_shared/react';
import './hero-statement.css';

export interface HeroStatementProps {
  eyebrow?: string; title: string; lede: string; actions?: ReactNode; facts?: Array<{ value: string; label: string }>;
  /** tucked: a small picture tucked into the headline. poster: the date set enormous, on the brand colour. */
  variant?: 'tucked' | 'poster';
  /** tucked and poster: a photograph, an art panel or a phone. */
  visual?: ReactNode;
  /** poster: the date ({ iso: '2027-05-14', days: '14–15', rest: 'May 2027' }). */
  date?: { iso?: string; days: string; rest?: string };
  className?: string;
}

/** A type-led hero: one very large headline, then a ruled row with the pitch, the action and three facts. */
export function HeroStatement({ eyebrow, title, lede, actions, facts = [], variant, visual, date, className }: HeroStatementProps) {
  return (
    <section className={cx('lt-hero-statement', className)} aria-label={title} data-variant={variant} data-tone={variant === 'poster' ? 'accent' : undefined}>
      {eyebrow && <p data-part="eyebrow">{eyebrow}</p>}
      {variant === 'poster' && date && <p data-part="date"><time dateTime={date.iso}>{date.days}</time>{date.rest && <span>{date.rest}</span>}</p>}
      {variant === 'tucked' && visual && <div data-part="visual">{visual}</div>}
      <h1>{title}</h1>
      {variant === 'poster' && visual && <div data-part="visual">{visual}</div>}
      <div data-part="foot">
        <div data-part="pitch"><p data-part="lede">{lede}</p>{actions && <div data-part="cta">{actions}</div>}</div>
        {facts.length > 0 && <dl data-part="facts">{facts.map((f) => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl>}
      </div>
    </section>
  );
}
