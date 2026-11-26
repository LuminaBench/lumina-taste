import type { ReactNode } from 'react';
import { cx } from '../../_shared/react';
import './product-reveal.css';

/** One scroll moment: the product opens up from lying back and settles full size as it reaches the screen. */
export function ProductReveal({ title, lede, product, caption, facts = [], className }: { title: string; lede?: string; product: ReactNode; caption?: string; facts?: Array<{ value: string; label: string }>; className?: string }) {
  return (
    <section className={cx('lt-product-reveal', className)} aria-label={title}>
      <header><h2>{title}</h2>{lede && <p data-part="lede">{lede}</p>}</header>
      <figure data-part="product" data-zoom="open">{product}{caption && <figcaption className="lt-visually-hidden">{caption}</figcaption>}</figure>
      {facts.length > 0 && <dl data-part="facts">{facts.map((f) => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl>}
    </section>
  );
}
