import type { ReactNode } from 'react';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './backdrop-dither';

/** A section with a pixel-dither field behind its children. */
export function DitherBackdrop({ from = 'top', cell = 5, reach = 0.5, className, children }: { from?: 'top' | 'bottom' | 'left' | 'right'; cell?: number; reach?: number; className?: string; children: ReactNode }) {
  const ref = useEnhance<HTMLDivElement>(enhance);
  return (
    <section className={cx(className)} data-backdrop="dither">
      <div ref={ref} className="lt-dither" aria-hidden data-from={from} data-cell={cell} data-reach={reach}><canvas /></div>
      {children}
    </section>
  );
}
