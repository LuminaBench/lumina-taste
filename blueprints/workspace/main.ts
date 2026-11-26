import { boot } from '../_shared/boot';
import { pageStates } from '../_shared/states';
import '../../components/ui/controls/button/button.css';
import '../../components/ui/controls/segmented-control/segmented-control.css';
import '../../components/ui/controls/pane-resizer/pane-resizer.css';
import '../../components/ui/navigation/app-sidebar/app-sidebar.css';
import '../../components/ui/data/data-table/data-table.css';
import '../../components/ui/feedback/badge/badge.css';
import '../../components/ui/feedback/kbd/kbd.css';
import '../../components/ui/feedback/skeleton/skeleton.css';
import '../../components/ui/feedback/empty-state/empty-state.css';
import '../../components/ui/overlays/command-palette/command-palette.css';
import '../../components/ui/overlays/shortcuts-sheet/shortcuts-sheet.css';
import '../../components/ui/overlays/modal-dialog/modal-dialog.css';
import './page.css';
import { enhance as sidebar } from '../../components/ui/navigation/app-sidebar/app-sidebar';
import { enhance as resizer } from '../../components/ui/controls/pane-resizer/pane-resizer';
import { enhance as dataTable } from '../../components/ui/data/data-table/data-table';
import { enhance as segmented } from '../../components/ui/controls/segmented-control/segmented-control';
import { enhance as palette } from '../../components/ui/overlays/command-palette/command-palette';
import { enhance as shortcuts } from '../../components/ui/overlays/shortcuts-sheet/shortcuts-sheet';
import { enhance as modal } from '../../components/ui/overlays/modal-dialog/modal-dialog';
import { openDialog } from '../../components/ui/_shared/dom';

const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];

// ------------------------------------------------------------------ today's sailings (sample data)
type Status = 'departed' | 'boarding' | 'ontime' | 'delayed' | 'cancelled';
interface Sailing { id: string; dep: string; from: string; to: string; ship: string; cars: number; carCap: number; foot: number; footCap: number; status: Status; late?: number; arr: string; master: string }
const ROUTES: Array<[string, string, number]> = [['Ardmore', 'Kestrel Isle', 85], ['Kestrel Isle', 'Ardmore', 85], ['Ardmore', 'Larkspur Bay', 55], ['Larkspur Bay', 'Ardmore', 55]];
const SHIPS: Record<string, [number, string]> = { 'MV Juniper': [50, 'Iona Reid'], 'MV Kestrel': [36, 'Callum Hart'], 'MV Moss': [44, 'Wren Adair'] };
const mins = (t: string) => +t.slice(0, 2) * 60 + +t.slice(3);
const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
function day(shift: number): Sailing[] {
  const out: Sailing[] = [];
  const times = ['06:30', '07:10', '07:45', '08:40', '09:20', '10:15', '10:50', '11:35', '12:30', '13:05', '13:50', '14:45', '15:20', '16:05', '16:40', '17:10', '17:55', '18:30', '19:05', '19:30', '20:10', '20:45', '21:15', '21:40'];
  times.forEach((t, i) => {
    const [from, to, dur] = ROUTES[(i + shift) % 4];
    const ship = Object.keys(SHIPS)[(i + shift) % 3];
    const [carCap, master] = SHIPS[ship];
    const seed = ((i + 3) * 37 + shift * 11) % 100;
    const now = mins('09:41');
    const dep = mins(t);
    let status: Status = shift ? 'ontime' : dep < now - 5 ? 'departed' : dep < now + 25 ? 'boarding' : 'ontime';
    let late: number | undefined;
    if (!shift && (i === 11 || i === 16)) { status = 'delayed'; late = i === 11 ? 15 : 10; }
    const cars = Math.min(carCap, Math.round(carCap * (0.35 + (seed % 60) / 100)));
    const full = [5, 9, 15].includes(i) && !shift ? carCap - (i % 3) : cars;
    out.push({ id: `s${shift}-${i}`, dep: t, from, to, ship, cars: full, carCap, foot: 40 + ((seed * 7) % 240), footCap: 300, status, late, arr: hhmm(dep + dur + (late ?? 0)), master });
  });
  return out;
}
let data = day(0);

const STATUS: Record<Status, [string, string]> = { departed: ['Departed', ''], boarding: ['Boarding', 'info'], ontime: ['On time', 'positive'], delayed: ['Late', 'warning'], cancelled: ['Cancelled', 'negative'] };
const label = (s: Sailing) => (s.status === 'delayed' ? `${s.late} min late` : STATUS[s.status][0]);
// Only exceptions get a coloured badge; on time and departed stay quiet text, so the column reads at a glance.
const statusHtml = (s: Sailing) => (s.status === 'ontime' || s.status === 'departed' ? `<span class="ws-status" data-s="${s.status}">${label(s)}</span>` : `<span class="lt-badge" data-tone="${STATUS[s.status][1]}" data-dot>${label(s)}</span>`);
const pct = (s: Sailing) => Math.round((s.cars / s.carCap) * 100);
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const rowHtml = (s: Sailing) => `<tr data-row data-id="${s.id}" tabindex="-1" aria-selected="false"${s.status === 'departed' ? ' data-past' : ''}>
  <td data-k="dep" data-v="${mins(s.dep)}"><time>${s.dep}</time></td>
  <td data-k="route"><span class="ws-route"><span data-from>${esc(s.from)}<span aria-hidden="true"> → </span><span class="lt-visually-hidden"> to </span></span><span data-to>${esc(s.to)}</span></span></td>
  <td data-k="ship" data-col="ship">${s.ship}</td>
  <td data-k="cars" data-v="${pct(s)}" data-col="cars"><span class="ws-cars"><span class="ws-meter" aria-hidden="true"><i style="--v: ${pct(s)}%"${pct(s) >= 90 ? ' data-high' : ''}></i></span><span>${pct(s) >= 100 ? 'Full' : `${pct(s)}%`}</span></span></td>
  <td data-num data-k="foot" data-v="${s.foot}" data-col="foot">${s.foot}</td>
  <td data-k="status">${statusHtml(s)}</td>
  <td data-num data-k="arr" data-v="${mins(s.arr)}" data-col="arr"><time>${s.arr}</time></td>
</tr>`;
const tbody = $('#ws-rows')!;
const render = () => { tbody.innerHTML = data.map(rowHtml).join(''); };
render();

pageStates();
boot({ 'app-sidebar': sidebar, 'pane-resizer': resizer, 'data-table': dataTable, 'segmented-control': segmented, 'command-palette': palette, 'shortcuts-sheet': shortcuts, 'modal-dialog': modal });

const ws = $('#ws')!;
const toast = $('#ws-toast')!;
let toastTimer = 0;
const say = (t: string) => { toast.textContent = t; clearTimeout(toastTimer); toastTimer = window.setTimeout(() => { toast.textContent = ''; }, 3600); };

// ------------------------------------------------------------------ filtering: a saved view, the day, the find box
let view = 'all';
const q = $<HTMLInputElement>('#ws-q')!;
const matches = (s: Sailing) => {
  if (view === 'delayed' && s.status !== 'delayed') return false;
  if (view === 'full' && pct(s) < 90) return false;
  if (view === 'cancelled' && s.status !== 'cancelled') return false;
  if (view.startsWith('from:') && s.from !== view.slice(5)) return false;
  const t = q.value.trim().toLowerCase();
  return !t || `${s.ship} ${s.from} ${s.to} ${s.dep}`.toLowerCase().includes(t);
};
const rows = () => $$<HTMLTableRowElement>('tr[data-row]', tbody);
const visibleRows = () => rows().filter((r) => !r.hidden);
const byId = (id: string) => data.find((s) => s.id === id)!;
function applyFilter() {
  let n = 0;
  for (const r of rows()) { const ok = matches(byId(r.dataset.id!)); r.hidden = !ok; if (ok) n++; }
  $('#ws-count')!.textContent = `${n} sailing${n === 1 ? '' : 's'}`;
  $('#ws-none')!.hidden = n > 0;
  $('#ws-table')!.hidden = n === 0;
  const late = data.filter((s) => s.status === 'delayed').length, boarding = data.filter((s) => s.status === 'boarding').length;
  $('#ws-summary')!.textContent = `${data.length} sailings · ${late} running late${boarding ? ` · ${boarding} boarding` : ''}`;
  for (const [k, f] of [['all', () => true], ['delayed', (s: Sailing) => s.status === 'delayed'], ['full', (s: Sailing) => pct(s) >= 90], ['cancelled', (s: Sailing) => s.status === 'cancelled']] as const) {
    const el = $(`[data-count="${k}"]`); if (el) el.textContent = String(data.filter(f).length);
  }
  const sel = selected();
  if (!sel || sel.hidden) { const first = visibleRows().find((r) => !r.hasAttribute('data-past')) ?? visibleRows()[0]; if (first) select(first, false); }
}
function setView(v: string) {
  view = v;
  for (const a of $$<HTMLAnchorElement>('#ws-views a, .lt-sidebar nav a')) { if (a.dataset.filter === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }
  applyFilter();
}
document.querySelector('.lt-sidebar nav')!.addEventListener('click', (e) => {
  const a = (e.target as Element).closest<HTMLAnchorElement>('a[data-filter]');
  if (!a) return;
  e.preventDefault();
  setView(a.dataset.filter!);
  selected()?.focus();
});
q.addEventListener('input', applyFilter);
$('#ws-show-all')!.addEventListener('click', () => { q.value = ''; setView('all'); });
$('#ws-day')!.addEventListener('lt-change', (e) => {
  const tomorrow = (e as CustomEvent<{ value: string }>).detail.value === 'tomorrow';
  data = day(tomorrow ? 1 : 0);
  $('.ws-title p')!.textContent = tomorrow ? 'Wednesday 27 November' : 'Tuesday 26 November';
  render();
  applyFilter();
});

// ------------------------------------------------------------------ selection and the inspector
const selected = () => tbody.querySelector<HTMLTableRowElement>('tr[aria-selected="true"]');
function select(row: HTMLTableRowElement, focus = true) {
  for (const r of rows()) { const on = r === row; r.setAttribute('aria-selected', String(on)); r.tabIndex = on ? 0 : -1; }
  if (focus) row.focus({ preventScroll: true });
  row.scrollIntoView({ block: 'nearest' });
  const s = byId(row.dataset.id!);
  $('#ws-i-when')!.textContent = `${s.status === 'departed' ? 'Left' : 'Leaves'} ${s.from} at`;
  $('#ws-i-time')!.textContent = s.dep;
  $('#ws-i-route')!.textContent = `to ${s.to}`;
  const st = $('#ws-i-status')!;
  st.textContent = label(s);
  if (STATUS[s.status][1]) st.dataset.tone = STATUS[s.status][1]; else delete st.dataset.tone;
  $('#ws-i-ship')!.textContent = `${s.ship} · arrives ${s.arr}`;
  $('#ws-i-cars')!.textContent = `${s.cars} of ${s.carCap} cars`;
  $('#ws-i-cars-bar')!.style.setProperty('--v', `${pct(s)}%`);
  $('#ws-i-foot')!.textContent = `${s.foot} of ${s.footCap}`;
  $('#ws-i-foot-bar')!.style.setProperty('--v', `${Math.round((s.foot / s.footCap) * 100)}%`);
  $('#ws-i-master')!.textContent = s.master;
  const past = s.status === 'departed';
  $<HTMLButtonElement>('#ws-delay')!.disabled = past;
  $<HTMLButtonElement>('#ws-message')!.disabled = false;
  $('#ws-d-time')!.textContent = s.dep;
}
const move = (by: number) => {
  const list = visibleRows();
  const i = list.indexOf(selected()!);
  const next = list[Math.max(0, Math.min(list.length - 1, i + by))];
  if (next) select(next);
};
// One pane at a time on a narrow window: opening a row brings the inspector over the table.
const openInspector = () => { ws.dataset.pane = 'inspector'; $('#ws-i-h')!.focus({ preventScroll: true }); };
const closeInspector = () => { delete ws.dataset.pane; selected()?.focus(); };
tbody.addEventListener('click', (e) => { const r = (e.target as Element).closest<HTMLTableRowElement>('tr[data-row]'); if (r) { select(r); if (matchMedia('(max-width: 860px)').matches) openInspector(); } });
tbody.addEventListener('dblclick', () => openInspector());
$('#ws-i-back')!.addEventListener('click', closeInspector);

// ------------------------------------------------------------------ actions: delay and message
const delayRoot = $('#ws-delay-root')!;
const delayDialog = $<HTMLDialogElement>('#ws-delay-dialog')!;
let delayBy = 15;
const openDelay = () => { const s = selected(); if (!s || byId(s.dataset.id!).status === 'departed') { say('That sailing has already left.'); return; } delayDialog.returnValue = ''; openDialog(delayDialog); $<HTMLElement>('#ws-d-mins [aria-checked="true"]')?.focus(); };
$('#ws-delay')!.addEventListener('click', openDelay);
$('#ws-d-mins')!.addEventListener('lt-change', (e) => {
  delayBy = +(e as CustomEvent<{ value: string }>).detail.value;
  $('#ws-d-go [data-part="label"]')!.textContent = `Delay by ${delayBy < 60 ? `${delayBy} min` : '1 hour'}`;
});
delayRoot.addEventListener('lt-change', (e) => {
  if ((e as CustomEvent<{ value: string }>).detail.value !== 'confirm') return;
  const row = selected();
  if (!row) return;
  const s = byId(row.dataset.id!);
  s.status = 'delayed'; s.late = (s.late ?? 0) + delayBy; s.arr = hhmm(mins(s.dep) + ROUTES.find(([f, t]) => f === s.from && t === s.to)![2] + s.late);
  row.outerHTML = rowHtml(s);
  const fresh = tbody.querySelector<HTMLTableRowElement>(`[data-id="${s.id}"]`)!;
  select(fresh);
  applyFilter();
  say(`The ${s.dep} to ${s.to} is ${s.late} min late. ${s.foot} passengers have been told.`);
});
delayDialog.addEventListener('close', () => { selected()?.focus({ preventScroll: true }); });
const message = () => { const s = selected(); if (s) { const d = byId(s.dataset.id!); say(`Message drafted to ${d.foot} passengers on the ${d.dep}.`); } };
$('#ws-message')!.addEventListener('click', message);

// ------------------------------------------------------------------ command menu and keys
const cmds = new Map($$('#ws-cmdk [role="option"]').map((o) => [o.querySelector('span')!.textContent!.trim(), o.dataset.cmd!]));
$('#ws-cmdk')!.addEventListener('lt-change', (e) => {
  const cmd = cmds.get((e as CustomEvent<{ command: string }>).detail.command ?? '') ?? '';
  // Run after the menu has closed and handed focus back.
  requestAnimationFrame(() => {
    if (cmd === 'delay') openDelay();
    else if (cmd === 'message') message();
    else if (cmd === 'shortcuts') $<HTMLButtonElement>('#ws-keys [data-part="open"]')!.click();
    else if (cmd.startsWith('view:')) { setView(cmd.slice(5)); selected()?.focus(); }
  });
});
const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
document.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented || document.querySelector('dialog[open]')) return;
  if (document.documentElement.dataset.pageState && document.documentElement.dataset.pageState !== 'ready') return;
  if (e.key === '/' && !typing(e.target)) { e.preventDefault(); q.focus(); return; }
  if (e.key === 'Escape' && typing(e.target)) { (e.target as HTMLElement).blur(); selected()?.focus(); return; }
  if (e.key === 'Escape' && ws.dataset.pane) { closeInspector(); return; }
  if (typing(e.target) || (e.target as Element).closest?.('[role="separator"], [role="radiogroup"], .lt-sidebar')) return;
  const k = e.key.toLowerCase();
  if (k === 'j' || e.key === 'ArrowDown') { e.preventDefault(); move(1); }
  else if (k === 'k' || e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
  else if (e.key === 'Enter' && (e.target as Element).closest?.('tr[data-row]')) { e.preventDefault(); openInspector(); }
  else if (k === 'd') { e.preventDefault(); openDelay(); }
  else if (k === 'm') { e.preventDefault(); message(); }
});
// Sorting moves rows; keep the selected one in view.
$('.ws-table')!.addEventListener('lt-change', () => selected()?.scrollIntoView({ block: 'nearest' }));

applyFilter();
