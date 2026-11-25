import type { ReactNode } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx } from '../../_shared/react';
import '../../data/art-panel/art-panel.css';
import './offer-cards.css';

export interface Offer { name: string; title: string; text: string; fact?: string; facts?: Array<{ label: string; value: string }>; price?: string; href: string; tone?: 'accent' | 'ink'; shot?: string; image?: ReactNode }

/** Two to four things on offer (products, services, rooms, tours), each with a picture or an art panel, facts and a price. */
export function OfferCards({ eyebrow, title, lede, offers, className }: { eyebrow?: string; title: string; lede?: string; offers: Offer[]; className?: string }) {
  return (
    <section className={cx('lt-offers', className)} aria-label={title}>
      <header>{eyebrow && <p data-part="eyebrow">{eyebrow}</p>}<h2>{title}</h2>{lede && <p data-part="lede">{lede}</p>}</header>
      <ul>
        {offers.map((o, i) => (
          <li key={o.name}><article>
            <figure className="lt-art" data-tone={o.tone} data-shot={o.shot}>{o.image}<p data-part="index">{String(i + 1).padStart(2, '0')}</p><p data-part="name">{o.name}</p>{o.fact && <p data-part="fact">{o.fact}</p>}<figcaption className="lt-visually-hidden">{o.title}</figcaption></figure>
            <h3>{o.title}</h3>
            <p>{o.text}</p>
            {o.facts && <dl>{o.facts.map((f) => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl>}
            <p data-part="foot">{o.price && <b>{o.price}</b>}<a href={o.href}>{o.name} in detail <Icon name="arrow-right" size={14} /></a></p>
          </article></li>
        ))}
      </ul>
    </section>
  );
}
