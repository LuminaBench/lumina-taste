import { cx } from '../../_shared/react';
import './usage-meters.css';

export interface Usage { label: string; used: string; limit: string; percent: number; href?: string }

/** Plan usage: one labelled bar per limit; turns amber at 90% with a way to add capacity. */
export function UsageMeters({ title = 'Usage this month', resets, items, upgradeHref = '#upgrade', className }: { title?: string; resets?: string; items: Usage[]; upgradeHref?: string; className?: string }) {
  return (
    <section className={cx('lt-usage', className)} aria-label={title}>
      <header><h3>{title}</h3>{resets && <p>{resets}</p>}</header>
      <ul>{items.map((u) => <li key={u.label} data-level={u.percent >= 90 ? 'warn' : 'ok'}><p><strong>{u.label}</strong><span><b>{u.used}</b> of {u.limit}</span></p><span data-part="bar" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={u.percent} aria-label={`${u.label}: ${u.used} of ${u.limit}`}><i style={{ width: `${u.percent}%` }} /></span>{u.percent >= 90 && <p data-part="note">Almost at your limit. <a href={upgradeHref}>Add capacity</a></p>}</li>)}</ul>
    </section>
  );
}
