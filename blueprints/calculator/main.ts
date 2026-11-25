import { boot } from '../_shared/boot';
import '../../components/ui/controls/button/button.css';
import '../../components/ui/navigation/navbar-simple/navbar-simple.css';
import '../../components/ui/controls/amount-input/amount-input.css';
import '../../components/ui/controls/range-slider/range-slider.css';
import '../../components/ui/controls/segmented-control/segmented-control.css';
import '../../components/ui/blocks/faq-section/faq-section.css';
import '../../components/ui/navigation/footer-minimal/footer-minimal.css';
import './page.css';
import { enhance as navbar } from '../../components/ui/navigation/navbar-simple/navbar-simple';
import { enhance as amount } from '../../components/ui/controls/amount-input/amount-input';
import { enhance as range } from '../../components/ui/controls/range-slider/range-slider';
import { enhance as segmented } from '../../components/ui/controls/segmented-control/segmented-control';
import { render as stackedArea } from '../../components/charts/stacked-area-chart/stacked-area-chart';

boot({ 'navbar-simple': navbar, 'amount-input': amount, 'range-slider': range, 'segmented-control': segmented });

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel);
const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
const num = (sel: string) => parseFloat(($<HTMLInputElement>(sel)?.value ?? '').replace(/[^\d.]/g, '')) || 0;
let kind = 'repayment';

// The whole calculation: a standard repayment schedule, or interest only. Swap this for your own rules.
function schedule(loan: number, years: number, rate: number, interestOnly: boolean) {
  const m = rate / 100 / 12, n = years * 12;
  const monthly = interestOnly ? loan * m : m === 0 ? loan / n : (loan * m) / (1 - (1 + m) ** -n);
  const interest: number[] = [], capital: number[] = [];
  let balance = loan;
  for (let y = 0; y < years; y++) {
    let i = 0, c = 0;
    for (let k = 0; k < 12; k++) { const due = balance * m; i += due; const pay = interestOnly ? 0 : monthly - due; c += pay; balance -= pay; }
    interest.push(Math.round(i)); capital.push(Math.round(c));
  }
  return { monthly, interest, capital, totalInterest: interest.reduce((a, b) => a + b, 0) };
}

const chartHost = $('#ca-chart')!;
const shape = (s: ReturnType<typeof schedule>) => ({ x: s.interest.map((_, i) => `Year ${i + 1}`), series: [{ name: 'Capital repaid', values: s.capital }, { name: 'Interest', values: s.interest }] });
let chart: ReturnType<typeof stackedArea> | null = null;

function update() {
  const price = num('#ca-price-in'), deposit = Math.min(num('#ca-deposit-in'), price);
  const years = num('#ca-term-in'), rate = num('#ca-rate-in');
  const loan = Math.max(0, price - deposit);
  const s = schedule(loan, years, rate, kind === 'interest');
  const set = (sel: string, text: string) => { const el = $(sel); if (el && el.textContent !== text) el.textContent = text; };
  set('#ca-monthly', money.format(Math.round(s.monthly)));
  set('#ca-loan', money.format(loan));
  set('#ca-ltv', price ? `${Math.round((loan / price) * 100)}%` : '–');
  set('#ca-interest', money.format(s.totalInterest));
  set('#ca-total', money.format(Math.round(loan + s.totalInterest)));
  set('#ca-summary', `On a ${money.format(loan)} loan over ${years} years at ${rate.toFixed(2)}%${kind === 'interest' ? ', paying interest only. The loan itself is still owed at the end.' : '.'}`);
  set('#ca-deposit-hint', price ? `${Math.round((deposit / price) * 100)}% of the price.` : 'Enter a price first.');
  const data = shape(s);
  if (chart && data.x.length === chartLen) chart.update(data);
  else { chart?.destroy(); chart = stackedArea(chartHost, data, { title: 'Interest and capital paid each year', subtitle: 'Pounds a year', format: { prefix: '£', compact: true }, export: false, smooth: false }); chartLen = data.x.length; }
}
let chartLen = 0;

// Sliders update while they move; money fields when you leave them or press Enter.
for (const id of ['#ca-term-in', '#ca-rate-in']) $(id)?.addEventListener('input', update);
for (const id of ['#ca-price', '#ca-deposit']) $(id)?.addEventListener('lt-change', update);
$('#ca-kind')?.addEventListener('lt-change', (e) => { kind = String((e as CustomEvent).detail?.value ?? 'repayment'); update(); });
$('#ca-form')?.addEventListener('submit', (e) => e.preventDefault());
update();
