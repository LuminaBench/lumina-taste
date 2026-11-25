import { boot } from '../_shared/boot';
import { pageStates } from '../_shared/states';
import '../../components/ui/controls/button/button.css';
import '../../components/ui/feedback/badge/badge.css';
import '../../components/ui/feedback/kbd/kbd.css';
import '../../components/ui/overlays/dropdown-menu/dropdown-menu.css';
import '../../components/ui/overlays/switcher-menu/switcher-menu.css';
import '../../components/ui/navigation/session-list/session-list.css';
import '../../components/ui/backdrops/backdrop-dither/backdrop-dither.css';
import '../../components/ui/data/prompt-composer/prompt-composer.css';
import '../../components/ui/data/diff-view/diff-view.css';
import './page.css';
import { enhance as switcher } from '../../components/ui/overlays/switcher-menu/switcher-menu';
import { enhance as sessions } from '../../components/ui/navigation/session-list/session-list';
import { enhance as dither } from '../../components/ui/backdrops/backdrop-dither/backdrop-dither';
import { enhance as composer } from '../../components/ui/data/prompt-composer/prompt-composer';

pageStates();
boot({ 'switcher-menu': switcher, 'session-list': sessions, 'backdrop-dither': dither, 'prompt-composer': composer });

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel);
const show = (state: string) => { document.documentElement.dataset.pageState = state; for (const el of document.querySelectorAll<HTMLElement>('[data-view]')) el.hidden = !el.dataset.view!.split(' ').includes(state); };
const input = $<HTMLTextAreaElement>('#ag-input');

// Starting a session: in a real app this creates the session and streams its plan. Here it opens the sample run.
$('#ag-composer')?.addEventListener('lt-change', (e) => {
  const text = String((e as CustomEvent).detail?.text ?? '').trim();
  if (!text) return;
  const title = text.length > 64 ? `${text.slice(0, 61)}…` : text;
  const h = $('#ag-run-h'); if (h) h.textContent = title;
  show('running');
  $('#ag-run-h')?.focus();
});
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-suggest]')) b.addEventListener('click', () => { if (!input) return; input.value = b.textContent ?? ''; input.dispatchEvent(new Event('input', { bubbles: true })); input.focus(); });
document.querySelector('.lt-sessions')?.addEventListener('lt-change', () => { show('running'); closeSide(); });

// Approving the edit: the bar confirms in words, the running step completes and the next one starts.
$('#ag-approve')?.addEventListener('click', () => {
  const bar = document.querySelector<HTMLElement>('.ag-approve');
  const running = document.querySelector<HTMLElement>('.ag-plan li[data-s="running"]');
  if (running) { running.dataset.s = 'done'; const sr = running.querySelector('.lt-visually-hidden'); if (sr) sr.textContent = 'Done: '; const next = running.nextElementSibling as HTMLElement | null; if (next) { next.dataset.s = 'running'; const s = next.querySelector('.lt-visually-hidden'); if (s) s.textContent = 'In progress: '; } }
  if (bar) { bar.dataset.done = ''; bar.innerHTML = '<p><b>Edit approved.</b> ledger/totals.ts was changed. Running the tests now.</p>'; }
  const status = $('#ag-status'); if (status) status.textContent = 'Edit approved. Running the 212 ledger tests.';
});

// Sidebar drawer on narrow screens: opens from the menu button, closes on Esc, the scrim or a choice.
const side = $('#ag-side'), menu = $('#ag-menu'), scrim = $('#ag-scrim');
const narrow = matchMedia('(max-width: 860px)');
function openSide() { if (!side) return; side.dataset.open = ''; if (scrim) scrim.hidden = false; menu?.setAttribute('aria-expanded', 'true'); $('#ag-close')?.focus(); }
function closeSide() { if (!side || !('open' in side.dataset)) return; delete side.dataset.open; if (scrim) scrim.hidden = true; menu?.setAttribute('aria-expanded', 'false'); if (narrow.matches) menu?.focus(); }
menu?.addEventListener('click', openSide);
$('#ag-close')?.addEventListener('click', closeSide);
scrim?.addEventListener('click', closeSide);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSide(); });
