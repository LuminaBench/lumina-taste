import { useId } from 'react';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './pricing-calculator';
import './pricing-calculator.css';

/** Usage-based price estimate: two sliders, a monthly/yearly switch, total plus the sum in words. */
export function PricingCalculator({ onChange, className }: { onChange?: (t: { total: number }) => void; className?: string }) {
  const id = useId();
  const ref = useEnhance<HTMLElement, { total: number }>(enhance, (d) => onChange?.(d));
  return (
    <section ref={ref} className={cx('lt-calc', className)} aria-label="Estimate your bill">
      <h3>Estimate your bill</h3>
      <label htmlFor={`${id}-s`}><span>Seats</span><output data-part="seats-out" htmlFor={`${id}-s`} /></label>
      <input id={`${id}-s`} type="range" min={1} max={100} defaultValue={12} data-part="seats" />
      <label htmlFor={`${id}-r`}><span>Rows synced per month</span><output data-part="rows-out" htmlFor={`${id}-r`} /></label>
      <input id={`${id}-r`} type="range" min={1} max={50} defaultValue={5} data-part="rows" />
      <fieldset data-part="period"><legend className="lt-visually-hidden">Billing</legend><label><input type="radio" name={`${id}-p`} value="m" /> Monthly</label><label><input type="radio" name={`${id}-p`} value="y" defaultChecked /> Yearly <span>−20%</span></label></fieldset>
      <div data-part="result" aria-live="polite"><p><b data-part="total" /><span>per month</span></p><p data-part="breakdown" /></div>
    </section>
  );
}
