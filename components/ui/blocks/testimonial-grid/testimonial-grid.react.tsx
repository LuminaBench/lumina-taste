import { cx } from '../../_shared/react';
import './testimonial-grid.css';

export interface Quote { quote: string; name: string; role: string }

/** Three short customer quotes with name and role. Real people, short quotes, no star ratings. */
export function TestimonialGrid({ eyebrow, title, quotes, className }: { eyebrow?: string; title: string; quotes: Quote[]; className?: string }) {
  return (
    <section className={cx('lt-testimonial-grid', className)} aria-label={title}>
      <header>{eyebrow && <p data-part="eyebrow">{eyebrow}</p>}<h2>{title}</h2></header>
      <ul>{quotes.map((q) => <li key={q.name}><figure><blockquote><p>{q.quote}</p></blockquote><figcaption><span data-part="avatar" aria-hidden>{q.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span><span><strong>{q.name}</strong><span>{q.role}</span></span></figcaption></figure></li>)}</ul>
    </section>
  );
}
