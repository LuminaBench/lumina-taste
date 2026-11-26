import type { CSSProperties } from 'react';
import { cx } from '../../_shared/react';
import './activity-rings.css';

export interface Ring { label: string; value: number; goal: number; unit: string }
export interface ActivityRingsProps {
  /** One to three goals; the first is the accent ring. */
  rings: Ring[];
  /** The figure in the middle and what it counts ("72%", "of today"). */
  centre?: { value: string; label: string };
  /** Dial size in CSS px (default 240). */
  size?: number; className?: string;
}

const R = [52, 39, 26];

/** Today's goals as concentric rings, with the true numbers beside them. */
export function ActivityRings({ rings, centre, size, className }: ActivityRingsProps) {
  const style = Object.fromEntries(rings.slice(0, 3).map((r, i) => [`--r${i + 1}`, Math.max(0, r.value / r.goal)])) as CSSProperties;
  if (size) (style as Record<string, string>)['--rings-size'] = `${size}px`;
  return (
    <figure className={cx('lt-rings', className)} style={style}>
      <div data-part="dial">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          {rings.slice(0, 3).map((_, i) => [<circle key={`t${i}`} data-part="track" data-n={i + 1} cx="60" cy="60" r={R[i]} pathLength={100} />, <circle key={`a${i}`} data-part="arc" data-n={i + 1} cx="60" cy="60" r={R[i]} pathLength={100} />])}
        </svg>
        {centre && <p data-part="centre"><b>{centre.value}</b><span>{centre.label}</span></p>}
      </div>
      <figcaption>
        <dl data-part="legend">
          {rings.slice(0, 3).map((r, i) => <div key={r.label} data-n={i + 1}><dt>{r.label}</dt><dd><b>{r.value.toLocaleString('en-GB')}</b> / {r.goal.toLocaleString('en-GB')} {r.unit}</dd></div>)}
        </dl>
      </figcaption>
    </figure>
  );
}
