import type { ReactNode } from 'react';
import { cx } from '../../_shared/react';
import './text-shimmer.css';

/** Loading text with a light sweeping across it. Static under reduced motion. */
export function TextShimmer({ children, size, className }: { children: ReactNode; size?: 'lg'; className?: string }) {
  return <p className={cx('lt-shimmer', className)} data-size={size} role="status">{children}</p>;
}
