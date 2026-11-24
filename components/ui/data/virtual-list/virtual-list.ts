import { combine, emit, on, type Cleanup } from '../../_shared/dom';

const EVENTS = ['Deploy started', 'Build cached', 'Health check passed', 'Webhook delivered', 'Token refreshed', 'Queue drained', 'Retry scheduled', 'Cache miss on /api/report'];

/** Default demo row renderer: deterministic fake log lines. Pass your own via virtualize(). */
export function demoRow(i: number) {
  const level = i % 41 === 0 ? 'error' : i % 13 === 0 ? 'warn' : 'info';
  const s = (i * 7) % 60, m = Math.floor(i / 60) % 60;
  return { level, html: `<span>#${String(i + 1).padStart(5, '0')}</span><span>${EVENTS[(i * 5) % EVENTS.length]}</span><span>12:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}</span>` };
}

/**
 * Windowed list: renders only visible rows (+ overscan) inside a full-height spacer, so 10,000+ rows
 * scroll at 60 fps. Keyboard: ↑/↓/PageUp/PageDown/Home/End move the active row (aria-activedescendant).
 */
export function virtualize(root: HTMLElement, count: number, rowHeight: number, render: (i: number) => { level?: string; html: string }): Cleanup {
  const spacer = root.querySelector<HTMLElement>('[data-part="spacer"]')!;
  const win = root.querySelector<HTMLElement>('[data-part="window"]')!;
  root.style.setProperty('--row-h', `${rowHeight}px`);
  spacer.style.height = `${count * rowHeight}px`;
  const uid = root.id || (root.id = `lt-vl-${Math.random().toString(36).slice(2, 7)}`);
  let active = 0;
  let raf = 0;
  const draw = () => {
    const overscan = 6;
    const first = Math.max(0, Math.floor(root.scrollTop / rowHeight) - overscan);
    const last = Math.min(count, Math.ceil((root.scrollTop + root.clientHeight) / rowHeight) + overscan);
    win.style.transform = `translateY(${first * rowHeight}px)`;
    let html = '';
    for (let i = first; i < last; i++) {
      const r = render(i);
      html += `<div role="option" id="${uid}-${i}" aria-selected="${i === active}" aria-posinset="${i + 1}" aria-setsize="${count}" data-level="${r.level ?? ''}">${r.html}</div>`;
    }
    win.innerHTML = html;
  };
  const go = (i: number) => {
    active = Math.max(0, Math.min(count - 1, i));
    const top = active * rowHeight;
    if (top < root.scrollTop) root.scrollTop = top;
    else if (top + rowHeight > root.scrollTop + root.clientHeight) root.scrollTop = top + rowHeight - root.clientHeight;
    draw();
    root.setAttribute('aria-activedescendant', `${uid}-${active}`);
    emit(root, { index: active });
  };
  draw();
  const page = () => Math.floor(root.clientHeight / rowHeight);
  return combine(
    on(root, 'scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); }, { passive: true }),
    on(root, 'keydown', (e: KeyboardEvent) => {
      const m: Record<string, number> = { ArrowDown: 1, ArrowUp: -1, PageDown: page(), PageUp: -page(), Home: -Infinity, End: Infinity };
      if (!(e.key in m)) return;
      e.preventDefault();
      go(Number.isFinite(m[e.key]) ? active + m[e.key] : m[e.key] < 0 ? 0 : count - 1);
    }),
    on(root, 'click', (e: MouseEvent) => { const o = (e.target as Element).closest<HTMLElement>('[role="option"]'); if (o) go(+o.getAttribute('aria-posinset')! - 1); }),
    () => cancelAnimationFrame(raf),
  );
}

export function enhance(root: HTMLElement): Cleanup {
  return virtualize(root, +(root.dataset.count ?? 1000), +(root.dataset.rowHeight ?? 36), demoRow);
}
