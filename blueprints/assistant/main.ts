import { boot } from '../_shared/boot';
import { pageStates } from '../_shared/states';
import '../../components/ui/controls/button/button.css';
import '../../components/ui/feedback/badge/badge.css';
import '../../components/ui/data/assistant-thread/assistant-thread.css';
import '../../components/ui/data/prompt-composer/prompt-composer.css';
import '../../components/ui/feedback/kbd/kbd.css';
import './page.css';
import { enhance as thread, streamInto } from '../../components/ui/data/assistant-thread/assistant-thread';
import { enhance as composer } from '../../components/ui/data/prompt-composer/prompt-composer';

boot({ 'assistant-thread': thread, 'prompt-composer': composer });
pageStates();

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel);
const turns = $('#as-thread [data-part="turns"]');
const scroll = $('#as-scroll');
const input = $<HTMLTextAreaElement>('#as-input');
const setState = (s: string) => { document.documentElement.dataset.pageState = s; for (const el of document.querySelectorAll<HTMLElement>('[data-view]')) el.hidden = !el.dataset.view!.split(' ').includes(s); };
const toBottom = () => { if (scroll) scroll.scrollTop = scroll.scrollHeight; };
let stop: (() => void) | null = null;

// A stand-in for your model call: replace reply() with a real request and feed its text to streamInto().
const reply = (q: string) => `Here is what I found for “${q}”. In this demo the answer is canned: connect your own model and data, then stream its text into this turn. Every figure should name the table it came from.`;

function ask(text: string) {
  if (!turns) return;
  stop?.();
  const user = document.createElement('li'); user.dataset.role = 'user';
  const p = document.createElement('p'); p.textContent = text; user.append(p);
  const bot = document.createElement('li'); bot.dataset.role = 'assistant';
  const answer = document.createElement('div'); answer.dataset.part = 'answer'; bot.append(answer);
  turns.append(user, bot);
  setState('streaming');
  toBottom();
  stop = streamInto(bot, reply(text), { onDone: () => { stop = null; setState('ready'); toBottom(); } });
}

$('#as-composer')?.addEventListener('lt-change', (e) => { const d = (e as CustomEvent).detail; if (d?.text) ask(String(d.text)); });
$('#as-stop')?.addEventListener('click', () => { stop?.(); stop = null; setState('ready'); input?.focus(); });
$('#as-thread')?.addEventListener('lt-change', (e) => { if ((e as CustomEvent).detail?.action === 'retry') ask('Try that again'); });
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-suggest]')) b.addEventListener('click', () => { if (!input) return; input.value = b.textContent ?? ''; input.dispatchEvent(new Event('input', { bubbles: true })); input.focus(); });
$('#as-new')?.addEventListener('click', () => { stop?.(); if (turns) turns.innerHTML = ''; const t = $('#as-title'); if (t) t.textContent = 'New chat'; setState('empty'); closeRail(); input?.focus(); });

// States from the URL: ?state=streaming shows an answer arriving, ?state=error a failed turn.
const initial = document.documentElement.dataset.pageState;
if (initial === 'streaming' && turns) { const last = turns.querySelector<HTMLElement>('li[data-role="assistant"]:last-child'); if (last) { last.dataset.state = 'streaming'; last.querySelector('[data-part="actions"]')?.remove(); const code = last.querySelector('code'); const caret = document.createElement('span'); caret.dataset.part = 'caret'; caret.setAttribute('aria-hidden', 'true'); code?.append(caret); } }
if (initial === 'error' && turns) { const last = turns.querySelector<HTMLElement>('li[data-role="assistant"]:last-child'); if (last) { last.dataset.state = 'error'; last.innerHTML = '<p data-part="error">The answer stopped: the model did not respond in time. Your question is kept.<button type="button" data-action="retry">Try again</button></p>'; } }
if (initial === 'empty') { const t = $('#as-title'); if (t) t.textContent = 'New chat'; document.querySelector('.as-history [aria-current]')?.removeAttribute('aria-current'); }
toBottom();

// History drawer on phones: opens from the menu button, closes on Esc, the scrim or a choice.
const rail = $('#as-rail'), menu = $('#as-menu'), scrim = $('#as-scrim');
const narrow = matchMedia('(max-width: 860px)');
function openRail() { if (!rail) return; rail.dataset.open = ''; if (scrim) scrim.hidden = false; menu?.setAttribute('aria-expanded', 'true'); $('#as-close')?.focus(); }
function closeRail() { if (!rail || !('open' in rail.dataset)) return; delete rail.dataset.open; if (scrim) scrim.hidden = true; menu?.setAttribute('aria-expanded', 'false'); if (narrow.matches) menu?.focus(); }
menu?.addEventListener('click', openRail);
$('#as-close')?.addEventListener('click', closeRail);
scrim?.addEventListener('click', closeRail);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeRail(); });
rail?.addEventListener('click', (e) => { if ((e.target as Element).closest('.as-history a')) closeRail(); });
