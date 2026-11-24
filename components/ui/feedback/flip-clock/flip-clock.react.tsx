import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './flip-clock';
import './flip-clock.css';

export function FlipClock({ seconds, label = 'Time remaining', className }: { seconds: number; label?: string; className?: string }) {
  const ref = useEnhance<HTMLDivElement>(enhance, undefined, [seconds]);
  return (
    <div ref={ref} className={cx('lt-flip', className)} data-countdown={seconds} role="timer" aria-label={label}>
      {(['h', 'm', 's'] as const).map((u, i) => [
        i > 0 ? <span key={`${u}c`} data-part="colon" aria-hidden="true">:</span> : null,
        <div key={u} data-part="group"><span data-part="digits" data-unit={u} /><span data-part="unit">{{ h: 'Hours', m: 'Minutes', s: 'Seconds' }[u]}</span></div>,
      ])}
      <span data-part="sr" className="lt-visually-hidden" />
    </div>
  );
}
