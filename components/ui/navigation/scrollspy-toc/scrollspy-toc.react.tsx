import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './scrollspy-toc';
import './scrollspy-toc.css';

/** "On this page" rail. `items` reference heading ids on the page. Pass `scroller` (a CSS selector) for a scrolling container. */
export function ScrollspyToc({ items, title = 'On this page', scroller, className }: { items: Array<{ id: string; label: string }>; title?: string; scroller?: string; className?: string }) {
  const ref = useEnhance<HTMLElement>(enhance, undefined, [items.map((i) => i.id).join()]);
  return (
    <nav ref={ref} className={cx('lt-toc', className)} aria-label={title} data-scroller={scroller}>
      <p data-part="title">{title}</p>
      <span data-part="marker" aria-hidden="true" />
      <ol>{items.map((i) => <li key={i.id}><a href={`#${i.id}`}>{i.label}</a></li>)}</ol>
    </nav>
  );
}
