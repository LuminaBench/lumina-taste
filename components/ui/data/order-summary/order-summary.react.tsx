import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './order-summary';
import './order-summary.css';

export interface LineItem { name: string; detail?: string; amount: number }

/** Checkout summary with promo code, VAT and total. Swap the promo rule for your API call. */
export function OrderSummary({ items, cta = 'Continue to payment', onChange, className }: { items: LineItem[]; cta?: string; onChange?: (t: { total: number }) => void; className?: string }) {
  const ref = useEnhance<HTMLElement, { total: number }>(enhance, (d) => onChange?.(d));
  const fmt = (n: number) => `£${n.toFixed(2)}`;
  const sub = items.reduce((a, i) => a + i.amount, 0);
  return (
    <section ref={ref} className={cx('lt-order', className)} aria-label="Order summary">
      <h3>Order summary</h3>
      <ul>{items.map((i) => <li key={i.name}><span><strong>{i.name}</strong>{i.detail && <span>{i.detail}</span>}</span><data value={i.amount}>{fmt(i.amount)}</data></li>)}</ul>
      <form data-part="promo"><input aria-label="Promo code" placeholder="Promo code" autoComplete="off" /><button type="submit" className="lt-btn" data-variant="secondary" data-size="sm">Apply</button></form>
      <p data-part="promo-msg" aria-live="polite" />
      <dl>
        <div><dt>Subtotal</dt><dd data-part="subtotal">{fmt(sub)}</dd></div>
        <div data-part="discount-row" hidden><dt>Discount</dt><dd data-part="discount" /></div>
        <div><dt>VAT (20%)</dt><dd data-part="vat">{fmt(sub * 0.2)}</dd></div>
        <div data-part="total-row"><dt>Total</dt><dd data-part="total">{fmt(sub * 1.2)}</dd></div>
      </dl>
      <button type="button" className="lt-btn" data-variant="primary" data-size="lg">{cta}</button>
    </section>
  );
}
