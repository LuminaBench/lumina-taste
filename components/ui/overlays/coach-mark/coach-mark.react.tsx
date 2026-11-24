import type { ReactNode } from 'react';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './coach-mark';
import '../../controls/button/button.css';
import './coach-mark.css';

/**
 * Product tour. Mark targets inside `children` with data-tour="1" data-title="…" data-body="…".
 * `startLabel` renders the button that begins the tour.
 */
export function CoachMarkTour({ children, startLabel = 'Start the tour', onFinish, className }: { children: ReactNode; startLabel?: string; onFinish?: (d: { completed: boolean; step: number }) => void; className?: string }) {
  const ref = useEnhance<HTMLDivElement, { completed: boolean; step: number }>(enhance, onFinish);
  return (
    <div ref={ref} className={cx('lt-tour-demo', className)}>
      {children}
      <button type="button" className="lt-btn" data-variant="primary" data-part="start"><span data-part="label">{startLabel}</span></button>
      <div className="lt-tour" data-part="layer" hidden>
        <div data-part="spot" aria-hidden="true" />
        <div data-part="card" role="dialog" aria-modal="true" aria-label="Product tour">
          <p data-part="step" /><h3 /><p />
          <div data-part="nav">
            <button type="button" className="lt-btn" data-variant="ghost" data-size="sm" data-part="skip"><span data-part="label">Skip tour</span></button>
            <span>
              <button type="button" className="lt-btn" data-variant="secondary" data-size="sm" data-part="back"><span data-part="label">Back</span></button>
              <button type="button" className="lt-btn" data-variant="primary" data-size="sm" data-part="next"><span data-part="label">Next</span></button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
