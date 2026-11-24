import { Icon } from '../../_shared/Icon';
import { cx } from '../../_shared/react';
import './pricing-tiers.css';

export interface Tier { name: string; for: string; price: string; per: string; features: string[]; cta: { label: string; href: string }; featured?: boolean; badge?: string }

/** Three pricing tiers; the middle one is featured. Only the featured tier gets the filled button. */
export function PricingTiers({ title, lede, tiers, className }: { title: string; lede?: string; tiers: Tier[]; className?: string }) {
  return (
    <section className={cx('lt-pricing-tiers', className)} aria-label={title}>
      <header><h2>{title}</h2>{lede && <p data-part="lede">{lede}</p>}</header>
      <ul data-part="tiers">
        {tiers.map((t) => (
          <li key={t.name} data-part="tier" data-featured={t.featured ? '' : undefined}>
            <div data-part="head"><h3>{t.name}</h3>{t.featured && <span data-part="badge">{t.badge ?? 'Most popular'}</span>}</div>
            <p data-part="for">{t.for}</p>
            <p data-part="price"><b>{t.price}</b><span>{t.per}</span></p>
            <a className="lt-btn" data-variant={t.featured ? 'primary' : 'secondary'} href={t.cta.href}>{t.cta.label}</a>
            <ul data-part="features">{t.features.map((f) => <li key={f}><Icon name="check" />{f}</li>)}</ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
