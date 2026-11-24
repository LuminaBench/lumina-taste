import type { ReactNode } from 'react';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './hide-on-scroll-header';
import './hide-on-scroll-header.css';

/** Sticky header that hides on scroll down and returns on scroll up. Scrolls with the window by default. */
export function HideOnScrollHeader({ children, threshold = 8, className }: { children: ReactNode; threshold?: number; className?: string }) {
  const ref = useEnhance<HTMLElement>(enhance);
  return <header ref={ref} className={cx('lt-autohide', className)} data-threshold={threshold}>{children}</header>;
}
