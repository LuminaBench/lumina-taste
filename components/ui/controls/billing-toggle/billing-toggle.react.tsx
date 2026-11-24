import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './billing-toggle';
import './billing-toggle.css';

export interface BillingToggleProps {
  plan: string; monthly: string; yearly: string; per?: string; saveLabel?: string;
  monthlyNote?: string; yearlyNote?: string; defaultPeriod?: 'monthly' | 'yearly';
  onChange?: (period: 'monthly' | 'yearly') => void; className?: string;
}

/** Monthly/yearly switch with a sliding pill and a price that swaps in place. */
export function BillingToggle({ plan, monthly, yearly, per = 'per seat / month', saveLabel = 'Save 20%', monthlyNote = 'Billed monthly.', yearlyNote = 'Billed yearly.', defaultPeriod = 'yearly', onChange, className }: BillingToggleProps) {
  const ref = useEnhance<HTMLDivElement, { period: 'monthly' | 'yearly' }>(enhance, (d) => onChange?.(d.period));
  const y = defaultPeriod === 'yearly';
  return (
    <div ref={ref} className={cx('lt-billing', className)}>
      <div data-part="switch" role="radiogroup" aria-label="Billing period">
        <span data-part="indicator" aria-hidden />
        <button type="button" role="radio" aria-checked={!y} data-period="monthly">Monthly</button>
        <button type="button" role="radio" aria-checked={y} data-period="yearly">Yearly <span data-part="save">{saveLabel}</span></button>
      </div>
      <div data-part="plan">
        <p data-part="name">{plan}</p>
        <p data-part="price"><span data-price data-monthly={monthly} data-yearly={yearly}>{y ? yearly : monthly}</span><span data-part="per">{per}</span></p>
        <p data-part="note" data-monthly={monthlyNote} data-yearly={yearlyNote}>{y ? yearlyNote : monthlyNote}</p>
      </div>
    </div>
  );
}
