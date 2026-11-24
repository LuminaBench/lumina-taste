import { boot } from '../_shared/boot';
import { pageStates } from '../_shared/states';
import '../../components/ui/controls/button/button.css';
import '../../components/ui/controls/text-field/text-field.css';
import '../../components/ui/controls/radio-cards/radio-cards.css';
import '../../components/ui/data/order-summary/order-summary.css';
import '../../components/ui/feedback/callout/callout.css';
import './page.css';
import { enhance as textField } from '../../components/ui/controls/text-field/text-field';
import { enhance as orderSummary } from '../../components/ui/data/order-summary/order-summary';

boot({ 'text-field': textField, 'order-summary': orderSummary });
pageStates();

// Delivery choice updates the summary and the Pay button, so the price people agree to is the one they see.
const gbp = (n: number) => `£${n.toFixed(2)}`;
const form = document.querySelector<HTMLFormElement>('#co-form')!;
const totalEl = document.querySelector<HTMLElement>('#co-total')!;
const shipEl = document.querySelector<HTMLElement>('#co-ship-cost')!;
const payEl = document.querySelector<HTMLElement>('#co-pay-total')!;
const subtotal = () => Number(document.querySelector('[data-part="subtotal"]')!.textContent!.replace(/[^\d.]/g, ''));
const discount = () => Number(document.querySelector('[data-part="discount"]')!.textContent!.replace(/[^\d.]/g, '')) || 0;
function sync() {
  const ship = Number(form.querySelector<HTMLInputElement>('input[name="ship"]:checked')!.value);
  shipEl.textContent = ship ? gbp(ship) : 'Free';
  const total = subtotal() - discount() + ship;
  totalEl.textContent = gbp(total);
  payEl.textContent = gbp(total);
}
form.addEventListener('change', sync);
document.querySelector('[data-lt="order-summary"]')!.addEventListener('lt-change', () => queueMicrotask(sync));
// Card number in groups of four as people type.
const card = document.querySelector<HTMLInputElement>('[data-card]')!;
card.addEventListener('input', () => { const d = card.value.replace(/\D/g, '').slice(0, 19); card.value = d.replace(/(.{4})(?=.)/g, '$1 '); });
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const bad = [...form.querySelectorAll<HTMLInputElement>('input[required]')].find((i) => !i.value.trim() || !i.checkValidity());
  if (bad) { bad.focus(); bad.dispatchEvent(new Event('blur')); return; }
  document.documentElement.dataset.pageState = 'processing';
});
sync();
