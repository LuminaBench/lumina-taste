import { Icon } from '../../_shared/Icon';
import { cx } from '../../_shared/react';
import './doc-pager.css';

export interface PagerLink { title: string; href: string }

/** Previous / next links for docs and guides: each names the page it goes to. */
export function DocPager({ prev, next, className }: { prev?: PagerLink; next?: PagerLink; className?: string }) {
  return (
    <nav className={cx('lt-doc-pager', className)} aria-label="Previous and next page">
      {prev && <a href={prev.href} rel="prev"><span data-part="dir"><Icon name="chevron-left" size={14} />Previous</span><strong>{prev.title}</strong></a>}
      {next && <a href={next.href} rel="next"><span data-part="dir">Next<Icon name="chevron-right" size={14} /></span><strong>{next.title}</strong></a>}
    </nav>
  );
}
