import { reducedMotion, type Cleanup } from '../../_shared/dom';

type Conn = { saveData?: boolean };

/** True when the visitor asked for less data (Save-Data or prefers-reduced-data). */
export const saveData = () => !!(navigator as Navigator & { connection?: Conn }).connection?.saveData || matchMedia('(prefers-reduced-data: reduce)').matches;

/**
 * Hero video. With a film source (data-src on the <video> or its <source>s) it shows the pause/play button,
 * and plays the film muted, looped and inline when motion is allowed, Save-Data is off and the hero is on
 * screen. The file is only fetched then (preload="none" until it plays). The still stays underneath until the
 * film is actually playing, so nothing shifts. Leaving the screen pauses it; coming back resumes it unless the
 * visitor paused it. Without a source the hero is simply the still (data-state="poster").
 * data-state: poster | paused | playing; data-started once the first frame has played.
 */
export function enhance(root: HTMLElement): Cleanup {
  const video = root.querySelector<HTMLVideoElement>('[data-part="video"]');
  const button = root.querySelector<HTMLButtonElement>('[data-part="toggle"]');
  const sources = video ? [...video.querySelectorAll<HTMLSourceElement>('source[data-src]')].filter((s) => s.dataset.src) : [];
  const own = video?.dataset.src ?? '';
  if (!video || !button || (!sources.length && !own && !video.getAttribute('src'))) {
    root.dataset.state = 'poster';
    video?.setAttribute('hidden', '');
    button?.setAttribute('hidden', '');
    return () => {};
  }
  Object.assign(video, { muted: true, loop: true, playsInline: true });
  video.removeAttribute('hidden');
  button.removeAttribute('hidden');
  let loaded = !!video.getAttribute('src');
  let userPaused = false;
  let onScreen = false;
  const allowed = () => !reducedMotion() && !saveData() && document.documentElement.dataset.motion !== 'reduced';
  const set = (state: 'paused' | 'playing') => {
    root.dataset.state = state;
    button.setAttribute('aria-label', state === 'playing' ? 'Pause the film' : 'Play the film');
  };
  const load = () => {
    if (loaded) return;
    loaded = true;
    if (own) video.src = own;
    sources.forEach((s) => (s.src = s.dataset.src!));
    video.load();
  };
  const play = () => { load(); video.play().catch(() => set('paused')); };
  const onPlaying = () => { root.setAttribute('data-started', ''); set('playing'); };
  const onPause = () => set('paused');
  const onClick = () => {
    if (video.paused) { userPaused = false; play(); } else { userPaused = true; video.pause(); }
  };
  video.addEventListener('playing', onPlaying);
  video.addEventListener('pause', onPause);
  button.addEventListener('click', onClick);
  set('paused');
  const io = new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (!onScreen) { if (!video.paused) video.pause(); return; }
    if (!userPaused && allowed() && video.paused) play();
  }, { threshold: 0.25 });
  io.observe(root);
  return () => {
    io.disconnect();
    video.pause();
    video.removeEventListener('playing', onPlaying);
    video.removeEventListener('pause', onPause);
    button.removeEventListener('click', onClick);
  };
}
