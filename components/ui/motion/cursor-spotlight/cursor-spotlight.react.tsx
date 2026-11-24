import type { ReactNode } from 'react';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './cursor-spotlight';
import './cursor-spotlight.css';

export function SpotlightCard({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useEnhance<HTMLElement>(enhance);
  return <article ref={ref} className={cx('lt-spotlight', className)}>{children}</article>;
}
