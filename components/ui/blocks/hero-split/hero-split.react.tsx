import { cx } from '../../_shared/react';
import { Icon } from '../../_shared/Icon';
import type { ReactNode } from 'react';
import './hero-split.css';

export interface HeroSplitProps { eyebrow?: string; title: string; lede: string; primary: { label: string; href: string }; secondary?: { label: string; href: string }; notes?: string[]; visual?: ReactNode; className?: string }

/** Two-column hero: copy and one primary action on the left, the product on the right. */
export function HeroSplit({ eyebrow, title, lede, primary, secondary, notes = [], visual, className }: HeroSplitProps) {
  return (
    <section className={cx('lt-hero-split', className)} aria-label={title}>
      <div data-part="copy">
        {eyebrow && <p data-part="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        <p data-part="lede">{lede}</p>
        <div data-part="cta"><a className="lt-btn" data-variant="primary" data-size="lg" href={primary.href}>{primary.label}</a>{secondary && <a className="lt-btn" data-variant="ghost" data-size="lg" href={secondary.href}>{secondary.label} <Icon name="arrow-right" /></a>}</div>
        {notes.length > 0 && <p data-part="note">{notes.map((n) => <span key={n}><Icon name="check" /> {n} </span>)}</p>}
      </div>
      <div data-part="frame">{visual}</div>
    </section>
  );
}
