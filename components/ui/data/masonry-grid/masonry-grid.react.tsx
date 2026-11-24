import type { ReactNode } from 'react';
import { cx } from '../../_shared/react';
import './masonry-grid.css';

/** Masonry layout with CSS columns. Children keep their DOM order (top to bottom, then next column). */
export function MasonryGrid({ label, children, className }: { label: string; children: ReactNode[]; className?: string }) {
  return <ul className={cx('lt-masonry', className)} aria-label={label}>{children.map((c, i) => <li key={i}>{c}</li>)}</ul>;
}
