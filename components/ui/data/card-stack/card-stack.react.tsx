import type { CSSProperties, ReactNode } from 'react';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './card-stack';
import './card-stack.css';

/** Sticky stacking cards. Place inside the page scroll, or in a container with data-part="scroller". */
export function CardStack({ cards, className }: { cards: Array<{ eyebrow?: string; title: string; body: ReactNode }>; className?: string }) {
  const ref = useEnhance<HTMLOListElement>(enhance, undefined, [cards.length]);
  return (
    <ol ref={ref} className={cx('lt-card-stack', className)}>
      {cards.map((c, i) => <li key={i} style={{ '--i': i } as CSSProperties}>{c.eyebrow && <span className="lt-eyebrow">{c.eyebrow}</span>}<h3>{c.title}</h3><p>{c.body}</p></li>)}
    </ol>
  );
}
