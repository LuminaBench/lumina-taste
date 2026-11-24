import type { ReactNode } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './banner';
import './banner.css';

export function Banner({ children, persistKey, label = 'Announcement', className }: { children: ReactNode; persistKey?: string; label?: string; className?: string }) {
  const ref = useEnhance<HTMLDivElement>(enhance);
  return (
    <div ref={ref} className={cx('lt-banner', className)} role="region" aria-label={label} data-persist={persistKey}>
      <p>{children}</p>
      <button type="button" data-part="close" aria-label="Dismiss announcement"><Icon name="x" /></button>
    </div>
  );
}
