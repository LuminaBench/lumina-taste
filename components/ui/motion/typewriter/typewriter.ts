import { combine, on, part, reducedMotion, type Cleanup } from '../../_shared/dom';

/**
 * Rotating word that types and deletes itself. Screen readers get the full sentence once (the moving
 * text is aria-hidden). Pauses on hover and focus, and when the tab is hidden; under reduced motion
 * the words swap without typing.
 */
export function enhance(root: HTMLElement): Cleanup {
  const words = (root.dataset.words ?? '').split('|').filter(Boolean);
  const word = part(root, 'word')!;
  if (words.length < 2) return () => {};
  let wi = 0, ci = words[0].length, deleting = true, timer = 0, paused = false;
  const tick = () => {
    if (paused || document.hidden) { timer = window.setTimeout(tick, 300); return; }
    if (reducedMotion()) { wi = (wi + 1) % words.length; word.textContent = words[wi]; timer = window.setTimeout(tick, 2600); return; }
    const w = words[wi];
    root.setAttribute('data-typing', '');
    if (deleting) {
      ci--;
      word.textContent = w.slice(0, ci);
      if (ci <= 0) { deleting = false; wi = (wi + 1) % words.length; }
      timer = window.setTimeout(tick, 38);
    } else {
      const next = words[wi];
      ci++;
      word.textContent = next.slice(0, ci);
      if (ci >= next.length) { deleting = true; root.removeAttribute('data-typing'); timer = window.setTimeout(tick, 2000); }
      else timer = window.setTimeout(tick, 70 + Math.random() * 40);
    }
  };
  timer = window.setTimeout(tick, 2000);
  const pause = () => (paused = true), resume = () => (paused = false);
  return combine(on(root, 'pointerenter', pause), on(root, 'pointerleave', resume), on(root, 'focusin', pause), on(root, 'focusout', resume), () => clearTimeout(timer));
}
