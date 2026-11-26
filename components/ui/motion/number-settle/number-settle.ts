import { reducedMotion, type Cleanup } from '../../_shared/dom';

/**
 * Numbers that settle: every [data-count] element (a bare attribute) under root (or root itself) counts up to the figure already
 * written in it, once, when it is half on screen. The HTML holds the true number, so without script, under
 * reduced motion and in print the page simply shows it.
 *
 * The first number in the element's text is the one that counts ("2,400+", "£86", "4.2 km", "99.98%"); its
 * decimals and thousands separator are kept, and everything around it stays put. While it counts, the figure
 * that moves is hidden from screen readers and the true text sits beside it, visually hidden. At the end the
 * original text node is put back exactly as it was.
 *
 *   data-count-from="99"        start from this value instead of 0
 *   data-count-duration="1600"  milliseconds (default --dur-count, 1400)
 */
const NUM = /-?\d[\d,]*(?:\.\d+)?/;

interface Run { el: HTMLElement; node: Text; finish: () => void }

export function parseFigure(text: string) {
  const m = NUM.exec(text);
  if (!m) return null;
  const raw = m[0];
  const decimals = raw.includes('.') ? raw.split('.')[1].length : 0;
  return { before: text.slice(0, m.index), after: text.slice(m.index + raw.length), value: parseFloat(raw.replace(/,/g, '')), decimals, grouped: raw.includes(',') };
}

export function formatFigure(v: number, decimals: number, grouped: boolean) {
  const s = v.toFixed(decimals);
  if (!grouped) return s;
  const [i, d] = s.split('.');
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (d ? `.${d}` : '');
}

function textNodeWithNumber(el: HTMLElement): Text | null {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if (NUM.test(n.nodeValue ?? '')) return n as Text;
  return null;
}

const ease = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));

export function enhance(root: HTMLElement): Cleanup {
  // A bare attribute only: data-count="10000" means something else elsewhere (virtual-list's row count).
  const els = [...(root.matches('[data-count=""]') ? [root] : []), ...root.querySelectorAll<HTMLElement>('[data-count=""]')];
  const off = document.documentElement.dataset.motion === 'reduced';
  if (!els.length || off || reducedMotion() || !('IntersectionObserver' in window)) return () => {};
  const runs = new Set<Run>();
  const frames = new Set<number>();

  const count = (el: HTMLElement) => {
    const node = textNodeWithNumber(el);
    const fig = node && parseFigure(node.nodeValue ?? '');
    if (!node || !fig || !node.parentNode) return;
    const from = Number(el.dataset.countFrom ?? 0);
    const duration = Number(el.dataset.countDuration ?? (parseFloat(getComputedStyle(el).getPropertyValue('--dur-count')) || 1400));
    // Reserve the final width before anything changes, so the figure never pushes its neighbours.
    const w = el.getBoundingClientRect().width;
    if (getComputedStyle(el).display === 'inline') el.style.display = 'inline-block';
    el.style.minWidth = `${w}px`;
    const moving = document.createElement('span');
    moving.setAttribute('aria-hidden', 'true');
    moving.dataset.countRun = '';
    const truth = document.createElement('span');
    truth.className = 'lt-visually-hidden';
    truth.textContent = node.nodeValue;
    node.parentNode.insertBefore(moving, node);
    node.parentNode.insertBefore(truth, node);
    node.remove();
    el.dataset.counting = '';
    const show = (v: number) => (moving.textContent = fig.before + formatFigure(v, fig.decimals, fig.grouped) + fig.after);
    show(from);
    let raf = 0;
    const run: Run = {
      el, node,
      finish: () => {
        cancelAnimationFrame(raf); frames.delete(raf);
        if (moving.parentNode) moving.parentNode.replaceChild(node, moving);
        truth.remove();
        el.style.minWidth = '';
        delete el.dataset.counting;
        el.dataset.counted = '';
        runs.delete(run);
      },
    };
    runs.add(run);
    const t0 = performance.now();
    const tick = (now: number) => {
      frames.delete(raf);
      const t = Math.min(1, (now - t0) / Math.max(1, duration));
      if (t >= 1) { run.finish(); return; }
      show(from + (fig.value - from) * ease(t));
      raf = requestAnimationFrame(tick); frames.add(raf);
    };
    raf = requestAnimationFrame(tick); frames.add(raf);
  };

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { io.unobserve(e.target); count(e.target as HTMLElement); }
  }, { threshold: 0.5 });
  for (const el of els) if (!el.hasAttribute('data-counted')) io.observe(el);
  // Printing, or leaving the page half-way, always shows the true figures.
  const finishAll = () => [...runs].forEach((r) => r.finish());
  addEventListener('beforeprint', finishAll);
  return () => { io.disconnect(); finishAll(); removeEventListener('beforeprint', finishAll); };
}
