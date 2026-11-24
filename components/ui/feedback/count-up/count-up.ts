import { reducedMotion, type Cleanup } from '../../_shared/dom';

/** Format a number with Intl: data-format="currency|percent|number", data-compact, data-decimals, data-prefix/suffix. */
export function formatter(el: HTMLElement) {
  const decimals = el.dataset.decimals ? +el.dataset.decimals : undefined;
  const opts: Intl.NumberFormatOptions = { minimumFractionDigits: decimals, maximumFractionDigits: decimals ?? (el.hasAttribute('data-compact') ? 1 : 0) };
  if (el.dataset.format === 'currency') Object.assign(opts, { style: 'currency', currency: el.dataset.currency ?? 'USD' });
  if (el.hasAttribute('data-compact')) opts.notation = 'compact';
  const nf = new Intl.NumberFormat(el.dataset.locale ?? 'en-GB', opts);
  return (v: number) => `${el.dataset.prefix ?? ''}${nf.format(v)}${el.dataset.suffix ?? ''}`;
}

/** Count up to `value` once the element scrolls into view. Width is reserved up front, so nothing shifts. */
export function enhance(root: HTMLElement): Cleanup {
  const target = +(root.getAttribute('value') ?? root.dataset.value ?? 0);
  const fmt = formatter(root);
  const duration = +(root.dataset.duration ?? 1100);
  root.style.minWidth = `${fmt(target).length}ch`;
  root.setAttribute('aria-label', fmt(target));
  let raf = 0;
  const run = () => {
    if (reducedMotion()) { root.textContent = fmt(target); return; }
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = t === 1 ? 1 : 1 - 2 ** (-10 * t);
      root.textContent = fmt(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { io.disconnect(); run(); } }, { threshold: 0.4 });
  io.observe(root);
  return () => { io.disconnect(); cancelAnimationFrame(raf); };
}
