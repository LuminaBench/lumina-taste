import type { CSSProperties } from 'react';
import { cx } from '../../_shared/react';
import './avatar-stack.css';

export function AvatarStack({ people, max = 4, className }: { people: string[]; max?: number; className?: string }) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  const initials = (n: string) => n.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  return (
    <ul className={cx('lt-avatars', className)} aria-label={`${people.length} people`}>
      {shown.map((p, i) => <li key={p} title={p} style={{ '--c': `var(--chart-${(i % 8) + 1})` } as CSSProperties}>{initials(p)}</li>)}
      {rest > 0 && <li data-part="more" aria-label={`and ${rest} more`}>+{rest}</li>}
    </ul>
  );
}
