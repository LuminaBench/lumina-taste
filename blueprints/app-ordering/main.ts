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
import '../../components/ui/controls/radio-group/radio-group.css';
import '../../components/ui/controls/toggle-switch/toggle-switch.css';
import '../../components/ui/controls/settings-group/settings-group.css';
import '../_shared/app.css';
import './page.css';
import { enhance as appbar } from '../../components/ui/navigation/mobile-app-bar/mobile-app-bar';
import { enhance as sheet } from '../../components/ui/overlays/bottom-sheet/bottom-sheet';
import { enhance as segmented } from '../../components/ui/controls/segmented-control/segmented-control';
import { enhance as settings } from '../../components/ui/controls/settings-group/settings-group';
import { openDialog, reducedMotion } from '../../components/ui/_shared/dom';

pageStates();
boot({ 'mobile-app-bar': appbar, 'bottom-sheet': sheet, 'segmented-control': segmented, 'settings-group': settings });
const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s)!;
const $$ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];
const gbp = (v: number) => `£${v.toFixed(2)}`;

// ------------------------------------------------------------------ the menu and the basket
type Kind = 'coffee' | 'bakery' | 'lunch';
const ITEMS: Record<string, { name: string; note: string; price: number; kind: Kind }> = {
  flat: { name: 'Flat white', note: 'Double shot, a little steamed milk', price: 3.2, kind: 'coffee' },
  filter: { name: 'Filter of the day', note: 'A light roast, brewed by the cup', price: 2.8, kind: 'coffee' },
  choc: { name: 'Hot chocolate', note: 'Dark chocolate melted into milk', price: 3.4, kind: 'coffee' },
  bun: { name: 'Cardamom bun', note: 'Baked here at 6 this morning', price: 2.9, kind: 'bakery' },
  toast: { name: 'Sourdough toast', note: 'Two slices, butter and marmalade', price: 3.8, kind: 'bakery' },
  soup: { name: 'Soup of the day', note: 'Roast squash and ginger, with bread', price: 5.6, kind: 'lunch' },
  grain: { name: 'Grain bowl', note: 'Lentils, greens, tahini and pickles', price: 7.2, kind: 'lunch' },
};
interface Line { id: string; item: string; opts: string; unit: number; qty: number }
const lines: Line[] = [
  { id: 'l1', item: 'flat', opts: 'Regular · oat milk', unit: 3.5, qty: 1 },
  { id: 'l2', item: 'bun', opts: 'Warmed', unit: 2.9, qty: 1 },
];
let nextId = 3;
const total = () => lines.reduce((t, l) => t + l.unit * l.qty, 0);
const count = () => lines.reduce((t, l) => t + l.qty, 0);
const ICON = (d: string) => `<svg class="lt-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const MINUS = ICON('<path d="M5 12h14"/>'), PLUS = ICON('<path d="M12 5v14M5 12h14"/>');
const markFor = (kind: Kind) => document.querySelector<HTMLTemplateElement>('#or-marks')!.content.querySelector(`[data-kind="${kind}"]`)!.innerHTML;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function renderBasket(focusLine?: string, focusDir?: string) {
  const list = $('#or-lines');
  list.innerHTML = lines.map((l) => {
    const it = ITEMS[l.item];
    const lower = it.name.toLowerCase();
    return `<li data-line="${l.id}"><div class="as-row"><span class="as-mark" aria-hidden="true">${markFor(it.kind)}</span><span><b>${esc(it.name)}</b><small>${esc(l.opts)}</small></span><span class="or-line-end"><span class="or-line-price">${gbp(l.unit * l.qty)}</span><span class="or-qty" role="group" aria-label="${esc(it.name)}, how many"><button type="button" data-qty="-1" aria-label="${l.qty === 1 ? `Remove the ${esc(lower)}` : `One fewer ${esc(lower)}`}">${MINUS}</button><output aria-live="polite">${l.qty}</output><button type="button" data-qty="1" aria-label="One more ${esc(lower)}">${PLUS}</button></span></span></div></li>`;
  }).join('');
  const t = gbp(total()), n = count(), empty = n === 0;
  $('#or-sub').textContent = t;
  $('#or-total').textContent = t;
  $('#or-pay [data-part="label"]').textContent = `Pay ${t}`;
  $<HTMLButtonElement>('#or-pay').disabled = empty;
  $('#or-bag-count').textContent = String(n);
  $('#or-bag-total').textContent = t;
  $('#or-bag').setAttribute('aria-label', `View basket, ${n} item${n === 1 ? '' : 's'}, ${t}`);
  $('.or-bagbar').toggleAttribute('data-empty', empty);
  for (const el of [list, $('#or-when'), $('#or-sum'), $('#or-paybar')]) el.hidden = empty;
  $('#or-bag-empty').hidden = !empty;
  if (focusLine) {
    const b = list.querySelector<HTMLElement>(`[data-line="${focusLine}"] [data-qty="${focusDir}"]`) ?? list.querySelector<HTMLElement>('[data-qty]') ?? $('#or-bag-empty .lt-btn');
    b?.focus();
  }
}
$('#or-lines').addEventListener('click', (e) => {
  const b = (e.target as Element).closest<HTMLElement>('[data-qty]');
  if (!b) return;
  const id = b.closest<HTMLElement>('[data-line]')!.dataset.line!;
  const l = lines.find((x) => x.id === id)!;
  l.qty += Number(b.dataset.qty);
  if (l.qty <= 0) { lines.splice(lines.indexOf(l), 1); app.say(`${ITEMS[l.item].name} removed`); }
  renderBasket(id, b.dataset.qty);
});

// Which section of the menu is in view: its chip is marked, and a chip scrolls to its section.
const cats = $$<HTMLAnchorElement>('.or-cats a');
const menuScroll = $('#or-menu-scroll');
const mark = (id: string) => { for (const a of cats) { if (a.hash === `#${id}`) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); } };
const spy = new IntersectionObserver((entries) => {
  const seen = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
  if (seen) mark(seen.target.id);
}, { root: menuScroll, rootMargin: '-120px 0px -55% 0px' });
for (const s of $$('.or-sec')) spy.observe(s);
for (const a of cats) a.addEventListener('click', (e) => {
  e.preventDefault();
  const sec = $(a.hash);
  menuScroll.scrollTo({ top: sec.offsetTop - 96, behavior: reducedMotion() ? 'auto' : 'smooth' });
  mark(sec.id);
  $<HTMLElement>('h3', sec).setAttribute('tabindex', '-1');
  $<HTMLElement>('h3', sec).focus({ preventScroll: true });
});

// ------------------------------------------------------------------ the item sheet: size, milk, extras, how many
const dialog = $<HTMLDialogElement>('#or-sheet');
const pick = { item: 'flat', size: 0, n: 1 };
let opener: HTMLElement | null = null;
const extras = () => {
  const kind = ITEMS[pick.item].kind;
  let add = 0;
  const words: string[] = [];
  if (kind === 'coffee') {
    add += pick.size;
    words.push($<HTMLButtonElement>('#or-size [aria-checked="true"]').textContent!.trim());
    const milk = $<HTMLInputElement>('#or-milk input:checked');
    add += Number(milk.dataset.extra);
    words.push(milk.value === 'none' ? 'no milk' : `${milk.value} milk`);
    if ($<HTMLInputElement>('#or-shot').checked) { add += 0.6; words.push('extra shot'); }
  }
  if (kind === 'bakery' && $<HTMLInputElement>('#or-warm').checked) words.push('Warmed');
  if (kind === 'lunch' && $<HTMLInputElement>('#or-bread').checked) { add += 0.8; words.push('More bread'); }
  return { unit: ITEMS[pick.item].price + add, opts: words.join(' · ') || 'As it comes' };
};
const syncSheet = () => {
  const { unit } = extras();
  $('#or-n').textContent = String(pick.n);
  $('#or-add-go [data-part="label"]').textContent = `Add ${pick.n > 1 ? `${pick.n} ` : ''}for ${gbp(unit * pick.n)}`;
  $<HTMLButtonElement>('#or-sheet [data-step="-1"]').disabled = pick.n <= 1;
};
function openItem(id: string, from: HTMLElement) {
  const it = ITEMS[id];
  pick.item = id; pick.n = 1; pick.size = 0;
  opener = from;
  $('#or-sheet-h').textContent = it.name;
  $('#or-sheet-note').textContent = `${it.note} · from ${gbp(it.price)}`;
  // The item's own picture at the top of the sheet.
  const art = $(`[data-item="${id}"] .lt-art`).cloneNode(true) as HTMLElement;
  art.setAttribute('data-ratio', '16/9');
  art.querySelector('figcaption')?.remove();
  art.setAttribute('aria-hidden', 'true');
  $('#or-sheet-art').replaceChildren(art);
  for (const el of $$('[data-for]', dialog)) el.hidden = el.dataset.for !== it.kind;
  // Fresh choices each time: regular, whole milk, nothing extra.
  $<HTMLButtonElement>('#or-size [data-value="0"]').click();
  $<HTMLInputElement>('#or-milk input[value="whole"]').checked = true;
  for (const s of ['#or-shot', '#or-warm', '#or-bread']) $<HTMLInputElement>(s).checked = false;
  syncSheet();
  openDialog(dialog);
  $<HTMLElement>('#or-add-go').focus();
}
$('#or-size').addEventListener('lt-change', (e) => { pick.size = Number((e as CustomEvent<{ value: string }>).detail.value); syncSheet(); });
dialog.addEventListener('change', syncSheet);
dialog.addEventListener('click', (e) => {
  const b = (e.target as Element).closest<HTMLElement>('[data-step]');
  if (!b) return;
  pick.n = Math.max(1, Math.min(9, pick.n + Number(b.dataset.step)));
  syncSheet();
});
dialog.addEventListener('close', () => opener?.focus({ preventScroll: true }));
$('#or-add-go').addEventListener('click', () => {
  const { unit, opts } = extras();
  const same = lines.find((l) => l.item === pick.item && l.opts === opts);
  if (same) same.qty += pick.n; else lines.push({ id: `l${nextId++}`, item: pick.item, opts, unit, qty: pick.n });
  renderBasket();
  dialog.close();
  const bag = $('.or-bagbar');
  bag.removeAttribute('data-bump'); void bag.offsetWidth; bag.setAttribute('data-bump', '');
  app.say(`Added: ${pick.n > 1 ? `${pick.n} × ` : ''}${ITEMS[pick.item].name}`);
});
// A tap anywhere on a menu item opens it; the + button is the same thing for the keyboard.
for (const li of $$('.or-item')) li.addEventListener('click', () => openItem(li.dataset.item!, $<HTMLElement>('.or-add', li)));

// ------------------------------------------------------------------ paying, and the order's progress
// Received → Being made (the bar fills) → Ready to collect. It moves on its own, as a real order would.
const steps = $$<HTMLLIElement>('#or-steps > li');
let at = 1, fill = 0.35, timer = 0;
const STATE = ['Received', 'Being made', 'Ready to collect'];
function paintTrack(announce = false) {
  steps.forEach((li, i) => { li.toggleAttribute('data-done', i < at || at === 2 && i === 2); if (i === at) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
  $('#or-steps').style.setProperty('--fill', String(at >= 2 ? 1 : fill));
  const ready = at >= 2;
  $('#or-eta-state').textContent = STATE[at];
  $('#or-eta').textContent = ready ? 'Ready now' : 'Ready about 12:22';
  $('#or-now-state').textContent = STATE[at];
  $('#or-now-time').textContent = ready ? 'Ready now, at the counter' : 'Ready about 12:22';
  $$('.or-mini i').forEach((i, k) => i.toggleAttribute('data-on', k <= at));
  document.body.toggleAttribute('data-ready', ready);
  if (announce) $('#or-live').textContent = ready ? 'Order 42 is ready to collect' : `Order 42: ${STATE[at].toLowerCase()}`;
}
function run() {
  clearInterval(timer);
  if (at >= 2) return;
  timer = window.setInterval(() => {
    fill = Math.min(1, fill + 0.05);
    if (fill >= 1) { at = 2; clearInterval(timer); paintTrack(true); app.say('Order 42 is ready. It is on the counter by the door.'); return; }
    paintTrack();
  }, 1000);
}
const app = appShell({ home: 'menu', onShow: (id) => { if (id === 'track' || id === 'orders') run(); } });
if (app.current() === 'track' || app.current() === 'orders') run();
paintTrack();

$('#or-pay').addEventListener('click', () => {
  const what = lines.map((l) => `${l.qty > 1 ? `${l.qty} × ` : ''}${ITEMS[l.item].name.toLowerCase()}`).join(', ');
  $('.or-now-what').textContent = what.charAt(0).toUpperCase() + what.slice(1);
  $('#or-code-cap').textContent = `Collection number 42, in the name of Rowan, ${count()} items`;
  $('.or-code span').textContent = `Rowan · ${count()} item${count() === 1 ? '' : 's'}`;
  at = 0; fill = 0; paintTrack(true);
  lines.splice(0); renderBasket();
  app.show('track');
  window.setTimeout(() => { at = 1; fill = 0.05; paintTrack(true); run(); }, 2000);
});
$('#or-here').addEventListener('click', () => app.say('We have told the counter you are here'));
// Order again: the same things go back in the basket, made the usual way.
const USUAL: Record<Kind, string> = { coffee: 'Regular · whole milk', bakery: 'As it comes', lunch: 'As it comes' };
document.addEventListener('click', (e) => {
  const b = (e.target as Element).closest<HTMLElement>('[data-again]');
  if (!b) return;
  for (const id of b.dataset.again!.split(' ')) {
    const it = ITEMS[id], opts = USUAL[it.kind];
    const same = lines.find((l) => l.item === id && l.opts === opts);
    if (same) same.qty += 1; else lines.push({ id: `l${nextId++}`, item: id, opts, unit: it.price, qty: 1 });
  }
  renderBasket();
  app.say(`${b.dataset.again!.split(' ').map((id) => ITEMS[id].name).join(' and ')} added to your basket`);
});
renderBasket();
