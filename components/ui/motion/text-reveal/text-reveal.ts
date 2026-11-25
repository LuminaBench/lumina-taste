import { combine, on, reducedMotion, type Cleanup } from '../../_shared/dom';

/**
 * Text reveal: splits the element's text into words and lets them rise in, 45ms apart, the first time the
 * element is on screen. Inline markup (<em>, <a>) is kept. Tune with --reveal-dur and --reveal-gap.
 * A [data-replay-reveal] button next to it plays it again (for demos).
 */
export function enhance(root: HTMLElement): Cleanup {
  if (reducedMotion()) return () => {};
  const original = root.innerHTML;
  let i = 0;
  const split = (node: Node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        for (const piece of (child.textContent ?? '').split(/(\s+)/)) {
          if (!piece) continue;
          if (/^\s+$/.test(piece)) { frag.append(' '); continue; }
          const w = document.createElement('span');
          w.setAttribute('data-w', ''); w.style.setProperty('--i', String(i++)); w.textContent = piece;
          frag.append(w);
        }
        child.replaceWith(frag);
      } else if (child.nodeType === 1) split(child);
    }
  };
  split(root);
  const show = () => requestAnimationFrame(() => requestAnimationFrame(() => root.setAttribute('data-in', '')));
  const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { io.disconnect(); show(); } }, { threshold: 0.2 });
  io.observe(root);
  const again = root.parentElement?.querySelector<HTMLElement>('[data-replay-reveal]');
  const off = again ? on(again, 'click', () => { root.removeAttribute('data-in'); void root.offsetWidth; show(); }) : () => {};
  return combine(off, () => { io.disconnect(); root.innerHTML = original; root.removeAttribute('data-in'); });
}
