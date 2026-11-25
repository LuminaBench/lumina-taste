import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './reading-progress';
import './reading-progress.css';

/** A thin bar that fills as the page, or the scrolling panel it sits in, is read. target="#article" measures one element. */
export function ReadingProgress({ target, className }: { target?: string; className?: string }) {
  const ref = useEnhance<HTMLDivElement>(enhance, undefined, [target]);
  return <div ref={ref} className={cx('lt-reading', className)} data-target={target} aria-hidden><span data-part="bar" /></div>;
}
