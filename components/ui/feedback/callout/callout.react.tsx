import type { ReactNode } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx } from '../../_shared/react';
import './callout.css';

const ICONS = { info: 'info', positive: 'check-circle', warning: 'alert', negative: 'x-circle' } as const;

export function Callout({ tone = 'info', title, children, className }: { tone?: keyof typeof ICONS; title?: string; children: ReactNode; className?: string }) {
  return (
    <aside className={cx('lt-callout', className)} data-tone={tone} role="note">
      <span data-part="icon"><Icon name={ICONS[tone]} size={18} /></span>
      <div>{title && <strong>{title}</strong>}<p>{children}</p></div>
    </aside>
  );
}
