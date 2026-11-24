import { Icon } from '../../_shared/Icon';
import { cx } from '../../_shared/react';
import './stat-strip.css';

/** `good` says whether the delta direction is good news (churn up = bad). */
export function StatStrip({ stats, className }: { stats: Array<{ label: string; value: number; display: string; delta?: string; direction?: 'up' | 'down' | 'flat'; good?: boolean }>; className?: string }) {
  return (
    <dl className={cx('lt-stat-strip', className)}>
      {stats.map((s) => (
        <div key={s.label}>
          <dt>{s.label}</dt>
          <dd>
            <data value={s.value}>{s.display}</data>
            {s.delta && (
              <span data-tone={s.direction === 'flat' ? 'neutral' : s.good ? 'positive' : 'negative'}>
                {s.direction !== 'flat' && <Icon name={s.direction === 'down' ? 'arrow-down' : 'arrow-up'} size={12} />}{s.delta}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
