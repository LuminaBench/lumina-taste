import { boot } from '../_shared/boot';
import '../../components/ui/controls/button/button.css';
import '../../components/ui/controls/segmented-control/segmented-control.css';
import '../../components/ui/controls/accordion/accordion.css';
import '../../components/ui/data/comparison-table/comparison-table.css';
import '../../components/ui/feedback/badge/badge.css';
import '../../components/ui/navigation/footer-minimal/footer-minimal.css';
import './page.css';
import { enhance as segmented } from '../../components/ui/controls/segmented-control/segmented-control';
import { enhance as accordion } from '../../components/ui/controls/accordion/accordion';
import { reducedMotion } from '../../components/ui/_shared/dom';

boot({ 'segmented-control': segmented, accordion });

// Prices count to their new value; width is reserved by tabular-nums + min-width, so cards never jump.
const animate = (el: HTMLElement, to: number) => {
  const from = +(el.textContent ?? '0').replace(/\D/g, '');
  if (reducedMotion() || from === to) { el.textContent = `£${to}`; return; }
  const t0 = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - t0) / 260);
    el.textContent = `£${Math.round(from + (to - from) * (1 - (1 - t) ** 3))}`;
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};
document.getElementById('billing')!.addEventListener('lt-change', (e) => {
  const period = (e as CustomEvent).detail.value as 'monthly' | 'annual';
  document.querySelectorAll<HTMLElement>('.pr-price data').forEach((d) => animate(d, +d.dataset[period]!));
  document.getElementById('billnote')!.textContent = period === 'annual' ? 'Billed annually. Switch to monthly any time.' : 'Billed monthly. Save 20% with annual billing.';
});
