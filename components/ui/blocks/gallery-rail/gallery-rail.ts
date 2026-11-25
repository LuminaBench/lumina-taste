import type { Cleanup } from '../../_shared/dom';

/** Previous and next buttons move the rail one picture at a time and are disabled at either end. */
export function enhance(root: HTMLElement): Cleanup {
  const track = root.querySelector<HTMLElement>('[data-part="track"]');
  const prev = root.querySelector<HTMLButtonElement>('[data-part="prev"]');
  const next = root.querySelector<HTMLButtonElement>('[data-part="next"]');
  if (!track || !prev || !next) return () => {};
  const step = () => (track.firstElementChild as HTMLElement | null)?.getBoundingClientRect().width ?? 300;
  const gap = () => parseFloat(getComputedStyle(track).columnGap) || 16;
  const sync = () => { prev.disabled = track.scrollLeft <= 2; next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2; };
  const go = (dir: number) => track.scrollBy({ left: dir * (step() + gap()), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  const onPrev = () => go(-1), onNext = () => go(1);
  prev.addEventListener('click', onPrev); next.addEventListener('click', onNext);
  track.addEventListener('scroll', sync, { passive: true });
  const ro = new ResizeObserver(sync); ro.observe(track);
  sync();
  return () => { prev.removeEventListener('click', onPrev); next.removeEventListener('click', onNext); track.removeEventListener('scroll', sync); ro.disconnect(); };
}
