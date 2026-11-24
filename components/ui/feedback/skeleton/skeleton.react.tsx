import type { CSSProperties } from 'react';
import { cx } from '../../_shared/react';
import './skeleton.css';

/** Wrap a group of skeletons in an element with aria-busy="true" and an aria-label describing what is loading. */
export function Skeleton({ shape, width, className }: { shape?: 'circle' | 'block'; width?: string; className?: string }) {
  return <span className={cx('lt-skeleton', className)} data-shape={shape} style={width ? ({ width } as CSSProperties) : undefined} aria-hidden="true" />;
}
