import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './pane-resizer';
import './pane-resizer.css';

/**
 * The draggable edge between two panes. It sets `cssVar` (px) on its parent, or on `target` (a selector), so
 * size the pane with that variable in CSS. `edge="end"` for a pane after the edge (an inspector), `"start"` for one before it.
 */
export function PaneResizer({ label, controls, cssVar, min, max, initial, edge = 'end', orientation = 'vertical', persist, target, onResize, className }: { label: string; controls: string; cssVar: string; min: number; max: number; initial: number; edge?: 'start' | 'end'; orientation?: 'vertical' | 'horizontal'; persist?: string; target?: string; onResize?: (px: number) => void; className?: string }) {
  const ref = useEnhance<HTMLDivElement, { size: number }>(enhance, (d) => onResize?.(d.size), [cssVar, min, max, initial, edge, orientation, persist, target]);
  return (
    <div ref={ref} className={cx('lt-resizer', className)} role="separator" tabIndex={0} aria-orientation={orientation} aria-label={label} aria-controls={controls}
      aria-valuemin={min} aria-valuemax={max} aria-valuenow={initial} data-var={cssVar} data-edge={edge} data-persist={persist} data-target={target}><span data-part="grip" /></div>
  );
}
