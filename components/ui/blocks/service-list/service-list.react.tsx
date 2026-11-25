import { Icon } from '../../_shared/Icon';
import { cx } from '../../_shared/react';
import './service-list.css';

export interface Service { title: string; text: string; when?: string; meta?: string; price?: string; href?: string }

/** Things on offer as ruled rows: a name, one sentence, how long it takes and the price, each in its own column down the list. */
export function ServiceList({ eyebrow, title, lede, services, note, className }: { eyebrow?: string; title: string; lede?: string; services: Service[]; note?: string; className?: string }) {
  return (
    <section className={cx('lt-services', className)} aria-label={title}>
      <header>{eyebrow && <p data-part="eyebrow">{eyebrow}</p>}<h2>{title}</h2>{lede && <p data-part="lede">{lede}</p>}</header>
      <ul>
        {services.map((s) => {
          const row = <>{s.when && <time data-part="when">{s.when}</time>}<h3>{s.title}</h3><p>{s.text}</p>{s.meta && <span data-part="meta">{s.meta}</span>}{s.price && <b data-part="price">{s.price}</b>}{s.href && <Icon name="arrow-right" size={16} />}</>;
          return <li key={s.title}>{s.href ? <a href={s.href}>{row}</a> : <div>{row}</div>}</li>;
        })}
      </ul>
      {note && <p data-part="note">{note}</p>}
    </section>
  );
}
