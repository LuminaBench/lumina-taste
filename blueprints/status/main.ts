import { boot } from '../_shared/boot';
import { pageStates } from '../_shared/states';
import '../../components/ui/controls/button/button.css';
import '../../components/ui/data/uptime-bars/uptime-bars.css';
import '../../components/ui/data/timeline/timeline.css';
import '../../components/ui/feedback/callout/callout.css';
import '../../components/ui/navigation/footer-minimal/footer-minimal.css';
import './page.css';

boot({});
pageStates();

// 90 daily bars per service from a short list of bad days ("34:down,62:warn").
const label = { ok: 'working', warn: 'degraded', down: 'outage' } as const;
const today = new Date('2026-11-24T12:00:00Z');
for (const ol of document.querySelectorAll<HTMLOListElement>('ol[data-days]')) {
  const bad = new Map((ol.dataset.days ?? '').split(',').filter(Boolean).map((p) => p.split(':') as [string, 'warn' | 'down']).map(([d, s]) => [Number(d), s]));
  ol.innerHTML = Array.from({ length: 90 }, (_, i) => {
    const s = bad.get(i) ?? 'ok';
    const d = new Date(today.getTime() - (89 - i) * 864e5).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
    return `<li data-s="${s}"><span class="lt-visually-hidden">${d}: ${label[s]}</span></li>`;
  }).join('');
}

const form = document.querySelector<HTMLFormElement>('.sp-form')!;
const email = form.querySelector('input')!;
const msg = form.querySelector('.sp-msg')!;
form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!email.value.trim() || !email.checkValidity()) { msg.textContent = 'Enter a full email address, for example name@company.com.'; email.focus(); return; }
  msg.textContent = `Subscribed. Confirm from the email we just sent to ${email.value.trim()}.`;
  form.reset();
});
