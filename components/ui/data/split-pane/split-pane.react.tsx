import type { CSSProperties, ReactNode } from 'react';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './split-pane';
import './split-pane.css';

export function SplitPane({ left, right, leftLabel, rightLabel, initial = 50, min = 20, max = 80, onResize, className }: { left: ReactNode; right: ReactNode; leftLabel: string; rightLabel: string; initial?: number; min?: number; max?: number; onResize?: (pct: number) => void; className?: string }) {
  const ref = useEnhance<HTMLDivElement, { split: number }>(enhance, (d) => onResize?.(d.split));
  return (
    <div ref={ref} className={cx('lt-split-pane', className)} style={{ '--split': `${initial}%` } as CSSProperties}>
      <section data-part="pane" aria-label={leftLabel}>{left}</section>
      <div data-part="grip" role="separator" aria-orientation="vertical" aria-label="Resize panes" aria-valuemin={min} aria-valuemax={max} aria-valuenow={initial} tabIndex={0}><span /></div>
      <section data-part="pane" aria-label={rightLabel}>{right}</section>
    </div>
  );
}
