import { combine, on, reducedMotion, type Cleanup } from '../../_shared/dom';

/**
 * Terminal window: plays its lines once when it scrolls into view. Commands (data-kind="cmd") are typed,
 * output (data-kind="out") appears a line at a time. The full text is in the markup from the start, so it
 * works without script, under reduced motion (shown complete) and for search engines.
 * Options: data-speed (ms per character, 26), data-static (never animate).
 */
export function enhance(root: HTMLElement): Cleanup {
  const lines = [...root.querySelectorAll<HTMLElement>('[data-part="screen"] > p')];
  const replay = root.querySelector<HTMLButtonElement>('[data-part="replay"]');
  const full = lines.map((p) => p.textContent ?? '');
  const speed = Number(root.dataset.speed ?? 26);
  let timers: number[] = [];
  const wait = (ms: number) => new Promise<void>((r) => { timers.push(window.setTimeout(r, ms)); });
  const reset = () => { timers.forEach(clearTimeout); timers = []; lines.forEach((p, i) => { p.textContent = full[i]; p.removeAttribute('data-pending'); }); root.removeAttribute('data-playing'); };
  let run = 0;
  const play = async () => {
    reset();
    if (reducedMotion() || root.hasAttribute('data-static') || !lines.length) return;
    const me = ++run;
    root.setAttribute('data-playing', '');
    lines.forEach((p) => p.setAttribute('data-pending', ''));
    for (let i = 0; i < lines.length; i++) {
      const p = lines[i];
      if (p.dataset.kind === 'cmd') {
        // Typed part, caret, and the untyped rest kept invisible so the line never reflows.
        p.innerHTML = '<span data-part="typed"></span><span data-part="caret"></span><span data-part="rest"></span>';
        const typed = p.firstElementChild!, rest = p.lastElementChild!;
        rest.textContent = full[i];
        p.removeAttribute('data-pending');
        await wait(420);
        for (let c = 1; c <= full[i].length; c++) {
          if (me !== run) return;
          typed.textContent = full[i].slice(0, c); rest.textContent = full[i].slice(c);
          await wait(speed + (full[i][c - 1] === ' ' ? 40 : 0));
        }
        await wait(360);
        if (me !== run) return;
        p.textContent = full[i];
      } else {
        await wait(240);
        if (me !== run) return;
        p.removeAttribute('data-pending');
      }
    }
    root.removeAttribute('data-playing');
  };
  const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { io.disconnect(); void play(); } }, { threshold: 0.4 });
  io.observe(root);
  return combine(replay ? on(replay, 'click', () => void play()) : () => {}, () => { io.disconnect(); run++; reset(); });
}
