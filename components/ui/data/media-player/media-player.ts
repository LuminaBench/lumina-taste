import { combine, emit, on, type Cleanup } from '../../_shared/dom';

const ICON = (d: string) => `<svg class="lt-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const PLAY = ICON('<path d="M8 5.5v13l10-6.5Z"/>'), PAUSE = ICON('<path d="M9 5v14M15 5v14"/>');
const clock = (s: number) => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`; };
const SPEEDS = [1, 1.25, 1.5, 2];

/**
 * Media player controls. With an <audio> or <video> element inside the root it drives that element; without
 * one it keeps its own clock from data-duration (seconds), which is what the demo does. Play or pause, a
 * native range scrubber, back 15 seconds and a speed that cycles 1×, 1.25×, 1.5×, 2×.
 * Emits lt-change { playing, time, speed }.
 */
export function enhance(root: HTMLElement): Cleanup {
  const media = root.querySelector<HTMLMediaElement>('audio, video');
  const play = root.querySelector<HTMLButtonElement>('[data-part="play"]');
  const seek = root.querySelector<HTMLInputElement>('[data-part="seek"]');
  const now = root.querySelector<HTMLElement>('[data-part="now"]');
  const total = root.querySelector<HTMLElement>('[data-part="total"]');
  const speedBtn = root.querySelector<HTMLButtonElement>('[data-part="speed"]');
  const back = root.querySelector<HTMLButtonElement>('[data-part="back"]');
  if (!play || !seek) return () => {};
  let duration = Number(root.dataset.duration ?? seek.max ?? 0);
  let time = Number(seek.value), playing = false, speed = 1, tick = 0, last = 0;
  const paint = () => {
    seek.max = String(Math.round(duration)); seek.value = String(Math.round(time));
    seek.style.setProperty('--p', `${duration ? (time / duration) * 100 : 0}%`);
    seek.setAttribute('aria-valuetext', `${clock(time)} of ${clock(duration)}`);
    if (now) now.textContent = clock(time);
    if (total) total.textContent = clock(duration);
  };
  const setPlaying = (v: boolean) => {
    playing = v;
    root.toggleAttribute('data-playing', v);
    play.innerHTML = v ? PAUSE : PLAY; play.setAttribute('aria-label', v ? 'Pause' : 'Play');
    if (media) { if (v) void media.play().catch(() => setPlaying(false)); else media.pause(); }
    else { cancelAnimationFrame(tick); if (v) { last = performance.now(); tick = requestAnimationFrame(step); } }
    emit(root, { playing, time, speed });
  };
  const step = (t: number) => {
    time = Math.min(duration, time + ((t - last) / 1000) * speed); last = t;
    paint();
    if (time >= duration) { setPlaying(false); return; }
    tick = requestAnimationFrame(step);
  };
  const jump = (to: number) => { time = Math.min(duration, Math.max(0, to)); if (media) media.currentTime = time; paint(); };
  const offs: Cleanup[] = [
    on(play, 'click', () => { if (!playing && time >= duration) jump(0); setPlaying(!playing); }),
    on(seek, 'input', () => jump(Number(seek.value))),
    on(seek, 'change', () => emit(root, { playing, time, speed })),
  ];
  if (back) offs.push(on(back, 'click', () => jump(time - 15)));
  if (speedBtn) offs.push(on(speedBtn, 'click', () => {
    speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    if (media) media.playbackRate = speed;
    speedBtn.textContent = `${speed}×`; speedBtn.setAttribute('aria-label', `Speed ${speed}×`);
    emit(root, { playing, time, speed });
  }));
  if (media) offs.push(
    on(media, 'timeupdate', () => { time = media.currentTime; paint(); }),
    on(media, 'loadedmetadata', () => { if (Number.isFinite(media.duration)) { duration = media.duration; paint(); } }),
    on(media, 'ended', () => setPlaying(false)),
  );
  paint();
  return combine(...offs, () => { cancelAnimationFrame(tick); media?.pause(); });
}
