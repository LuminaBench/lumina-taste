import { boot } from '../_shared/boot';
import { pageStates } from '../_shared/states';
import { appShell } from '../_shared/app';
import '../../components/ui/controls/button/button.css';
import '../../components/ui/feedback/skeleton/skeleton.css';
import '../../components/ui/data/art-panel/art-panel.css';
import '../../components/ui/data/chat-thread/chat-thread.css';
import '../../components/ui/navigation/mobile-app-bar/mobile-app-bar.css';
import '../../components/ui/navigation/bottom-nav/bottom-nav.css';
import '../../components/ui/controls/message-composer/message-composer.css';
import '../../components/ui/controls/settings-group/settings-group.css';
import '../_shared/app.css';
import './page.css';
import { enhance as appbar } from '../../components/ui/navigation/mobile-app-bar/mobile-app-bar';
import { enhance as composer } from '../../components/ui/controls/message-composer/message-composer';
import { enhance as settings } from '../../components/ui/controls/settings-group/settings-group';
import { enhance as swipeRow, removeRow } from '../../components/ui/navigation/swipe-row/swipe-row';

pageStates();
boot({ 'mobile-app-bar': appbar, 'message-composer': composer, 'settings-group': settings, 'swipe-row': swipeRow });
const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;
const scroller = $('#ms-scroll');
const toEnd = () => scroller.scrollTo({ top: scroller.scrollHeight });
const app = appShell({ home: 'chats', onShow: (id) => { if (id === 'thread') requestAnimationFrame(toEnd); } });
if (app.current() === 'thread') requestAnimationFrame(toEnd);

// Opening a chat names it in the bar; the unread count goes.
document.addEventListener('click', (e) => {
  const row = (e.target as Element).closest<HTMLElement>('[data-who]');
  if (!row) return;
  const who = row.dataset.who!;
  $('#th-h').textContent = who;
  $('#screen-thread [data-part="small"]').textContent = who;
  $('#screen-thread .lt-chat').setAttribute('aria-label', `Conversation with ${who}`);
  row.removeAttribute('data-unread');
  row.querySelector('.ms-badge')?.remove();
}, true);

// Search narrows the chats as you type.
$<HTMLInputElement>('#ms-q').addEventListener('input', (e) => {
  const q = (e.target as HTMLInputElement).value.trim().toLowerCase();
  for (const li of document.querySelectorAll<HTMLElement>('#ms-chats > li')) li.hidden = !!q && !li.textContent!.toLowerCase().includes(q);
});

// Sending adds a bubble to your last group (or a new one), and the read state moves under it.
$('.lt-composer').addEventListener('lt-change', (e) => {
  const text = (e as CustomEvent<{ text: string }>).detail.text;
  const log = $('#ms-log');
  const now = new Date();
  const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  let group = log.lastElementChild as HTMLElement;
  if (group?.dataset.from !== 'me') {
    group = document.createElement('li'); group.dataset.part = 'group'; group.dataset.from = 'me';
    group.innerHTML = `<div data-part="stack"><p data-part="meta"><time>${hm}</time></p></div>`;
    log.append(group);
  }
  group.querySelector('[data-part="status"]')?.remove();
  const p = document.createElement('p'); p.dataset.part = 'bubble'; p.textContent = text;
  const status = document.createElement('p'); status.dataset.part = 'status'; status.textContent = 'Sent';
  group.querySelector('[data-part="stack"]')!.append(p, status);
  log.querySelectorAll('[data-part="status"]').forEach((s) => { if (s !== status) s.remove(); });
  toEnd();
});
document.addEventListener('click', (e) => { if ((e.target as Element).closest('.ms-play')) app.say('Playing the voice note, 0:42'); });

// Swipe a chat towards the leading edge (or use its More button) to mute it or put it away.
$('.ms-swipe').addEventListener('lt-change', (e) => {
  const { action, id } = (e as CustomEvent<{ action: string; id: string }>).detail;
  const row = document.querySelector<HTMLElement>(`#ms-chats [data-id="${id}"]`);
  const who = row?.querySelector('[data-who]')?.getAttribute('data-who') ?? '';
  if (action === 'archive' && row) {
    // Focus would be lost with the row: it moves to the next chat's row (or the one before).
    const next = (row.nextElementSibling ?? row.previousElementSibling)?.querySelector<HTMLElement>('[data-part="main"]');
    if (row.contains(document.activeElement)) next?.focus();
    removeRow(row);
    app.say(`${who} archived`);
  } else if (action === 'mute') app.say(`${who} muted for 8 hours`);
});
