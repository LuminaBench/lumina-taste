import { Fragment } from 'react';
import { Icon } from '../../_shared/Icon';
import { cx } from '../../_shared/react';
import '../../feedback/badge/badge.css';
import './comparison-table.css';

type Cell = string | boolean;
export function ComparisonTable({ caption, plans, featured, groups, className }: { caption: string; plans: string[]; featured?: string; groups: Array<{ title: string; rows: Array<{ label: string; values: Cell[] }> }>; className?: string }) {
  const cell = (v: Cell) => (typeof v === 'boolean'
    ? <span data-yes={v || undefined} data-no={!v || undefined}><Icon name={v ? 'check' : 'minus'} /><span className="lt-visually-hidden">{v ? 'Included' : 'Not included'}</span></span>
    : v);
  return (
    <div className="lt-compare-wrap" tabIndex={0} role="region" aria-label={caption}>
      <table className={cx('lt-compare', className)}>
        <caption className="lt-visually-hidden">{caption}</caption>
        <thead><tr><td />{plans.map((p) => <th key={p} scope="col" data-featured={p === featured || undefined}>{p}{p === featured && <span className="lt-badge" data-tone="accent">Popular</span>}</th>)}</tr></thead>
        <tbody>
          {groups.map((g) => (
            <Fragment key={g.title}>
              <tr data-group><th scope="rowgroup" colSpan={plans.length + 1}>{g.title}</th></tr>
              {g.rows.map((r) => <tr key={r.label}><th scope="row">{r.label}</th>{r.values.map((v, i) => <td key={i} data-featured={plans[i] === featured || undefined}>{cell(v)}</td>)}</tr>)}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
