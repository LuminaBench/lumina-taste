import type { ReactNode } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './back-to-top';
import './back-to-top.css';

export interface BackToTopProps { label?: string; children: ReactNode; className?: string }

/** A scroll region with a back-to-top button that shows reading progress. */
export function BackToTop({ label = 'Article', children, className }: BackToTopProps) {
  const ref = useEnhance<HTMLDivElement>(enhance);
  return (
    <div ref={ref} className={cx('lt-totop-demo', className)}>
      <div data-part="scroller" tabIndex={0} role="region" aria-label={label}>{children}</div>
      <button type="button" data-part="button" aria-label="Back to top" hidden>
        <svg data-part="ring" viewBox="0 0 44 44" aria-hidden><circle cx="22" cy="22" r="20" pathLength={100} /><circle data-part="progress" cx="22" cy="22" r="20" pathLength={100} /></svg>
        <Icon name="arrow-up" />
      </button>
    </div>
  );
}
