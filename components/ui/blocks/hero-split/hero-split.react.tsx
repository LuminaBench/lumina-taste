import { cx } from '../../_shared/react';
import { Icon } from '../../_shared/Icon';
import type { ReactNode } from 'react';
import './hero-split.css';

/** The first screen's composition. Leave it out only when nothing else fits: the plain split is the kit's habit. */
export type HeroSplitVariant = 'overlap' | 'edge' | 'product' | 'bleed';

export interface HeroSplitProps {
  eyebrow?: string; title: string; lede: string; primary: { label: string; href: string };
  /** At most one quiet link beside the action. */
  secondary?: { label: string; href: string };
  /** A reassurance line under the action. Off by default: opt in only when it removes a real worry. */
  notes?: string[];
  /** A photograph, an art panel (or scene) or a device frame. With a variant it fills the composition's frame. */
  visual?: ReactNode; variant?: HeroSplitVariant;
  /** bleed: the side of the photograph the words sit on. */
  calm?: 'start' | 'end' | 'bottom' | 'top';
  /** bleed: light words over a dark scrim (the palette's own dark tokens). */
  dark?: boolean; className?: string;
}

/** The first screen: words and one primary action beside (or over, or under) one picture. */
export function HeroSplit({ eyebrow, title, lede, primary, secondary, notes = [], visual, variant, calm, dark, className }: HeroSplitProps) {
  return (
    <section className={cx('lt-hero-split', className)} aria-label={title} data-variant={variant} data-calm={variant === 'bleed' ? calm ?? 'start' : undefined} data-tone={dark ? 'dark' : undefined}>
      <div data-part="copy">
        {eyebrow && <p data-part="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        <p data-part="lede">{lede}</p>
        <div data-part="cta"><a className="lt-btn" data-variant="primary" data-size="lg" href={primary.href}>{primary.label}</a>{secondary && <a className="lt-btn" data-variant="ghost" data-size="lg" href={secondary.href}>{secondary.label} <Icon name="arrow-right" /></a>}</div>
        {notes.length > 0 && <p data-part="note">{notes.map((n) => <span key={n}><Icon name="check" /> {n} </span>)}</p>}
      </div>
      {variant ? <div data-part="visual">{visual}</div> : <div data-part="frame">{visual}</div>}
    </section>
  );
}
