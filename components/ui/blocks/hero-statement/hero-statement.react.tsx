import type { ReactNode } from 'react';
import { cx } from '../../_shared/react';
import './hero-statement.css';

/** A type-led hero: one very large headline, then a ruled row with the pitch, the action and three facts. */
export function HeroStatement({ eyebrow, title, lede, actions, facts = [], className }: { eyebrow?: string; title: string; lede: string; actions?: ReactNode; facts?: Array<{ value: string; label: string }>; className?: string }) {
  return (
    <section className={cx('lt-hero-statement', className)} aria-label={title}>
      {eyebrow && <p data-part="eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      <div data-part="foot">
        <div data-part="pitch"><p data-part="lede">{lede}</p>{actions && <div data-part="cta">{actions}</div>}</div>
        {facts.length > 0 && <dl data-part="facts">{facts.map((f) => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl>}
      </div>
    </section>
  );
}
