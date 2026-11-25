import type { ReactNode } from 'react';
import { cx } from '../../_shared/react';
import './stack-cards.css';

export interface StackCard { title: string; text: string; visual?: ReactNode; figure?: { value: string; label: string } }

/** Steps as large cards that pin and stack as the page scrolls. Each card: number, title, one line, and a picture. */
export function StackCards({ eyebrow, title, cards, className }: { eyebrow?: string; title: string; cards: StackCard[]; className?: string }) {
  return (
    <section className={cx('lt-stack-cards', className)} aria-label={title}>
      <header>{eyebrow && <p data-part="eyebrow">{eyebrow}</p>}<h2>{title}</h2></header>
      <ol>
        {cards.map((c, i) => (
          <li key={c.title}><article>
            <div data-part="text"><span data-part="n">{String(i + 1).padStart(2, '0')}</span><h3>{c.title}</h3><p>{c.text}</p></div>
            <div data-part="visual" aria-hidden="true">{c.visual ?? (c.figure && <div className="lt-sc-figure"><b>{c.figure.value}</b><span>{c.figure.label}</span></div>)}</div>
          </article></li>
        ))}
      </ol>
    </section>
  );
}
