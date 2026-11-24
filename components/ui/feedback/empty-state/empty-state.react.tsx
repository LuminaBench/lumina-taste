import { useId, type ReactNode } from 'react';
import { Icon } from '../../_shared/Icon';
import type { IconName } from '../../_shared/icons';
import { cx } from '../../_shared/react';
import '../../controls/button/button.css';
import './empty-state.css';

export function EmptyState({ icon = 'inbox', title, body, actions, className }: { icon?: IconName; title: string; body: string; actions?: ReactNode; className?: string }) {
  const id = useId();
  return (
    <section className={cx('lt-empty', className)} aria-labelledby={id}>
      <span data-part="icon" aria-hidden="true"><Icon name={icon} size={24} /></span>
      <h3 id={id}>{title}</h3>
      <p>{body}</p>
      {actions && <div data-part="actions">{actions}</div>}
    </section>
  );
}
