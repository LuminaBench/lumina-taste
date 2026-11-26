import type { ElementType, ReactNode } from 'react';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './number-settle';
import './number-settle.css';

/**
 * <CountFigure>2,400</CountFigure>: the figure counts up to itself once when it reaches the screen. The true
 * number is what you render, so server output, reduced motion and print all show it.
 */
export function CountFigure({ as: Tag = 'span', from, duration, className, children }: { as?: ElementType; from?: number; duration?: number; className?: string; children: ReactNode }) {
  const ref = useEnhance<HTMLElement>(enhance, undefined, [String(children)]);
  return <Tag ref={ref} className={cx(className)} data-count="" data-count-from={from} data-count-duration={duration}>{children}</Tag>;
}

/** Wrap any region: every element inside it with data-count="" counts once on first view. */
export function NumberSettle({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useEnhance<HTMLDivElement>(enhance);
  return <div ref={ref} className={className}>{children}</div>;
}
