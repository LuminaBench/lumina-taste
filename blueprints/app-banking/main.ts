import { boot } from '../_shared/boot';
import { pageStates } from '../_shared/states';
import { appShell } from '../_shared/app';
import '../../components/ui/controls/button/button.css';
import '../../components/ui/feedback/skeleton/skeleton.css';
import '../../components/ui/data/art-panel/art-panel.css';
import '../../components/ui/navigation/mobile-app-bar/mobile-app-bar.css';
import '../../components/ui/navigation/bottom-nav/bottom-nav.css';
import '../../components/ui/overlays/bottom-sheet/bottom-sheet.css';
import '../../components/ui/controls/number-pad/number-pad.css';
import '../../components/ui/controls/settings-group/settings-group.css';
import '../_shared/app.css';
import './page.css';
import { enhance as appbar } from '../../components/ui/navigation/mobile-app-bar/mobile-app-bar';
import { enhance as sheet } from '../../components/ui/overlays/bottom-sheet/bottom-sheet';
import { enhance as pad, setValue } from '../../components/ui/controls/number-pad/number-pad';
import { enhance as settings } from '../../components/ui/controls/settings-group/settings-group';
import { openDialog } from '../../components/ui/_shared/dom';
import { render as bars } from '../../components/charts/bar-chart/bar-chart';

pageStates();
boot({ 'mobile-app-bar': appbar, 'bottom-sheet': sheet, 'number-pad': pad, 'settings-group': settings });
const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;
const app = appShell({ home: 'home' });

// The week of spending: one hue, the biggest day in the highlight, sized for a phone.
const days = ['Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
const spent = [21.4, 64.9, 12.0, 43.75, 8.2, 30.0, 5.95];
bars($('#bk-chart'), days.map((label, i) => ({ label, value: spent[i] })), { title: 'Saturday was your biggest day', subtitle: '£186.40 this week, by day', highlight: 'Sat', format: { prefix: '£', decimals: 0 }, axis: false, height: (w) => Math.round(Math.min(170, w * 0.4)), export: false });

// One payment: the row that was tapped fills the detail.
const PAY: Record<string, [string, string, string, string]> = {
  coffee: ['Juniper Coffee', '−£4.20', 'Today at 08:14 · Contactless', 'Eating out'], tfl: ['Halyard Buses', '−£1.75', 'Today at 07:52 · Contactless', 'Transport'],
  rent: ['Priya Shah', '+£450.00', 'Yesterday at 09:00 · Bank transfer', 'Rent share'], shop: ['Moss Market', '−£38.40', 'Yesterday at 18:40 · Chip and PIN', 'Groceries'],
  books: ['Larkspur Books', '−£12.99', 'Yesterday at 12:05 · Online', 'Shopping'], gym: ['Kestrel Climbing', '−£42.00', 'Monday at 06:00 · Direct debit', 'Health'],
};
document.addEventListener('click', (e) => {
  const row = (e.target as Element).closest<HTMLElement>('[data-pay]');
  if (!row) return;
  const [who, amount, when, cat] = PAY[row.dataset.pay!];
  $('#pay-h').textContent = who;
  $('#screen-payment [data-part="small"]').textContent = who;
  $('#bk-pay-amount').textContent = amount;
  $('#bk-pay-when').textContent = when;
  $('#bk-pay-cat').textContent = cat;
  const mark = row.querySelector('.as-mark')!.innerHTML;
  $('#screen-payment .bk-mark').innerHTML = mark;
}, true);
$('#bk-split').addEventListener('click', () => app.say('Split request sent to Priya for half'));

// Send money: who to, how much, one button that says both.
const dialog = $<HTMLDialogElement>('#bk-sheet');
const go = $<HTMLButtonElement>('#bk-send-go');
let who = 'Priya';
let amount = 0, over = false;
const label = () => { go.querySelector('[data-part="label"]')!.textContent = amount ? `Send £${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to ${who}` : `Send to ${who}`; go.disabled = !amount || over; };
$('#bk-pad').addEventListener('lt-change', (e) => { ({ value: amount, over } = (e as CustomEvent<{ value: number; over: boolean }>).detail); label(); });
const to = $('.bk-to');
to.addEventListener('click', (e) => {
  const b = (e.target as Element).closest<HTMLButtonElement>('[role="radio"]');
  if (!b) return;
  for (const x of to.querySelectorAll<HTMLButtonElement>('[role="radio"]')) { x.setAttribute('aria-checked', String(x === b)); x.tabIndex = x === b ? 0 : -1; }
  who = b.dataset.name!.split(' ')[0];
  label();
});
to.addEventListener('keydown', (e) => {
  const list = [...to.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
  const i = list.indexOf(document.activeElement as HTMLButtonElement);
  const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
  if (i < 0 || !d) return;
  e.preventDefault(); const n = list[(i + d + list.length) % list.length]; n.focus(); n.click();
});
const opener = $('#bk-send');
opener.addEventListener('click', () => { setValue($('#bk-pad'), ''); openDialog(dialog); $<HTMLElement>('#bk-pad [data-key="1"]').focus(); });
dialog.addEventListener('close', () => opener.focus({ preventScroll: true }));
go.addEventListener('click', () => { const t = go.textContent!.replace('Send ', 'Sent '); dialog.close(); app.say(t); });

// The card: freezing it frosts it over at once; nothing to save.
$<HTMLInputElement>('#bk-freeze').addEventListener('change', (e) => {
  const on = (e.target as HTMLInputElement).checked;
  $('#bk-card').toggleAttribute('data-frozen', on);
  app.say(on ? 'Card frozen. Turn it back on any time.' : 'Card on again.');
});
$('#bk-cancel').addEventListener('click', () => app.say('We will ask you to confirm before anything is cancelled.'));
