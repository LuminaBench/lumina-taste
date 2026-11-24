import { Icon } from '../../_shared/Icon';
import type { IconName } from '../../_shared/icons';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './magnify-dock';
import './magnify-dock.css';

export function MagnifyDock({ items, magnify = 1.6, label = 'Apps', className }: { items: Array<{ label: string; href: string; icon: IconName; divider?: boolean }>; magnify?: number; label?: string; className?: string }) {
  const ref = useEnhance<HTMLElement>(enhance);
  return (
    <nav ref={ref} className={cx('lt-dock', className)} aria-label={label} data-magnify={magnify}>
      {items.map((it) => [
        it.divider ? <span key={`${it.href}d`} data-part="divider" aria-hidden="true" /> : null,
        <a key={it.href} href={it.href} aria-label={it.label} data-tip={it.label}><Icon name={it.icon} size={22} /></a>,
      ])}
    </nav>
  );
}
