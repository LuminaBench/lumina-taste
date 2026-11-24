import type { ReactNode } from 'react';
import { cx } from '../../_shared/react';
import './optical-align.css';

/** Inline icon + text, optically aligned. `trail` for trailing arrows, `play` for media triangles. */
export function Optical({ children, trail, play, className }: { children: ReactNode; trail?: boolean; play?: boolean; className?: string }) {
  return <span className={cx('lt-optical', className)} data-trail={trail || undefined} data-shift={play ? 'play' : undefined}>{children}</span>;
}
