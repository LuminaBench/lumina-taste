import type { ReactNode } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx } from '../../_shared/react';
import './row-list.css';

export interface Row { label: string; href?: string; icon?: ReactNode; value?: string; count?: number; tone?: 'danger'; onSelect?: () => void }

/** Grouped navigation rows for a settings or account home: icon, label, current value, chevron. */
export function RowList({ label, groups, className }: { label: string; groups: Array<{ title?: string; rows: Row[] }>; className?: string }) {
  const list = (rows: Row[]) => (
    <ul>
      {rows.map((r) => {
        const inner = <><span data-part="icon">{r.icon}</span><span data-part="label">{r.label}</span>{r.count ? <span data-part="count">{r.count}</span> : r.value && <span data-part="value">{r.value}</span>}</>;
        return <li key={r.label}>{r.href ? <a href={r.href} data-tone={r.tone}>{inner}<Icon name="chevron-right" size={16} /></a> : <button type="button" data-tone={r.tone} onClick={r.onSelect}>{inner}</button>}</li>;
      })}
    </ul>
  );
  return (
    <nav className={cx('lt-rows', className)} aria-label={label}>
      {groups.map((g, i) => (g.title ? <section key={g.title} aria-label={g.title}><h3>{g.title}</h3>{list(g.rows)}</section> : <div key={i}>{list(g.rows)}</div>))}
    </nav>
  );
}
