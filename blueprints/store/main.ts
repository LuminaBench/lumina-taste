import { boot } from '../_shared/boot';
import { pageStates } from '../_shared/states';
import '../../components/ui/controls/button/button.css';
import '../../components/ui/controls/segmented-control/segmented-control.css';
import '../../components/ui/controls/radio-cards/radio-cards.css';
import '../../components/ui/controls/accordion/accordion.css';
import '../../components/ui/data/review-summary/review-summary.css';
import '../../components/ui/navigation/navbar-centered/navbar-centered.css';
import '../../components/ui/navigation/breadcrumbs/breadcrumbs.css';
import '../../components/ui/navigation/sticky-action-bar/sticky-action-bar.css';
import '../../components/ui/navigation/footer-minimal/footer-minimal.css';
import './page.css';
import { enhance as segmented } from '../../components/ui/controls/segmented-control/segmented-control';
import { enhance as accordion } from '../../components/ui/controls/accordion/accordion';

boot({ 'segmented-control': segmented, accordion });
pageStates();

// Gallery: thumbnails switch the main view.
const stage = document.querySelector<HTMLElement>('#sp-stage');
const labels: Record<string, string> = { bag: '1 kg bag of Huila, Colombia coffee', beans: 'Roasted beans, medium roast', cup: 'A cup of filter coffee from above', farm: 'Hillside coffee farm in Huila' };
document.querySelector('.sp-thumbs')?.addEventListener('click', (e) => {
  const b = (e.target as Element).closest<HTMLButtonElement>('button[data-shot]');
  if (!b || !stage) return;
  for (const t of document.querySelectorAll('.sp-thumbs button')) t.setAttribute('aria-pressed', String(t === b));
  stage.dataset.shot = b.dataset.shot!;
  stage.setAttribute('aria-label', labels[b.dataset.shot!]);
});

// Price follows size and plan. Every element is optional, so you can remove a control without breaking the page.
const set = (sel: string, text: string) => { const el = document.querySelector(sel); if (el) el.textContent = text; };
const gbp = (n: number) => `£${n % 1 ? n.toFixed(2) : n}`;
let grams = 1000;
const form = document.querySelector<HTMLFormElement>('#sp-form');
function price() {
  const base = grams === 1000 ? 38 : 11.5;
  const sub = Math.round(base * 0.9 * 100) / 100;
  const plan = form?.querySelector<HTMLInputElement>('input[name="plan"]:checked')?.value ?? 'once';
  const now = plan === 'sub' ? sub : base;
  set('#sp-price', gbp(base));
  set('#sp-per', `${gbp(Math.round((base / grams) * 100 * 100) / 100)} per 100 g`);
  set('#sp-once', gbp(base));
  set('#sp-sub', gbp(sub));
  set('#sp-total', gbp(now));
  set('#sp-bar-price', gbp(now));
}
document.querySelector('#sp-size')?.addEventListener('lt-change', (e) => { grams = Number((e as CustomEvent).detail?.value ?? 1000); price(); });
form?.addEventListener('change', price);
const added = () => set('#sp-msg', 'Added to your bag. Free delivery applies.');
form?.addEventListener('submit', (e) => { e.preventDefault(); added(); });
document.querySelector('#sp-bar-add')?.addEventListener('click', added);
price();
