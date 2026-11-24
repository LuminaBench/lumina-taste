import { Icon } from '../../_shared/Icon';
import { cx } from '../../_shared/react';
import './integrations-grid.css';

export interface Integration { name: string; kind: string; href: string; logo?: string }

/** Integrations: one linked tile per tool, with a short "what for". Pass `logo` URLs for real marks. */
export function IntegrationsGrid({ eyebrow, title, lede, items, className }: { eyebrow?: string; title: string; lede?: string; items: Integration[]; className?: string }) {
  return (
    <section className={cx('lt-integrations-grid', className)} aria-label={title}>
      <header>{eyebrow && <p data-part="eyebrow">{eyebrow}</p>}<h2>{title}</h2>{lede && <p data-part="lede">{lede}</p>}</header>
      <ul>{items.map((it) => <li key={it.name}><a href={it.href}><span data-part="mark" aria-hidden>{it.logo ? <img src={it.logo} alt="" width={20} height={20} /> : it.name.slice(0, 2).toUpperCase()}</span><span><strong>{it.name}</strong><span>{it.kind}</span></span><Icon name="arrow-up-right" /></a></li>)}</ul>
    </section>
  );
}
