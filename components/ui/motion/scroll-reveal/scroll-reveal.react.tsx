import type { ReactNode } from 'react';
import { useEnhance } from '../../_shared/react';
import { enhance } from './scroll-reveal';
import './scroll-reveal.css';

/** Wrap a region; every child with className="lt-reveal" fades up once on first view. */
export function ScrollReveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useEnhance<HTMLDivElement>(enhance);
  return <div ref={ref} className={className}>{children}</div>;
}
