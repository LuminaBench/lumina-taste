import { reducedMotion, type Cleanup } from '../../_shared/dom';

/** Wraps each word of the statement's heading in <span data-w> with its own slice of the scroll, so the
 *  words brighten one after another as the section crosses the screen. Text and reading order are unchanged. */
export function enhance(root: HTMLElement): Cleanup {
  const h = root.querySelector<HTMLElement>('h2, h1');
  if (!h || reducedMotion() || !CSS.supports('animation-timeline: view()') || h.querySelector('[data-w]')) return () => {};
  const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if ((n.textContent ?? '').trim()) nodes.push(n as Text);
  const total = nodes.reduce((s, n) => s + (n.textContent ?? '').trim().split(/\s+/).length, 0);
  let i = 0;
  for (const n of nodes) {
    const frag = document.createDocumentFragment();
    for (const part of (n.textContent ?? '').split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) { frag.append(part); continue; }
      const s = document.createElement('span');
      s.dataset.w = '';
      s.textContent = part;
      // The sentence lights between 25% and 60% of the section's pass across the screen.
      const a = 25 + (i / total) * 35, b = a + 35 / total + 4;
      s.style.setProperty('animation-range', `cover ${a.toFixed(1)}% cover ${b.toFixed(1)}%`);
      frag.append(s); i++;
    }
    n.replaceWith(frag);
  }
  return () => {};
}
