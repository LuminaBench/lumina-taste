import { boot } from '../_shared/boot';
import { pageStates } from '../_shared/states';
import { appShell } from '../_shared/app';
import '../../components/ui/controls/button/button.css';
import '../../components/ui/feedback/skeleton/skeleton.css';
import '../../components/ui/data/art-panel/art-panel.css';
import '../../components/ui/data/sortable-list/sortable-list.css';
import '../../components/ui/navigation/mobile-app-bar/mobile-app-bar.css';
import '../../components/ui/navigation/bottom-nav/bottom-nav.css';
import '../../components/ui/controls/settings-group/settings-group.css';
import '../_shared/app.css';
import './page.css';
import { enhance as appbar } from '../../components/ui/navigation/mobile-app-bar/mobile-app-bar';
import { enhance as settings } from '../../components/ui/controls/settings-group/settings-group';
import { enhance as sortable } from '../../components/ui/data/sortable-list/sortable-list';
import { reducedMotion } from '../../components/ui/_shared/dom';

pageStates();
boot({ 'mobile-app-bar': appbar, 'settings-group': settings, 'sortable-list': sortable });
const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s)!;
const $$ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];
const clock = (s: number) => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`; };
const mins = (s: number) => `${Math.max(1, Math.round(s / 60))} min`;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

// ------------------------------------------------------------------ the shows and their episodes (all made up)
type Show = 'fn' | 'lw' | 'sh' | 'ss';
const SHOWS: Record<Show, { name: string; tone: string }> = {
  fn: { name: 'Field Notes', tone: 'accent' }, lw: { name: 'The Long Way Round', tone: 'ink' },
  sh: { name: 'Small Hours', tone: '' }, ss: { name: 'Salt and Signal', tone: 'accent' },
};
interface Episode { show: Show; title: string; n: string; date: string; dur: number; about: string; chapters: Array<[number, string]> }
const EPS: Record<string, Episode> = {
  fn41: { show: 'fn', title: 'The hedge in winter', n: 'Episode 41', date: 'Wednesday 26 November', dur: 2530, about: 'Hedges look asleep in December. They are not. We walk a mile of blackthorn and hazel with a hedge-layer who has done it for forty winters, and count what still lives there.', chapters: [[0, 'Frost on the blackthorn'], [400, 'What lives in a hedge'], [920, 'Laying a hedge by hand'], [1625, 'The birds that stay'], [2190, 'Your notes']] },
  fn40: { show: 'fn', title: 'Mushrooms after rain', n: 'Episode 40', date: 'Wednesday 19 November', dur: 2340, about: 'Two days of rain, then a morning in a beech wood with a mycologist who will not tell us where. What comes up, what to leave, and why most of it is underground.', chapters: [[0, 'After the rain'], [540, 'Under the beeches'], [1320, 'What to leave alone'], [1980, 'Your notes']] },
  lw12: { show: 'lw', title: 'Walking the drovers’ roads', n: 'Episode 12', date: 'Tuesday 25 November', dur: 3300, about: 'Cattle once walked to market for weeks on green roads that still cross the hills. We follow one for three days and meet the people who keep it open.', chapters: [[0, 'The first gate'], [780, 'Inns that were for cattle'], [1860, 'A night in the bothy'], [2760, 'Down to the market town']] },
  sh88: { show: 'sh', title: 'Bread at four in the morning', n: 'Episode 88', date: 'Monday 24 November', dur: 1860, about: 'A baker’s night, from the first mix at midnight to the van at six. Mostly in her words, with the sound of the ovens.', chapters: [[0, 'Midnight'], [600, 'The first proof'], [1260, 'Out of the oven']] },
  ss7: { show: 'ss', title: 'The lighthouse keeper’s log', n: 'Episode 7', date: 'Sunday 23 November', dur: 2880, about: 'Forty years of weather, ships and visitors, written up every evening in the same hand. We read a winter of it aloud with the keeper’s granddaughter.', chapters: [[0, 'The first entry'], [900, 'The storm of 1962'], [1800, 'Visitors'], [2460, 'The last light']] },
};

// ------------------------------------------------------------------ the player: one episode, its place, play or not
const pos: Record<string, number> = { fn41: 1145 };
let ep = 'fn41', t = 1145, playing = false, timer = 0, speedAt = 0, sleepAt = 0;
const SPEEDS = [1, 1.25, 1.5, 2];
const SLEEP = ['Off', '15 min', '30 min', 'End of episode'];
const tpl = $<HTMLTemplateElement>('#ls-covers').content;
const ICON = (name: 'play' | 'pause', size: number) => tpl.querySelector(`[data-icon="${name}"]`)!.innerHTML.replace(/width="\d+" height="\d+"/, `width="${size}" height="${size}"`);
const cover = (show: Show, alt: string) => `<figure class="lt-art" data-ratio="1/1"${SHOWS[show].tone ? ` data-tone="${SHOWS[show].tone}"` : ''}>${tpl.querySelector(`[data-show="${show}"]`)!.innerHTML}<figcaption class="lt-visually-hidden">${esc(alt)}</figcaption></figure>`;
const chapterList = (e: Episode) => e.chapters.map(([at, name]) => `<li><button type="button" data-at="${at}"><time>${clock(at)}</time><span>${esc(name)}</span></button></li>`).join('');
const chapterAt = (e: Episode, s: number) => { let i = 0; e.chapters.forEach(([at], k) => { if (s >= at) i = k; }); return i; };

const seek = $<HTMLInputElement>('#ls-seek');
function loadPlayer(id: string) {
  const e = EPS[id];
  ep = id; t = pos[id] ?? 0;
  $('#pl-h').textContent = e.title;
  $('#ls-pl-show').firstChild!.textContent = `${SHOWS[e.show].name} · `;
  $('#ls-cover').innerHTML = cover(e.show, `${SHOWS[e.show].name} cover`);
  $('#ls-pl-chapters').innerHTML = chapterList(e);
  $('#ls-ticks').innerHTML = e.chapters.slice(1).map(([at]) => `<i style="--at: ${((at / e.dur) * 100).toFixed(1)}%"></i>`).join('');
  seek.max = String(e.dur);
  $('#ls-mini-title').textContent = e.title;
  $('#ls-mini-art').innerHTML = tpl.querySelector(`[data-mark="${e.show}"]`)!.innerHTML;
  $('#ls-mini-art').dataset.show = e.show;
  $('#ls-mini-open').setAttribute('aria-label', `Open the player: ${e.title}`);
  paint();
}
function paint() {
  const e = EPS[ep];
  const p = `${((t / e.dur) * 100).toFixed(2)}%`;
  seek.value = String(Math.round(t));
  seek.style.setProperty('--p', p);
  seek.setAttribute('aria-valuetext', `${clock(t)} of ${clock(e.dur)}`);
  $('#ls-now').textContent = clock(t);
  $('#ls-left').textContent = `−${clock(e.dur - t)}`;
  $('#ls-mini-bar').style.setProperty('--p', p);
  $('#ls-mini-sub').textContent = `${SHOWS[e.show].name} · ${mins(e.dur - t)} left`;
  const c = chapterAt(e, t);
  $('#ls-pl-chapter').textContent = e.chapters[c][1];
  $$('#ls-pl-chapters button').forEach((b, k) => { if (k === c) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
  if (ep === 'fn41') { $('#ls-cont-left').textContent = `${mins(e.dur - t)} left`; $('#ls-cont-bar').style.setProperty('--p', p); }
}
function setPlaying(on: boolean) {
  playing = on;
  pos[ep] = t;
  document.body.toggleAttribute('data-playing', on);
  const e = EPS[ep];
  $('#ls-play').innerHTML = ICON(on ? 'pause' : 'play', 34);
  $('#ls-play').setAttribute('aria-label', on ? 'Pause' : 'Play');
  $('#ls-mini-play').innerHTML = ICON(on ? 'pause' : 'play', 22);
  $('#ls-mini-play').setAttribute('aria-label', on ? `Pause ${e.title}` : `Play ${e.title}`);
  for (const b of $$('[data-play]')) {
    const mine = b.dataset.play === ep && on;
    b.innerHTML = ICON(mine ? 'pause' : 'play', b.classList.contains('ls-round-sm') ? 18 : 20);
    b.setAttribute('aria-label', `${mine ? 'Pause' : 'Play'} ${EPS[b.dataset.play!].title}`);
  }
  syncEpisodeButton();
  clearInterval(timer);
  if (!on) return;
  timer = window.setInterval(() => {
    t = Math.min(e.dur, t + 0.25 * SPEEDS[speedAt]);
    pos[ep] = t;
    paint();
    if (t >= e.dur) setPlaying(false);
  }, 250);
}
// Another episode starts where it was left; the one already loaded plays or pauses; a chapter plays from its start.
const play = (id: string, at?: number) => {
  const same = id === ep;
  if (!same) { pos[ep] = t; loadPlayer(id); }
  if (at !== undefined) { t = at; pos[id] = at; paint(); setPlaying(true); return; }
  setPlaying(same ? !playing : true);
};

$('#ls-play').addEventListener('click', () => setPlaying(!playing));
$('#ls-mini-play').addEventListener('click', () => setPlaying(!playing));
$('#ls-back').addEventListener('click', () => { t = Math.max(0, t - 15); pos[ep] = t; paint(); });
$('#ls-fwd').addEventListener('click', () => { t = Math.min(EPS[ep].dur, t + 30); pos[ep] = t; paint(); });
seek.addEventListener('input', () => { t = Number(seek.value); pos[ep] = t; paint(); });
$('#ls-speed').addEventListener('click', (e) => {
  speedAt = (speedAt + 1) % SPEEDS.length;
  const b = e.currentTarget as HTMLElement, v = `${SPEEDS[speedAt]}×`;
  b.textContent = v; b.setAttribute('aria-label', `Speed ${v}`);
});
$('#ls-sleep').addEventListener('click', (e) => {
  sleepAt = (sleepAt + 1) % SLEEP.length;
  const b = e.currentTarget as HTMLElement;
  b.querySelector('span')!.textContent = SLEEP[sleepAt];
  b.setAttribute('aria-label', `Sleep timer, ${SLEEP[sleepAt].toLowerCase()}`);
  b.toggleAttribute('data-on', sleepAt > 0);
  app.say(sleepAt ? `Stops playing after ${SLEEP[sleepAt].toLowerCase()}` : 'Sleep timer off');
});
// Play buttons on rows and on the card, and every chapter list.
document.addEventListener('click', (e) => {
  const t0 = e.target as Element;
  const p = t0.closest<HTMLElement>('[data-play]');
  if (p) { play(p.dataset.play!); return; }
  const ch = t0.closest<HTMLElement>('.ls-chapters [data-at]');
  if (!ch) return;
  const inPlayer = !!ch.closest('#ls-pl-chapters');
  play(inPlayer ? ep : shown, Number(ch.dataset.at));
  if (!inPlayer) app.say(`Playing from ${clock(Number(ch.dataset.at))}`);
});

// ------------------------------------------------------------------ one episode: the row that was tapped fills it
let shown = 'fn41';
function syncEpisodeButton() {
  const at = pos[shown] ?? 0;
  const on = playing && ep === shown;
  const b = $('#ls-ep-play');
  b.innerHTML = `${ICON(on ? 'pause' : 'play', 18)}<span data-part="label">${on ? 'Pause' : at > 0 ? `Play from ${clock(at)}` : 'Play'}</span>`;
}
document.addEventListener('click', (e) => {
  const row = (e.target as Element).closest<HTMLElement>('[data-ep]');
  if (!row || row.closest('#ls-queue')) return;
  const id = row.dataset.ep!, x = EPS[id];
  shown = id;
  $('#ep-show').textContent = SHOWS[x.show].name;
  $('#ep-small').textContent = SHOWS[x.show].name;
  $('#ep-h').textContent = x.title;
  $('#ls-ep-meta').textContent = `${x.n} · ${x.date} · ${mins(x.dur)}`;
  $('#ls-ep-about').textContent = x.about;
  $('#ls-ep-cover').innerHTML = cover(x.show, `${SHOWS[x.show].name} cover`);
  $('#ls-ep-chapters').innerHTML = chapterList(x);
  syncEpisodeButton();
}, true);
$('#ls-ep-play').addEventListener('click', () => play(shown));
$('#ls-ep-queue').addEventListener('click', () => {
  const x = EPS[shown];
  if (!$('#ls-queue').querySelector(`[data-ep="${shown}"]`)) {
    const li = document.createElement('li');
    li.dataset.ep = shown;
    li.innerHTML = `<span>${esc(x.title)}</span><small>${esc(SHOWS[x.show].name)} · ${mins(x.dur)}</small><i class="as-mark ls-tile" data-show="${x.show}" aria-hidden="true">${tpl.querySelector(`[data-mark="${x.show}"]`)!.innerHTML}</i>${$('#ls-queue [data-part="handle"]').outerHTML.replace(/aria-label="[^"]*"/, `aria-label="Move ${esc(x.title)}"`)}`;
    $('#ls-queue').append(li);
    syncQueue();
  }
  app.say(`${x.title} is in Up next`);
});
$('#ls-ep-dl').addEventListener('click', (e) => {
  const b = e.currentTarget as HTMLElement, on = b.getAttribute('aria-pressed') !== 'true';
  b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', on ? 'Downloaded' : 'Download');
  app.say(on ? 'Downloaded: it plays with no signal' : 'Removed from this phone');
});
const syncQueue = () => {
  const ids = $$('#ls-queue > li').map((li) => li.dataset.ep!);
  const total = ids.reduce((s, id) => s + EPS[id].dur, 0);
  $('#ls-queue-sum').textContent = `${ids.length} episode${ids.length === 1 ? '' : 's'} · ${Math.floor(total / 3600)} h ${Math.round((total % 3600) / 60)} min`;
};

// ------------------------------------------------------------------ the player rises from the mini player and drags down to close
const app = appShell({ home: 'library' });
const player = $('#screen-playing');
let drag: { y0: number; t0: number; dy: number; prev: HTMLElement | null } | null = null, swallow = false;
player.addEventListener('pointerdown', (e) => {
  const t0 = e.target as Element;
  if (e.button > 0 || !t0.closest('.ls-player-top, .ls-cover') || player.querySelector('.as-scroll')!.scrollTop > 0) return;
  drag = { y0: e.clientY, t0: e.timeStamp, dy: 0, prev: null };
});
player.addEventListener('pointermove', (e) => {
  if (!drag) return;
  drag.dy = Math.max(0, e.clientY - drag.y0);
  if (!drag.prev && drag.dy > 8) {
    // The screen underneath shows through as the player comes down.
    drag.prev = document.querySelector<HTMLElement>(`.as-screen[data-screen="${app.previous()}"]`);
    if (drag.prev) { drag.prev.style.display = 'flex'; drag.prev.style.transformOrigin = '50% 0'; }
    player.setPointerCapture(e.pointerId);
    player.setAttribute('data-dragging', '');
  }
  if (!drag.prev) return;
  const k = Math.min(1, drag.dy / innerHeight);
  player.style.translate = `0 ${drag.dy}px`;
  drag.prev.style.scale = String(0.94 + 0.06 * k);
});
const endDrag = (e: PointerEvent) => {
  if (!drag) return;
  const { dy, t0, prev } = drag;
  drag = null;
  if (!prev) return;
  swallow = true; setTimeout(() => { swallow = false; }, 0);
  player.removeAttribute('data-dragging');
  const v = dy / Math.max(1, e.timeStamp - t0);
  const close = dy > 140 || v > 0.6;
  const reset = () => { player.style.translate = ''; prev.style.display = ''; prev.style.scale = ''; prev.style.transformOrigin = ''; };
  const ease = getComputedStyle(document.documentElement).getPropertyValue('--ease-out').trim() || 'ease-out';
  const ms = reducedMotion() ? 0 : parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dur-4')) || 320;
  const a = player.animate([{ translate: `0 ${dy}px` }, { translate: close ? '0 100%' : '0 0' }], { duration: ms, easing: ease });
  prev.animate([{ scale: prev.style.scale }, { scale: close ? '1' : '0.94' }], { duration: ms, easing: ease });
  a.finished.then(() => { reset(); if (close) app.show(app.previous(), 'down', null, true); }).catch(reset);
};
player.addEventListener('pointerup', endDrag);
player.addEventListener('pointercancel', endDrag);
player.addEventListener('click', (e) => { if (swallow) { e.preventDefault(); e.stopPropagation(); } }, true);

$('#ls-queue').closest('[data-lt="sortable-list"]')!.addEventListener('lt-change', syncQueue);
loadPlayer('fn41');
setPlaying(false);
