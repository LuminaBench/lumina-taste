import type { ReactNode } from 'react';
import { Icon } from '../../_shared/Icon';
import type { IconName } from '../../_shared/icons';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './bulk-action-bar';
import '../../controls/checkbox/checkbox.css';
import './bulk-action-bar.css';

const Box = () => (
  <span data-part="box" aria-hidden="true"><svg viewBox="0 0 16 16"><path data-part="tick" d="m3.5 8.5 3 3 6-7" /><path data-part="dash" d="M4 8h8" /></svg></span>
);

export interface BulkTableProps<R> { caption: string; columns: Array<{ label: string; numeric?: boolean; render: (r: R) => ReactNode }>; rows: R[]; rowLabel: (r: R) => string; actions: Array<{ id: string; label: string; icon: IconName; danger?: boolean }>; onAction?: (d: { action: string; rows: string[] }) => void; className?: string }

export function BulkActionTable<R>({ caption, columns, rows, rowLabel, actions, onAction, className }: BulkTableProps<R>) {
  const ref = useEnhance<HTMLDivElement, { action: string; rows: string[] }>(enhance, onAction);
  return (
    <div ref={ref} className={cx('lt-bulk', className)}>
      <table data-part="table">
        <caption className="lt-visually-hidden">{caption}</caption>
        <thead><tr><th scope="col"><label className="lt-check"><input type="checkbox" data-part="all" aria-label="Select all" /><Box /></label></th>{columns.map((c) => <th scope="col" key={c.label} data-num={c.numeric || undefined}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}><td><label className="lt-check"><input type="checkbox" aria-label={`Select ${rowLabel(r)}`} /><Box /></label></td>{columns.map((c) => <td key={c.label} data-num={c.numeric || undefined}>{c.render(r)}</td>)}</tr>
          ))}
        </tbody>
      </table>
      <div data-part="bar" role="region" aria-label="Bulk actions" hidden>
        <span data-part="count" aria-live="polite">0 selected</span>
        <span data-part="sep" aria-hidden="true" />
        {actions.map((a) => <button key={a.id} type="button" data-action={a.id} data-tone={a.danger ? 'danger' : undefined}><Icon name={a.icon} /><span>{a.label}</span></button>)}
        <button type="button" data-part="clear" aria-label="Clear selection"><Icon name="x" /></button>
      </div>
    </div>
  );
}
