import { cloneElement, useId, type ReactElement, type ReactNode } from 'react';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './tooltip';
import './tooltip.css';

/** Wraps one focusable child and describes it with a tooltip. Tooltips supplement, never replace, an accessible name. */
export function Tooltip({ content, side = 'top', children, className }: { content: ReactNode; side?: 'top' | 'bottom'; children: ReactElement<{ 'aria-describedby'?: string }>; className?: string }) {
  const id = useId();
  const ref = useEnhance<HTMLSpanElement>(enhance);
  return (
    <span ref={ref} style={{ display: 'contents' }}>
      {cloneElement(children, { 'aria-describedby': id })}
      <span className={cx('lt-tooltip', className)} id={id} role="tooltip" popover="manual" data-side={side === 'bottom' ? 'bottom' : undefined}>{content}</span>
    </span>
  );
}
