import { boot } from '../_shared/boot';
import { pageStates } from '../_shared/states';
import { appShell } from '../_shared/app';
import '../../components/ui/controls/button/button.css';
import '../../components/ui/feedback/skeleton/skeleton.css';
import '../../components/ui/data/art-panel/art-panel.css';
import '../../components/ui/navigation/mobile-app-bar/mobile-app-bar.css';
import '../../components/ui/navigation/bottom-nav/bottom-nav.css';
import '../../components/ui/overlays/bottom-sheet/bottom-sheet.css';
import '../../components/ui/controls/segmented-control/segmented-control.css';
import '../../components/ui/controls/date-strip/date-strip.css';
import '../../components/ui/controls/time-slots/time-slots.css';
import '../../components/ui/controls/settings-group/settings-group.css';
import '../_shared/app.css';
import './page.css';
import { enhance as appbar } from '../../components/ui/navigation/mobile-app-bar/mobile-app-bar';
import { enhance as sheet } from '../../components/ui/overlays/bottom-sheet/bottom-sheet';
import { enhance as segmented } from '../../components/ui/controls/segmented-control/segmented-control';
import { enhance as days } from '../../components/ui/controls/date-strip/date-strip';
import { enhance as slots } from '../../components/ui/controls/time-slots/time-slots';
import { enhance as settings } from '../../components/ui/controls/settings-group/settings-group';
import { openDialog } from '../../components/ui/_shared/dom';

pageStates();
boot({ 'mobile-app-bar': appbar, 'bottom-sheet': sheet, 'segmented-control': segmented, 'date-strip': days, 'time-slots': slots, 'settings-group': settings });
const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;
const app = appShell({ home: 'bookings' });

// The four choices, and the button that says what they add up to.
const pick = { dog: 'Biscuit', service: 'Full groom', price: '£48', date: '2026-12-04', time: '10:30' };
const MINUTES: Record<string, number> = { 'Full groom': 120, 'Bath and brush': 60, 'Nails only': 15 };
const day = (iso: string, long = false) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', long ? { weekday: 'long', day: 'numeric', month: 'long' } : { weekday: 'short', day: 'numeric', month: 'short' });
const until = (t: string, mins: number) => { const [h, m] = t.split(':').map(Number); const e = h * 60 + m + mins; return `${String(Math.floor(e / 60)).padStart(2, '0')}:${String(e % 60).padStart(2, '0')}`; };
const sync = () => {
  $('#bo-sum-price').textContent = pick.price;
  $('#bo-sum-when').textContent = `${day(pick.date)}, ${pick.time}`;
  $('#bo-review [data-part="label"]').textContent = `Book ${pick.time}`;
};
$('#bo-dog').addEventListener('lt-change', (e) => { pick.dog = (e as CustomEvent<{ value: string }>).detail.value; sync(); });
$('#bo-days').addEventListener('lt-change', (e) => { pick.date = (e as CustomEvent<{ date: string }>).detail.date; sync(); });
$('#bo-slots').addEventListener('lt-change', (e) => { pick.time = (e as CustomEvent<{ time: string }>).detail.time; sync(); });
const services = $('#bo-services');
services.addEventListener('click', (e) => {
  const b = (e.target as Element).closest<HTMLButtonElement>('[role="radio"]');
  if (!b) return;
  for (const x of services.querySelectorAll<HTMLButtonElement>('[role="radio"]')) { x.setAttribute('aria-checked', String(x === b)); x.tabIndex = x === b ? 0 : -1; }
  pick.service = b.dataset.name!; pick.price = b.dataset.price!; sync();
});
services.addEventListener('keydown', (e) => {
  const list = [...services.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
  const i = list.indexOf(document.activeElement as HTMLButtonElement);
  const d = /ArrowDown|ArrowRight/.test(e.key) ? 1 : /ArrowUp|ArrowLeft/.test(e.key) ? -1 : 0;
  if (i < 0 || !d) return;
  e.preventDefault(); const n = list[(i + d + list.length) % list.length]; n.focus(); n.click();
});
sync();

// Check and book: the sheet repeats every choice once, in words, beside the one button.
const dialog = $<HTMLDialogElement>('#bo-sheet');
const opener = $('#bo-review');
opener.addEventListener('click', () => {
  $('#bo-c-when').textContent = day(pick.date, true);
  $('#bo-c-time').textContent = `${pick.time} to ${until(pick.time, MINUTES[pick.service])}`;
  $('#bo-c-what').textContent = `${pick.service} for ${pick.dog}`;
  $('#bo-c-price').textContent = `${pick.price}, paid on the day`;
  openDialog(dialog);
  $<HTMLElement>('#bo-confirm').focus();
});
dialog.addEventListener('close', () => opener.focus({ preventScroll: true }));
$('#bo-confirm').addEventListener('click', () => { dialog.close(); app.say(`Booked: ${pick.dog}, ${day(pick.date)} at ${pick.time}`); app.show('bookings', 'tab'); });
$('#bo-cancel').addEventListener('click', () => app.say('We ask once more before cancelling: nothing is cancelled yet.'));
