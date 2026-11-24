import { combine, emit, on, part, type Cleanup } from '../../_shared/dom';

const gbp = (n: number) => `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Order summary: line items, a promo code that recalculates VAT and total, one primary action. */
export function enhance(root: HTMLElement): Cleanup {
  const form = part<HTMLFormElement>(root, 'promo')!;
  const input = form.querySelector('input')!;
  const msg = part(root, 'promo-msg')!;
  const subtotal = [...root.querySelectorAll('li data')].reduce((a, d) => a + parseFloat((d as HTMLDataElement).value), 0);
  const render = (discount: number) => {
    const net = subtotal - discount, vat = net * 0.2;
    part(root, 'subtotal')!.textContent = gbp(subtotal);
    part(root, 'discount-row')!.hidden = discount === 0;
    part(root, 'discount')!.textContent = `−${gbp(discount)}`;
    part(root, 'vat')!.textContent = gbp(vat);
    part(root, 'total')!.textContent = gbp(net + vat);
    emit(root, { subtotal, discount, vat, total: net + vat });
  };
  return combine(on(form, 'submit', (e) => {
    e.preventDefault();
    const code = input.value.trim().toUpperCase();
    if (code === 'TEAM10') { msg.setAttribute('data-ok', ''); msg.textContent = 'TEAM10 applied: 10% off.'; render(subtotal * 0.1); }
    else { msg.removeAttribute('data-ok'); msg.textContent = code ? `${code} is not a valid code.` : 'Enter a code first.'; render(0); }
  }));
}
