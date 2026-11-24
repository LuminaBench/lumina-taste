import { on, type Cleanup } from '../../_shared/dom';

/** Copy-to-clipboard button. Copies data-copy, or the text of data-target. Morphs to a check for 1.6s. */
export function enhance(root: HTMLElement): Cleanup {
  const text = root.querySelector<HTMLElement>('[data-part="text"]');
  const live = root.querySelector<HTMLElement>('[data-part="live"]');
  let timer = 0;
  const off = on(root, 'click', async () => {
    const value = root.dataset.copy ?? document.querySelector(root.dataset.target ?? '')?.textContent ?? '';
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard API blocked (insecure context or permissions): fall back to a hidden textarea.
      const ta = Object.assign(document.createElement('textarea'), { value, style: 'position:fixed;opacity:0' });
      document.body.append(ta);
      ta.select();
      document.execCommand?.('copy');
      ta.remove();
    }
    root.setAttribute('data-copied', '');
    if (text) text.textContent = 'Copied';
    if (live) live.textContent = 'Copied to clipboard';
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      root.removeAttribute('data-copied');
      if (text) text.textContent = 'Copy';
      if (live) live.textContent = '';
    }, 1600);
  });
  return () => { off(); clearTimeout(timer); };
}
