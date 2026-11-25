import type { ReactNode } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './backdrop-circuit';
import './backdrop-circuit.css';

/** A section with a grid and animated circuit traces at its sides; the centre stays clear for the headline. */
export function CircuitBackdrop({ seed = 7, traces = 6, className, children }: { seed?: number; traces?: number; className?: string; children: ReactNode }) {
  const ref = useEnhance<HTMLDivElement>(enhance);
  return (
    <section className={cx(className)} data-backdrop="grid">
      <div ref={ref} className="lt-circuit" data-seed={seed} data-traces={traces}><button type="button" data-part="pause" aria-pressed="false" aria-label="Pause background animation"><Icon name="pause" size={14} /></button></div>
      {children}
    </section>
  );
}
