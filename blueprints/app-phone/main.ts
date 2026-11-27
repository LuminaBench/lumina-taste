import { boot } from '../_shared/boot';
import { pageStates } from '../_shared/states';
import '../../components/ui/controls/button/button.css';
import '../../components/ui/controls/segmented-control/segmented-control.css';
import '../../components/ui/controls/number-stepper/number-stepper.css';
import '../../components/ui/controls/toggle-switch/toggle-switch.css';
import '../../components/ui/feedback/badge/badge.css';
import '../../components/ui/feedback/skeleton/skeleton.css';
import '../../components/ui/feedback/empty-state/empty-state.css';
import '../../components/ui/feedback/pull-refresh/pull-refresh.css';
import '../../components/ui/navigation/mobile-app-bar/mobile-app-bar.css';
import '../../components/ui/navigation/bottom-nav/bottom-nav.css';
import '../../components/ui/navigation/swipe-row/swipe-row.css';
import '../../components/ui/overlays/bottom-sheet/bottom-sheet.css';
import './page.css';
import { enhance as appbar } from '../../components/ui/navigation/mobile-app-bar/mobile-app-bar';
import { enhance as bottomNav } from '../../components/ui/navigation/bottom-nav/bottom-nav';
import { enhance as swipeRow, removeRow } from '../../components/ui/navigation/swipe-row/swipe-row';
import { enhance as pull, type RefreshDetail } from '../../components/ui/feedback/pull-refresh/pull-refresh';
import { enhance as sheet } from '../../components/ui/overlays/bottom-sheet/bottom-sheet';
import { enhance as segmented } from '../../components/ui/controls/segmented-control/segmented-control';
import { enhance as stepper } from '../../components/ui/controls/number-stepper/number-stepper';
import { openDialog, reducedMotion } from '../../components/ui/_shared/dom';

pageStates();

const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];
const html = document.documentElement;
const rail = $('#ap-rail')!;
const frames = $$('.ap-frame');
const order = frames.map((f) => f.dataset.screen!);
const toast = $('#ap-toast')!;
const phone = matchMedia('(max-width: 599px)');
// A tablet, or a foldable open across two screens: the page is the app, with a sidebar and two panes (page.css).
const tablet = matchMedia('(min-width: 768px) and (max-width: 1180px), (horizontal-viewport-segments: 2)');
const board = () => !phone.matches && !tablet.matches;
const side = $('#ap-side')!;

// On a desktop each screen is a phone of its own, so overlays (the tickets sheet) open inside that phone.
// On a phone or a tablet the page is the app: overlays over the whole screen (a popover on a tablet).
const syncMode = () => {
  for (const d of $$('.ap-device')) d.toggleAttribute('data-contained', board());
  // The rail scrolls (and takes focus) only on a desktop, where it holds every screen.
  if (board()) rail.tabIndex = 0; else rail.removeAttribute('tabindex');
};
syncMode();

boot({ 'mobile-app-bar': appbar, 'bottom-nav': bottomNav, 'swipe-row': swipeRow, 'pull-refresh': pull, 'bottom-sheet': sheet, 'segmented-control': segmented, 'number-stepper': stepper });

let toastTimer = 0;
const say = (text: string) => { toast.textContent = text; clearTimeout(toastTimer); toastTimer = window.setTimeout(() => { toast.textContent = ''; }, 3200); };

// ------------------------------------------------------------------ navigation between screens
const frameOf = (id: string) => frames.find((f) => f.dataset.screen === id);
// ?screen=home opens a screen directly. The loading, empty and error states belong to Today, so ?state= opens it.
let current = (() => {
  const params = new URLSearchParams(location.search);
  const q = params.get('screen') ?? '';
  if (order.includes(q)) return q;
  return params.get('state') && params.get('state') !== 'ready' ? 'home' : 'start';
})();
// The sidebar's tab for each screen: a pushed screen (a sailing, pay) belongs to Today.
const TAB: Record<string, string> = { home: 'home', sailing: 'home', pay: 'home', tickets: 'tickets', settings: 'settings' };
const mark = (id: string) => {
  for (const f of frames) f.toggleAttribute('data-current', f.dataset.screen === id);
  rail.dataset.current = id;
  for (const a of $$('a[data-tab]', side)) { if (a.dataset.tab === TAB[id]) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }
};
mark(current);

// What opened each pushed screen: going back puts focus on it again, not on the title of the list.
const openers = new Map<string, HTMLElement>();
function show(id: string, dir: 'forward' | 'back' | 'tab' = 'forward', from: HTMLElement | null = null) {
  const frame = frameOf(id);
  if (!frame) return;
  if (dir === 'forward') { const f = from ?? (document.activeElement as HTMLElement | null); if (f && f !== document.body) openers.set(current, f); }
  const back = dir === 'back' ? openers.get(id) : undefined;
  openers.delete(id);
  const heading = back && back.isConnected && frame.contains(back) ? back : $<HTMLElement>('h2[tabindex="-1"]', frame);
  current = id;
  if (tablet.matches) {
    // Two panes: the list stays, the detail pane changes. No slide: the eye stays where it was.
    mark(id);
    heading?.focus({ preventScroll: true });
  } else if (phone.matches) {
    const swap = () => { mark(id); frame.querySelector('.ap-scroll')?.scrollTo(0, 0); heading?.focus({ preventScroll: true }); };
    const vt = (document as Document & { startViewTransition?: (cb: () => void) => unknown }).startViewTransition;
    if (vt && !reducedMotion()) {
      html.dataset.nav = dir;
      (vt.call(document, swap) as { finished?: Promise<void> })?.finished?.catch(() => {}).finally(() => { if (html.dataset.nav === dir) delete html.dataset.nav; });
    } else swap();
  } else {
    mark(id);
    slideTo(frame, !reducedMotion());
    heading?.focus({ preventScroll: true });
  }
}

document.addEventListener('click', (e) => {
  const t = e.target as Element;
  // Tab bars: every screen has its own, already marked, so the bar never needs to move its pill.
  const tab = t.closest<HTMLAnchorElement>('.ap-tabs a, .ap-side a');
  if (tab) {
    e.preventDefault(); e.stopPropagation();
    const id = tab.getAttribute('href')!.replace('#screen-', '');
    if (id === current && phone.matches) frameOf(id)?.querySelector('.ap-scroll')?.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
    else show(id, 'tab');
  }
}, true);
// Links and buttons that open another screen. Bubble phase, so a swipe or a pull that ended on a row wins.
document.addEventListener('click', (e) => {
  const go = (e.target as Element).closest<HTMLElement>('[data-go]');
  if (!go || e.defaultPrevented) return;
  e.preventDefault();
  if (go.dataset.harbour) setHarbour(go.dataset.harbour);
  show(go.dataset.go!, (go.dataset.dir as 'back') ?? 'forward', go);
});

const step = (by: number) => { const i = order.indexOf(current); show(order[Math.max(0, Math.min(order.length - 1, i + by))], by < 0 ? 'back' : 'forward'); };
$('#ap-prev')!.addEventListener('click', () => step(-1));
$('#ap-next')!.addEventListener('click', () => step(1));
for (const mq of [phone, tablet]) mq.addEventListener('change', () => { syncMode(); mark(current); });
if (current !== 'start' && board()) requestAnimationFrame(() => { const f = frameOf(current); if (f) slideTo(f, false); });

// ------------------------------------------------------------------ harbour, destination, refresh
const harbours: Record<string, string[]> = { Ardmore: ['Kestrel Isle', 'Larkspur Bay'], 'Kestrel Isle': ['Ardmore'], 'Larkspur Bay': ['Ardmore'] };
function setHarbour(name: string) {
  $('#ap-harbour')!.textContent = name;
  $('#ap-harbour')!.setAttribute('aria-label', `Change harbour, now ${name}`);
  $('#ap-home-value')!.textContent = name;
  $('#ap-side-harbour')!.textContent = name;
  const dests = harbours[name] ?? [];
  const seg = $('#ap-dest')!;
  const buttons = $$('[role="radio"]', seg);
  buttons[0].textContent = dests[0];
  buttons[1].hidden = dests.length < 2;
  seg.dataset.single = String(dests.length < 2);
  $('#ap-next-route')!.textContent = `${name} to ${dests[0]}`;
}
$('#ap-dest')!.addEventListener('lt-change', (e) => {
  const v = (e as CustomEvent<{ value: string }>).detail.value;
  for (const row of $$('#ap-later [data-part="row"]')) row.hidden = row.dataset.dest !== v;
  const kestrel = v === 'kestrel';
  $('#ap-next-time')!.textContent = kestrel ? '08:40' : '10:15';
  $('#ap-mins')!.textContent = kestrel ? '24' : '119';
  $('#ap-next-route')!.textContent = `Ardmore to ${kestrel ? 'Kestrel Isle' : 'Larkspur Bay'}`;
});
$('#ap-pull')!.addEventListener('lt-refresh', (e) => {
  const ev = e as CustomEvent<RefreshDetail>;
  ev.preventDefault();
  window.setTimeout(() => ev.detail.done('Updated 09:41'), 700);
});

// ------------------------------------------------------------------ swipe actions
$('#ap-later')!.addEventListener('lt-change', (e) => {
  const { action, id } = (e as CustomEvent<{ action: string; id: string }>).detail;
  const time = `${id.slice(0, 2)}:${id.slice(2)}`;
  if (action === 'remind') say(`We will remind you 30 minutes before the ${time}`);
  else { navigator.clipboard?.writeText(`${location.origin}${location.pathname}#screen-sailing`).catch(() => {}); say(`Link to the ${time} copied`); }
});
$('#ap-trips')!.addEventListener('lt-change', (e) => {
  const { action, id } = (e as CustomEvent<{ action: string; id: string }>).detail;
  if (action === 'remove') { const row = $(`#ap-trips [data-id="${id}"]`); if (row) removeRow(row); say('Trip removed from this phone'); }
  else say('Receipt sent to rowan@post.example');
});

// ------------------------------------------------------------------ tickets sheet and checkout
const dialog = $<HTMLDialogElement>('#ap-sheet')!;
const gbp = (v: number) => `£${v.toFixed(2)}`;
const state = { adults: 2, children: 0, vehicle: 13.5, dog: false, bike: false };
const total = () => state.adults * 12.5 + state.children * 6.25 + state.vehicle + (state.dog ? 3 : 0) + (state.bike ? 2 : 0);
function sync() {
  const t = gbp(total());
  for (const id of ['#ap-sheet-total', '#ap-pay-total', '#ap-pay-label', '#ap-pay-total-row']) $(id)!.textContent = t;
  const lines: Array<[string, number]> = [];
  if (state.adults) lines.push([`${state.adults} adult${state.adults > 1 ? 's' : ''}`, state.adults * 12.5]);
  if (state.children) lines.push([`${state.children} under 16`, state.children * 6.25]);
  if (state.vehicle) lines.push([state.vehicle > 20 ? 'Van, up to 7 m' : 'Car, up to 5 m', state.vehicle]);
  if (state.dog) lines.push(['Dog', 3]);
  if (state.bike) lines.push(['Bicycle', 2]);
  $('#ap-lines')!.innerHTML = lines.map(([l, v]) => `<tr><th scope="row">${l}</th><td>${gbp(v)}</td></tr>`).join('');
  const who = [state.adults && `${state.adults} adult${state.adults > 1 ? 's' : ''}`, state.children && `${state.children} under 16`, state.vehicle && (state.vehicle > 20 ? 'van' : 'car')].filter(Boolean).join(' · ');
  $('#ap-ticket-who')!.textContent = who || 'No passengers';
  $<HTMLButtonElement>('#ap-to-pay')!.disabled = !state.adults && !state.children;
}
$('#ap-adults')!.closest('.lt-stepper')!.addEventListener('lt-change', (e) => { state.adults = (e as CustomEvent<{ value: number }>).detail.value; sync(); });
$('#ap-children')!.closest('.lt-stepper')!.addEventListener('lt-change', (e) => { state.children = (e as CustomEvent<{ value: number }>).detail.value; sync(); });
$('#ap-vehicle')!.addEventListener('lt-change', (e) => { state.vehicle = +(e as CustomEvent<{ value: string }>).detail.value; sync(); });
for (const id of ['ap-dog', 'ap-bike']) $<HTMLInputElement>(`#${id}`)!.addEventListener('change', (e) => { state[id === 'ap-dog' ? 'dog' : 'bike'] = (e.target as HTMLInputElement).checked; sync(); });
dialog.closest('[data-lt="bottom-sheet"]')!.addEventListener('lt-change', (e) => {
  const d = (e as CustomEvent<{ detent?: string }>).detail;
  if (d.detent) $('[data-hint]', dialog)!.hidden = d.detent === 'large';
});
const opener = $('#ap-choose')!;
// Focus goes to the grabber (a phone's sheet) or, on a tablet where the sheet is a popover without one, its first field.
opener.addEventListener('click', () => {
  openDialog(dialog);
  const grab = $<HTMLElement>('[data-part="grab"]', dialog);
  (grab && grab.offsetParent ? grab : $<HTMLElement>('input', dialog))?.focus();
});
dialog.addEventListener('close', () => opener.focus({ preventScroll: true }));
$('#ap-to-pay')!.addEventListener('click', () => { dialog.close(); show('pay'); });
$('#ap-pay')!.addEventListener('click', () => {
  $('#ap-ticket-state')!.textContent = 'Paid';
  say(`Paid ${gbp(total())}. Your ticket is in Tickets.`);
  show('tickets');
});
sync();

// ------------------------------------------------------------------ settings that act at once
$('#ap-appearance')!.addEventListener('lt-change', (e) => {
  const v = (e as CustomEvent<{ value: string }>).detail.value;
  html.dataset.mode = v === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : v;
});
$<HTMLInputElement>('#ap-remind')!.addEventListener('change', (e) => { $('#ap-remind-when')!.hidden = !(e.target as HTMLInputElement).checked; });
$('#ap-signout')!.addEventListener('click', () => say('Signed out. Your tickets stay on this phone.'));

// Slide the row of screens sideways to a screen. Only the row scrolls: the page itself stays where it is, so the arrow
// just pressed does not move (scrollIntoView would also nudge the page to bring the whole phone into view).
function slideTo(frame: HTMLElement, smooth: boolean) {
  let row = frame.parentElement;
  while (row && !/(auto|scroll)/.test(getComputedStyle(row).overflowX)) row = row.parentElement;
  if (!row) return;
  const pad = parseFloat(getComputedStyle(row).scrollPaddingInlineStart) || 0;
  row.scrollTo({ left: row.scrollLeft + frame.getBoundingClientRect().left - row.getBoundingClientRect().left - pad, behavior: smooth ? 'smooth' : 'auto' });
}
