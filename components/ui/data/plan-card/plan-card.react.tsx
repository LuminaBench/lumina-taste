import type { ReactNode } from 'react';
import { cx } from '../../_shared/react';
import './plan-card.css';

/** Billing overview: plan and price, key facts in a list, one upgrade action. */
export function PlanCard({ plan, period, price, facts, actions, className }: { plan: string; period?: string; price: ReactNode; facts: Array<{ term: string; value: ReactNode }>; actions?: ReactNode; className?: string }) {
  return (
    <section className={cx('lt-plan', className)} aria-label={`Current plan: ${plan}`}>
      <div data-part="top"><div><p data-part="eyebrow">Current plan</p><h3>{plan} {period && <span>{period}</span>}</h3></div><p data-part="price">{price}</p></div>
      <dl>{facts.map((f) => <div key={f.term}><dt>{f.term}</dt><dd>{f.value}</dd></div>)}</dl>
      {actions && <div data-part="actions">{actions}</div>}
    </section>
  );
}
