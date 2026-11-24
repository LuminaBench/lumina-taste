import { Icon } from '../../_shared/Icon';
import type { ReactNode } from 'react';
import { cx } from '../../_shared/react';
import './faq-section.css';

/** FAQ on native <details>: works without JavaScript, searchable with find-in-page. */
export function FaqSection({ title, lede, items, className }: { title: string; lede?: ReactNode; items: Array<{ q: string; a: ReactNode }>; className?: string }) {
  return (
    <section className={cx('lt-faq-section', className)} aria-label={title}>
      <header><h2>{title}</h2>{lede && <p data-part="lede">{lede}</p>}</header>
      <div data-part="list">{items.map((it, i) => <details key={it.q} open={i === 0}><summary>{it.q}<span data-part="chev" aria-hidden><Icon name="plus" /></span></summary><p>{it.a}</p></details>)}</div>
    </section>
  );
}
