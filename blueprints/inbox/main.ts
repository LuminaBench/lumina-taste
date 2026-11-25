import { boot } from '../_shared/boot';
import { pageStates } from '../_shared/states';
import '../../components/ui/controls/button/button.css';
import '../../components/ui/feedback/badge/badge.css';
import '../../components/ui/feedback/kbd/kbd.css';
import '../../components/ui/data/chat-thread/chat-thread.css';
import '../../components/ui/data/prompt-composer/prompt-composer.css';
import './page.css';
import { enhance as composer } from '../../components/ui/data/prompt-composer/prompt-composer';

pageStates();
boot({ 'prompt-composer': composer });

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel);
const shell = $('.ib-shell');
const phone = matchMedia('(max-width: 720px)');
const scroll = $('#ib-scroll');
const toBottom = () => { if (scroll) scroll.scrollTop = scroll.scrollHeight; };
// On a phone the list is the first screen; wider screens open the first conversation.
if (shell && phone.matches && !location.hash) shell.dataset.pane = 'list';
toBottom();

// Opening a conversation: mark it current and read, show its subject, and on a phone move to the thread pane.
const list = $('#ib-convs');
list?.addEventListener('click', (e) => {
  const a = (e.target as Element).closest<HTMLAnchorElement>('a[data-conv]');
  if (!a) return;
  e.preventDefault();
  list.querySelector('[aria-current]')?.removeAttribute('aria-current');
  a.setAttribute('aria-current', 'true'); a.removeAttribute('data-unread'); a.querySelector('.ib-subj .lt-visually-hidden')?.remove();
  const subject = $('#ib-subject'), from = $('#ib-from');
  if (subject) subject.textContent = a.querySelector('.ib-subj')?.textContent ?? '';
  if (from) from.textContent = (a.querySelector('.ib-who')?.textContent ?? '').trim();
  if (shell) shell.dataset.pane = 'thread';
  if (phone.matches) $('#ib-back')?.focus();
});
$('#ib-back')?.addEventListener('click', () => { if (shell) shell.dataset.pane = 'list'; list?.querySelector<HTMLElement>('[aria-current]')?.focus(); });

// Search filters the list as you type and says so when nothing matches.
$<HTMLInputElement>('#ib-search')?.addEventListener('input', (e) => {
  const q = (e.target as HTMLInputElement).value.trim().toLowerCase();
  let shown = 0;
  for (const li of list?.querySelectorAll<HTMLElement>('li') ?? []) { const hit = !q || (li.textContent ?? '').toLowerCase().includes(q); li.hidden = !hit; if (hit) shown++; }
  const none = $('#ib-nomatch'); if (none) none.hidden = shown > 0;
});

// Sending adds the message to the thread. Replace this with your own send call.
$('#ib-composer')?.addEventListener('lt-change', (e) => {
  const d = (e as CustomEvent).detail as { text?: string; mode?: string };
  if (!d?.text) return;
  const log = document.querySelector('.lt-chat [data-part="log"]');
  const li = document.createElement('li'); li.dataset.part = 'group'; li.dataset.from = 'me';
  const stack = document.createElement('div'); stack.dataset.part = 'stack';
  const bubble = document.createElement('p'); bubble.dataset.part = 'bubble'; bubble.textContent = d.text;
  const status = document.createElement('p'); status.dataset.part = 'status'; status.textContent = d.mode === 'Internal note' ? 'Note, only your team can see this' : 'Sent just now';
  stack.append(bubble, status); li.append(stack); log?.append(li);
  toBottom();
});
$('#ib-close')?.addEventListener('click', () => { const s = $('#ib-status'); if (s) s.textContent = 'Closed. It reopens if Riya replies.'; });

// Customer details: a column on wide screens, a panel on smaller ones.
const side = $('#ib-side'), info = $('#ib-info');
const openSide = () => { if (!side) return; side.dataset.open = ''; info?.setAttribute('aria-expanded', 'true'); $('#ib-side-close')?.focus(); };
const closeSide = () => { if (!side || !('open' in side.dataset)) return; delete side.dataset.open; info?.setAttribute('aria-expanded', 'false'); info?.focus(); };
info?.addEventListener('click', () => (side && 'open' in side.dataset ? closeSide() : openSide()));
$('#ib-side-close')?.addEventListener('click', closeSide);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSide(); });
